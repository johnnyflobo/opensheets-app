import { categorias, lancamentos, pagadores } from "@/db/schema";
import { ACCOUNT_AUTO_INVOICE_NOTE_PREFIX } from "@/lib/accounts/constants";
import { db } from "@/lib/db";
import { PAGADOR_ROLE_ADMIN } from "@/lib/pagadores/constants";
import { and, eq, gte, lte, isNull, or, sql, ilike } from "drizzle-orm";
import { toNumber } from "@/lib/dashboard/common";

export type CategoryRealExpenseItem = {
  categoryName: string;
  totalAmount: number;
  percentageOfTotal: number;
};

export type RealTransactionItem = {
    name: string;
    amount: number;
    purchaseDate: Date | string;
    categoryName: string;
};

export type ExpensesByPurchaseDateData = {
  categories: CategoryRealExpenseItem[];
  total: number;
  transactions?: RealTransactionItem[];
};

export async function fetchExpensesByPurchaseDate(
  userId: string,
  startDate: Date,
  endDate: Date,
  categorySearch?: string
): Promise<ExpensesByPurchaseDateData> {
  
  // Condição base de filtros
  const filters = [
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
  ];

  // Filtro opcional por nome da categoria
  if (categorySearch) {
    filters.push(ilike(categorias.name, `%${categorySearch}%`));
  }

  // Busca despesas pela DATA DE COMPRA (regime de competência)
  const rows = await db
    .select({
      categoryName: categorias.name,
      total: sql<number>`coalesce(sum(${lancamentos.amount}), 0)`,
    })
    .from(lancamentos)
    .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .where(and(...filters))
    .groupBy(categorias.name);

  let total = 0;
  const categoriesMap: { name: string; amount: number }[] = [];

  for (const row of rows) {
    const amount = Math.abs(toNumber(row.total));
    if (amount > 0) {
      categoriesMap.push({ name: row.categoryName, amount });
      total += amount;
    }
  }

  // Calcular porcentagens e ordenar
  const categoriesList: CategoryRealExpenseItem[] = categoriesMap
    .map((c) => ({
      categoryName: c.name,
      totalAmount: c.amount,
      percentageOfTotal: total > 0 ? (c.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Se houver filtro de categoria, buscar as transações detalhadas
  let transactions: RealTransactionItem[] = [];
  if (categorySearch) {
      const txRows = await db
        .select({
            id: lancamentos.id,
            name: lancamentos.name,
            amount: lancamentos.amount,
            purchaseDate: lancamentos.purchaseDate,
            categoryName: categorias.name,
        })
        .from(lancamentos)
        .innerJoin(pagadores, eq(lancamentos.pagadorId, pagadores.id))
        .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
        .where(and(...filters))
        .orderBy(gte(lancamentos.purchaseDate, startDate)) // Ordenar por data
        .limit(20);

      transactions = txRows.map(row => ({
          name: row.name,
          amount: Math.abs(toNumber(row.amount)),
          purchaseDate: row.purchaseDate,
          categoryName: row.categoryName
      }));
  }

  return {
    categories: categoriesList,
    total,
    transactions
  };
}
