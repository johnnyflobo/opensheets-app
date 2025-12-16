import { db } from "@/lib/db";
import { lancamentos, cartoes } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getLastTransaction(userId: string) {
  const result = await db
    .select({
      id: lancamentos.id,
      name: lancamentos.name,
      amount: lancamentos.amount,
      createdAt: lancamentos.createdAt,
    })
    .from(lancamentos)
    .where(eq(lancamentos.userId, userId))
    .orderBy(desc(lancamentos.createdAt))
    .limit(1);

  return result[0] || null;
}

export async function deleteTransaction(id: string, userId: string) {
  try {
    const deleted = await db
      .delete(lancamentos)
      .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)))
      .returning({ name: lancamentos.name });
    
    return { success: true, name: deleted[0]?.name };
  } catch (error) {
    console.error("Erro ao deletar lançamento:", error);
    return { success: false, error: String(error) };
  }
}

export async function fetchInvoiceSummaries(userId: string, period: string) {
  // Somar gastos de Cartão de Crédito agrupados por Cartão
  const summaries = await db
    .select({
      cartaoName: cartoes.name,
      cartaoId: cartoes.id,
      closingDay: cartoes.closingDay,
      dueDay: cartoes.dueDay,
      total: sql<number>`sum(${lancamentos.amount})`,
    })
    .from(lancamentos)
    .innerJoin(cartoes, eq(lancamentos.cartaoId, cartoes.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        eq(lancamentos.period, period),
        eq(lancamentos.paymentMethod, "Cartão de crédito"),
        eq(lancamentos.transactionType, "Despesa")
      )
    )
    .groupBy(cartoes.id, cartoes.name, cartoes.closingDay, cartoes.dueDay);

  return summaries;
}
