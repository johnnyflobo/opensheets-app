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

  // Determine mode for Current and Previous periods
  // If period is in the future, we show Projected (What you will have).
  // If period is now or past, we show Realized (What you have/had).
  const isCurrentFuture = period > currentPeriod;
  const isPreviousFuture = previousPeriod > currentPeriod;

  // Calculate balance using the formula: Saldo = Saldo Anterior + Receitas - Despesas
  // Always use the same receitas/despesas values shown in the cards for consistency
  const calculateBalanceFromTotals = async (targetPeriod: string, projected: boolean) => {
    // Calculate previous balance (cumulative up to previous period)
    // For balance calculation, we only consider transactions linked to accounts
    const previousPeriodForTarget = getPreviousPeriod(targetPeriod);
    
    // Calculate all movements up to (and including) the previous period
    const [previousMovementsResult] = await db
      .select({
        totalMovements: sum(lancamentos.amount).mapWith(Number),
      })
      .from(lancamentos)
      .leftJoin(contas, eq(lancamentos.contaId, contas.id))
      .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
      .where(
        and(
          eq(lancamentos.userId, userId),
          lte(lancamentos.period, previousPeriodForTarget),
          isNotNull(lancamentos.contaId),
          eq(contas.excludeFromBalance, false),
          ne(lancamentos.note, INITIAL_BALANCE_NOTE),
          eq(pagadores.role, PAGADOR_ROLE_ADMIN),
          ne(lancamentos.transactionType, TRANSFERENCIA),
          or(
            isNull(lancamentos.note),
            not(ilike(lancamentos.note, `${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`))
          ),
          // For past periods, only count settled transactions
          projected 
            ? undefined 
            : eq(lancamentos.isSettled, true)
        )
      );
    
    // Previous balance = Initial Balance + All movements up to previous period
    const previousSaldo = totalInitialBalance + (previousMovementsResult?.totalMovements ?? 0);

    // Use receitas and despesas from cards (same values shown to user)
    // These are calculated without isSettled filter for consistency with card display
    const periodTotalsForBalance = ensurePeriodTotals(periodTotals, targetPeriod);
    const receitas = periodTotalsForBalance.receitas;
    const despesas = periodTotalsForBalance.despesas;

    // Saldo = Saldo Anterior + Receitas - Despesas
    return previousSaldo + receitas - despesas;
  };

  // Calculate previous balance first (for display)
  const previousSaldo = await calculateBalanceFromTotals(previousPeriod, isPreviousFuture);
  
  // Calculate current balance using the same previous balance shown in the card
  // This ensures consistency: Saldo Atual = Saldo Anterior (shown) + Receitas - Despesas
  const currentTotalsForBalance = ensurePeriodTotals(periodTotals, period);
  const receitas = currentTotalsForBalance.receitas;
  const despesas = currentTotalsForBalance.despesas;
  const currentSaldo = previousSaldo + receitas - despesas;

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
