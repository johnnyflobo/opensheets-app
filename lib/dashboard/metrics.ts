import { contas, lancamentos, pagadores } from "@/db/schema";
import {
  ACCOUNT_AUTO_INVOICE_NOTE_PREFIX,
  INITIAL_BALANCE_NOTE,
} from "@/lib/accounts/constants";
import { db } from "@/lib/db";
import { PAGADOR_ROLE_ADMIN } from "@/lib/pagadores/constants";
import {
  getPreviousPeriod,
  buildPeriodRange,
  comparePeriods,
} from "@/lib/utils/period";
import { safeToNumber } from "@/lib/utils/number";
import { and, asc, eq, ilike, isNull, isNotNull, lte, not, or, sum, ne, sql } from "drizzle-orm";

const RECEITA = "Receita";
const DESPESA = "Despesa";
const TRANSFERENCIA = "Transferência";

type MetricPair = {
  current: number;
  previous: number;
};

export type DashboardCardMetrics = {
  period: string;
  previousPeriod: string;
  receitas: MetricPair;
  despesas: MetricPair;
  saldo: MetricPair;
  cartoesCredito: MetricPair;
};

type PeriodTotals = {
  receitas: number;
  despesas: number;
  balanco: number;
  cartoesCredito: number;
};

const createEmptyTotals = (): PeriodTotals => ({
  receitas: 0,
  despesas: 0,
  balanco: 0,
  cartoesCredito: 0,
});

const ensurePeriodTotals = (
  store: Map<string, PeriodTotals>,
  period: string
): PeriodTotals => {
  if (!store.has(period)) {
    store.set(period, createEmptyTotals());
  }
  const totals = store.get(period);
  // This should always exist since we just set it above
  if (!totals) {
    const emptyTotals = createEmptyTotals();
    store.set(period, emptyTotals);
    return emptyTotals;
  }
  return totals;
};

// Re-export for backward compatibility
export { getPreviousPeriod };

