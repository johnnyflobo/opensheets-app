import {
  categorias,
  lancamentos,
  orcamentos,
  type Orcamento,
} from "@/db/schema";
import { db } from "@/lib/db";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export type BudgetData = {
  id: string;
  amount: number;
  spent: number;
  period: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  icon: string | null;
};

export async function fetchBudgetsForUser(
  userId: string,
  selectedPeriod: string
): Promise<{
  budgets: BudgetData[];
  categoriesOptions: CategoryOption[];
}> {
  const [budgetRows, categoryRows] = await Promise.all([
    db.query.orcamentos.findMany({
      where: and(
        eq(orcamentos.userId, userId),
        eq(orcamentos.period, selectedPeriod)
      ),
      with: {
        categoria: true,
      },
    }),
    db.query.categorias.findMany({
      columns: {
        id: true,
        name: true,
        icon: true,
      },
      where: and(eq(categorias.userId, userId), eq(categorias.type, "despesa")),
      orderBy: asc(categorias.name),
    }),
  ]);

  const categoryIds = budgetRows
    .map((budget: any) => budget.categoriaId)
    .filter((id: string | null): id is string => Boolean(id));

  let totalsByCategory = new Map<string, number>();

  if (categoryIds.length > 0) {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const totals = await db
      .select({
        categoriaId: lancamentos.categoriaId,
        totalAmount: sql<string>`sum(
          case
            when ${lancamentos.condition} = 'Parcelado' and ${lancamentos.currentInstallment} = 1
            then ${lancamentos.amount} * ${lancamentos.installmentCount}
            when ${lancamentos.condition} = 'Parcelado' and ${lancamentos.currentInstallment} > 1
            then 0
            else ${lancamentos.amount}
          end
        )`.as("totalAmount"),
      })
      .from(lancamentos)
      .where(
        and(
          eq(lancamentos.userId, userId),
          gte(lancamentos.purchaseDate, startDate),
          lte(lancamentos.purchaseDate, endDate),
          eq(lancamentos.transactionType, "Despesa"),
          inArray(lancamentos.categoriaId, categoryIds)
        )
      )
      .groupBy(lancamentos.categoriaId);

    totalsByCategory = new Map(
      totals.map((row: { categoriaId: string | null; totalAmount: string | null }) => [
        row.categoriaId ?? "",
        Math.abs(toNumber(row.totalAmount)),
      ])
    );
  }

  const budgets = budgetRows
    .map((budget: any) => ({
      id: budget.id,
      amount: toNumber(budget.amount),
      spent: totalsByCategory.get(budget.categoriaId ?? "") ?? 0,
      period: budget.period,
      createdAt: budget.createdAt.toISOString(),
      category: budget.categoria
        ? {
            id: budget.categoria.id,
            name: budget.categoria.name,
            icon: budget.categoria.icon,
          }
        : null,
    }))
    .sort((a: any, b: any) =>
      (a.category?.name ?? "").localeCompare(b.category?.name ?? "", "pt-BR", {
        sensitivity: "base",
      })
    );

  const categoriesOptions = categoryRows.map((category: any) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
  }));

  return { budgets, categoriesOptions };
}
