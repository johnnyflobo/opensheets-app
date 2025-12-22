import { categorias, lancamentos, orcamentos, pagadores } from "@/db/schema";
import { ACCOUNT_AUTO_INVOICE_NOTE_PREFIX } from "@/lib/accounts/constants";
import { toNumber } from "@/lib/dashboard/common";
import { db } from "@/lib/db";
import { PAGADOR_ROLE_ADMIN } from "@/lib/pagadores/constants";
import { getPreviousPeriod } from "@/lib/utils/period";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

export type CategoryExpenseItem = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  currentAmount: number;
  previousAmount: number;
  percentageChange: number | null;
  percentageOfTotal: number;
  budgetAmount: number | null;
  budgetUsedPercentage: number | null;
};

export type ExpensesByCategoryData = {
  categories: CategoryExpenseItem[];
  currentTotal: number;
  previousTotal: number;
};

const calculatePercentageChange = (
  current: number,
  previous: number
): number | null => {
  const EPSILON = 0.01; // Considera valores menores que 1 centavo como zero

  if (Math.abs(previous) < EPSILON) {
    if (Math.abs(current) < EPSILON) return null;
    return current > 0 ? 100 : -100;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;

  // Protege contra valores absurdos (retorna null se > 1 milhão %)
  return Number.isFinite(change) && Math.abs(change) < 1000000 ? change : null;
};

export async function fetchExpensesByCategory(
  userId: string,
  period: string
): Promise<ExpensesByCategoryData> {
  const previousPeriod = getPreviousPeriod(period);

  const [year, month] = period.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [prevYear, prevMonth] = previousPeriod.split("-").map(Number);
  const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
  const prevEndDate = new Date(prevYear, prevMonth, 0);

  // Busca despesas do período atual agrupadas por categoria
  const currentPeriodRows = await db
    .select({
      categoryId: categorias.id,
      categoryName: categorias.name,
      categoryIcon: categorias.icon,
      total: sql<number>`coalesce(sum(${lancamentos.amount}), 0)`,
      budgetAmount: orcamentos.amount,
    })
    .from(lancamentos)
    .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .leftJoin(
      orcamentos,
      and(
        eq(orcamentos.categoriaId, categorias.id),
        eq(orcamentos.period, period),
        eq(orcamentos.userId, userId)
      )
    )
    .where(
      and(
        eq(lancamentos.userId, userId),
        gte(lancamentos.purchaseDate, startDate),
        lte(lancamentos.purchaseDate, endDate),
        eq(lancamentos.transactionType, "Despesa"),
        eq(pagadores.role, PAGADOR_ROLE_ADMIN),
        eq(categorias.type, "despesa"),
        or(
          isNull(lancamentos.note),
          sql`${lancamentos.note} NOT LIKE ${`${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`}`
        )
      )
    )
    .groupBy(
      categorias.id,
      categorias.name,
      categorias.icon,
      orcamentos.amount
    );

  // Busca despesas do período anterior agrupadas por categoria
  const previousPeriodRows = await db
    .select({
      categoryId: categorias.id,
      total: sql<number>`coalesce(sum(${lancamentos.amount}), 0)`,
    })
    .from(lancamentos)
    .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        gte(lancamentos.purchaseDate, prevStartDate),
        lte(lancamentos.purchaseDate, prevEndDate),
        eq(lancamentos.transactionType, "Despesa"),
        eq(pagadores.role, PAGADOR_ROLE_ADMIN),
        eq(categorias.type, "despesa"),
        or(
          isNull(lancamentos.note),
          sql`${lancamentos.note} NOT LIKE ${`${ACCOUNT_AUTO_INVOICE_NOTE_PREFIX}%`}`
        )
      )
    )
    .groupBy(categorias.id);

  // Cria um mapa do período anterior para busca rápida
  const previousMap = new Map<string, number>();
  let previousTotal = 0;

  for (const row of previousPeriodRows) {
    const amount = Math.abs(toNumber(row.total));
    previousMap.set(row.categoryId, amount);
    previousTotal += amount;
  }

  // Calcula o total do período atual
  let currentTotal = 0;
  for (const row of currentPeriodRows) {
    currentTotal += Math.abs(toNumber(row.total));
  }

  // Monta os dados de cada categoria
  const categories: CategoryExpenseItem[] = currentPeriodRows.map((row) => {
    const currentAmount = Math.abs(toNumber(row.total));
    const previousAmount = previousMap.get(row.categoryId) ?? 0;
    const percentageChange = calculatePercentageChange(
      currentAmount,
      previousAmount
    );
    const percentageOfTotal =
      currentTotal > 0 ? (currentAmount / currentTotal) * 100 : 0;

    const budgetAmount = row.budgetAmount ? toNumber(row.budgetAmount) : null;
    const budgetUsedPercentage =
      budgetAmount && budgetAmount > 0
        ? (currentAmount / budgetAmount) * 100
        : null;

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      currentAmount,
      previousAmount,
      percentageChange,
      percentageOfTotal,
      budgetAmount,
      budgetUsedPercentage,
    };
  });

  // Ordena por valor atual (maior para menor)
  categories.sort((a, b) => b.currentAmount - a.currentAmount);

  return {
    categories,
    currentTotal,
    previousTotal,
  };
}