export async function fetchDashboardCardMetrics(
  userId: string,
  period: string
): Promise<DashboardCardMetrics> {
  // 1. Fetch Metrics (Accrual Basis / Competência)
  // Logic: Sum of all transactions in the period (Receitas - Despesas)
  const previousPeriod = getPreviousPeriod(period);

  // 1. Calculate Initial Balances (from Accounts)
  const [initialBalanceResult] = await db
    .select({
      total: sum(contas.initialBalance).mapWith(Number),
    })
    .from(contas)
    .where(and(eq(contas.userId, userId), eq(contas.excludeFromBalance, false)));

  const totalInitialBalance = initialBalanceResult?.total ?? 0;

  // Helper to determine current YYYY-MM
  const currentPeriod = new Date().toISOString().slice(0, 7);

  // 3. Fetch Metrics for Other Cards (Accrual Basis / Competência)
  // Receitas, Despesas, and Cartões use period-limited data regardless of payment status
  const rows = await db
    .select({
      period: lancamentos.period,
      transactionType: lancamentos.transactionType,
      totalAmount: sum(lancamentos.amount).as("total"),
      creditCardAmount: sum(
        sql`CASE WHEN ${lancamentos.cartaoId} IS NOT NULL THEN ${lancamentos.amount} ELSE 0 END`
      )
        .mapWith(Number)
        .as("credit_card_total"),
    })
    .from(lancamentos)
    .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
    .leftJoin(contas, eq(lancamentos.contaId, contas.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        lte(lancamentos.period, period),
        eq(pagadores.role, PAGADOR_ROLE_ADMIN),
        ne(lancamentos.transactionType, TRANSFERENCIA),
        or(
          isNull(lancamentos.note),
          not(ilike(lancamentos.note, `${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`))
        ),
        // Keep the filter for excluded accounts for consistency in other cards too?
        // User asked specifically for logic for "Saldo", implying others might stay same.
        // However, "contas ocultas" logic usually applies globally to avoid noise.
        // The previous logic had: or(isNull(lancamentos.contaId), eq(contas.excludeFromBalance, false))
        // We'll keep it to prevent excluded accounts from polluting Receitas/Despesas views if that was the prior state.
        or(isNull(lancamentos.contaId), eq(contas.excludeFromBalance, false))
      )
    )
    .groupBy(lancamentos.period, lancamentos.transactionType)
    .orderBy(asc(lancamentos.period), asc(lancamentos.transactionType));

  const periodTotals = new Map<string, PeriodTotals>();

  for (const row of rows) {
    if (!row.period) continue;
    const totals = ensurePeriodTotals(periodTotals, row.period);
    const total = safeToNumber(row.totalAmount);
    const creditCardTotal = safeToNumber(row.creditCardAmount);

    totals.cartoesCredito += Math.abs(creditCardTotal);

    if (row.transactionType === RECEITA) {
      totals.receitas += total;
    } else if (row.transactionType === DESPESA) {
      totals.despesas += Math.abs(total);
    }
    
    // Accrual Balance = Revenue - Expense
    // totals.balanco = totals.receitas - totals.despesas; // Removed as per instruction
  }

  const currentTotals = ensurePeriodTotals(periodTotals, period);
  const previousTotals = ensurePeriodTotals(periodTotals, previousPeriod);

  // 3. Calculate Saldo for a specific period
  // For current/past periods: sum ONLY settled transactions up to that period (Saldo Realizado)
  // For future periods: sum ALL transactions up to that period (Saldo Previsto)
  //   - Includes credit card expenses for better financial planning
  
  const calculateSaldo = async (targetPeriod: string, isFuture: boolean): Promise<number> => {
    // Query 1: Account movements (contaId not null)
    const [accountResult] = await db
      .select({
        totalMovements: isFuture
          ? sql<number>`
              coalesce(
                sum(
                  case
                    when ${lancamentos.note} = ${INITIAL_BALANCE_NOTE} then 0
                    else ${lancamentos.amount}
                  end
                ),
                0
              )
            `
          : sql<number>`
              coalesce(
                sum(
                  case
                    when ${lancamentos.note} = ${INITIAL_BALANCE_NOTE} then 0
                    when ${lancamentos.isSettled} = true then ${lancamentos.amount}
                    else 0
                  end
                ),
                0
              )
            `,
      })
      .from(contas)
      .leftJoin(
        lancamentos,
        and(
          eq(lancamentos.contaId, contas.id),
          eq(lancamentos.userId, userId),
          lte(lancamentos.period, targetPeriod)
        )
      )
      .leftJoin(
        pagadores,
        eq(lancamentos.pagadorId, pagadores.id)
      )
      .where(
        and(
          eq(contas.userId, userId),
          eq(contas.excludeFromBalance, false),
          sql`(${lancamentos.id} IS NULL OR ${pagadores.role} = ${PAGADOR_ROLE_ADMIN})`
        )
      );
    
    const accountMovements = Number(accountResult?.totalMovements ?? 0);
    
    // Query 2: For future periods, also include credit card expenses
    // These are expenses linked to cards (cartaoId not null) but NOT linked to accounts (contaId is null)
    // This helps predict the real financial impact when invoices are paid
    let cardExpenses = 0;
    
    if (isFuture) {
      const [cardResult] = await db
        .select({
          totalExpenses: sql<number>`
            coalesce(
              sum(${lancamentos.amount}),
              0
            )
          `,
        })
        .from(lancamentos)
        .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
        .where(
          and(
            eq(lancamentos.userId, userId),
            lte(lancamentos.period, targetPeriod),
            isNotNull(lancamentos.cartaoId),
            isNull(lancamentos.contaId),  // Only card-only expenses (not invoice payments)
            eq(lancamentos.transactionType, DESPESA),
            eq(pagadores.role, PAGADOR_ROLE_ADMIN),
            or(
              isNull(lancamentos.note),
              not(ilike(lancamentos.note, `${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`))
            )
          )
        );
      
      cardExpenses = Number(cardResult?.totalExpenses ?? 0);
    }
    
    // Saldo = Saldo Inicial + Movimentações em Conta + Despesas de Cartão (para previsão)
    return totalInitialBalance + accountMovements + cardExpenses;
  };

  // Determine if we're viewing a future period
  const isCurrentFuture = period > currentPeriod;
  const isPreviousFuture = previousPeriod > currentPeriod;

  const currentSaldo = await calculateSaldo(period, isCurrentFuture);
  const previousSaldo = await calculateSaldo(previousPeriod, isPreviousFuture);

  return {
    period,
    previousPeriod,
    receitas: {
      current: currentTotals.receitas,
      previous: previousTotals.receitas,
    },
    despesas: {
      current: currentTotals.despesas,
      previous: previousTotals.despesas,
    },
    saldo: {
      current: currentSaldo,
      previous: previousSaldo,
    },
    cartoesCredito: {
      current: currentTotals.cartoesCredito,
      previous: previousTotals.cartoesCredito,
    },
  };
}
