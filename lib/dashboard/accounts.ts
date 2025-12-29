import { cartoes, contas, lancamentos, pagadores } from "@/db/schema";
import { ACCOUNT_AUTO_INVOICE_NOTE_PREFIX, INITIAL_BALANCE_NOTE } from "@/lib/accounts/constants";
import { db } from "@/lib/db";
import { PAGADOR_ROLE_ADMIN } from "@/lib/pagadores/constants";
import { toNumber } from "@/lib/dashboard/common";
import { and, eq, sql, lte, isNotNull, isNull, not, ilike, or } from "drizzle-orm";

type RawDashboardAccount = {
  id: string;
  name: string;
  accountType: string;
  status: string;
  logo: string | null;
  initialBalance: string | number | null;
  settledMovements: unknown;
  allMovements: unknown;
};

export type DashboardAccount = {
  id: string;
  name: string;
  accountType: string;
  status: string;
  logo: string | null;
  initialBalance: number;
  /** Saldo Atual: Saldo Inicial + Receitas Efetivadas - Despesas Efetivadas */
  currentBalance: number;
  /** Saldo Previsto: Saldo Inicial + Todas Receitas - Todas Despesas (até o período) */
  forecastBalance: number;
  excludeFromBalance: boolean;
};

export type DashboardAccountsSnapshot = {
  /** Soma dos Saldos Atuais (apenas contas não excluídas) */
  totalCurrentBalance: number;
  /** Soma dos Saldos Previstos (apenas contas não excluídas) + Despesas de Cartão */
  totalForecastBalance: number;
  accounts: DashboardAccount[];
};

export async function fetchDashboardAccounts(
  userId: string,
  period?: string
): Promise<DashboardAccountsSnapshot> {
  // Helper to determine current YYYY-MM
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const targetPeriod = period || currentPeriod;
  const isFuture = targetPeriod > currentPeriod;

  const rows = await db
    .select({
      id: contas.id,
      name: contas.name,
      accountType: contas.accountType,
      status: contas.status,
      logo: contas.logo,
      initialBalance: contas.initialBalance,
      excludeFromBalance: contas.excludeFromBalance,
      // Movimentações Efetivadas (para Saldo Atual)
      settledMovements: sql<number>`
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
      // Movimentações até o período (para Saldo Previsto)
      allMovements: sql<number>`
        coalesce(
          sum(
            case
              when ${lancamentos.note} = ${INITIAL_BALANCE_NOTE} then 0
              when ${lancamentos.period} <= ${targetPeriod} then ${lancamentos.amount}
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
        eq(lancamentos.userId, userId)
      )
    )
    .leftJoin(
      pagadores,
      eq(lancamentos.pagadorId, pagadores.id)
    )
    .where(
      and(
        eq(contas.userId, userId),
        sql`(${lancamentos.id} IS NULL OR ${pagadores.role} = ${PAGADOR_ROLE_ADMIN})`
      )
    )
    .groupBy(
      contas.id,
      contas.name,
      contas.accountType,
      contas.status,
      contas.logo,
      contas.initialBalance,
      contas.excludeFromBalance
    );

  const accounts = rows
    .map((row: RawDashboardAccount & { excludeFromBalance: boolean }): DashboardAccount => {
      const initialBalance = toNumber(row.initialBalance);
      const settledMovements = toNumber(row.settledMovements);
      const allMovements = toNumber(row.allMovements);

      return {
        id: row.id,
        name: row.name,
        accountType: row.accountType,
        status: row.status,
        logo: row.logo,
        initialBalance,
        currentBalance: initialBalance + settledMovements,
        forecastBalance: initialBalance + allMovements,
        excludeFromBalance: row.excludeFromBalance,
      };
    })
    .sort((a, b) => b.forecastBalance - a.forecastBalance);

  const includedAccounts = accounts.filter(account => !account.excludeFromBalance);
  
  const totalCurrentBalance = includedAccounts.reduce(
    (total, account) => total + account.currentBalance, 
    0
  );
  
  let totalForecastBalance = includedAccounts.reduce(
    (total, account) => total + account.forecastBalance, 
    0
  );

  // For future periods, also include credit card expenses not linked to accounts
  // This provides a more complete picture of the expected financial position
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
          isNull(lancamentos.contaId),
          eq(lancamentos.transactionType, "Despesa"),
          eq(pagadores.role, PAGADOR_ROLE_ADMIN),
          or(
            isNull(lancamentos.note),
            not(ilike(lancamentos.note, `${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`))
          )
        )
      );
    
    const cardExpenses = Number(cardResult?.totalExpenses ?? 0);
    totalForecastBalance += cardExpenses;
  }

  return {
    totalCurrentBalance,
    totalForecastBalance,
    accounts,
  };
}
