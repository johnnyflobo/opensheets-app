"use server";

import { 
  lancamentos, 
  categorias, 
  contas, 
  cartoes, 
  pagadores,
  type Categoria,
  type Conta,
  type Cartao,
  type Pagador
} from "@/db/schema";
import { getUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { NormalizedTransaction } from "@/components/lancamentos/import/types";
import { handleActionError, revalidateForEntity } from "@/lib/actions/helpers";
import { ActionResult } from "@/lib/actions/types";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

export async function importLancamentosAction(
  rows: NormalizedTransaction[]
): Promise<ActionResult> {
  try {
    const user = await getUser();

    if (!rows || rows.length === 0) {
      return { success: false, error: "Nenhum dado para importar." };
    }

    // Fetch user entities for mapping
    const [userCategories, userAccounts, userCards, userPagadores] = await Promise.all([
      db.select().from(categorias).where(eq(categorias.userId, user.id)),
      db.select().from(contas).where(eq(contas.userId, user.id)),
      db.select().from(cartoes).where(eq(cartoes.userId, user.id)),
      db.select().from(pagadores).where(eq(pagadores.userId, user.id)),
    ]);

    const records = rows.map((row) => {
      // 1. Date Parsing
      let purchaseDate = new Date();
      try {
          if (row.date.includes("/")) {
              const [day, month, year] = row.date.split("/");
              purchaseDate = new Date(Number(year), Number(month) - 1, Number(day));
          } else {
              purchaseDate = new Date(row.date);
          }
      } catch {
          console.error("Invalid date format", row.date);
      }

      const period = `${purchaseDate.getFullYear()}-${String(
        purchaseDate.getMonth() + 1
      ).padStart(2, "0")}`;

      // 2. Entity Mapping
      let categoryId = null;
      if (row.category) {
        const match = userCategories.find((c: Categoria) => c.name.toLowerCase() === row.category!.trim().toLowerCase());
        if (match) categoryId = match.id;
      }

      let contaId = null;
      let cartaoId = null;
      if (row.account) {
        const accountMatch = userAccounts.find((a: Conta) => a.name.toLowerCase() === row.account!.trim().toLowerCase());
        if (accountMatch) {
            contaId = accountMatch.id;
        } else {
            const cardMatch = userCards.find((c: Cartao) => c.name.toLowerCase() === row.account!.trim().toLowerCase());
            if (cardMatch) cartaoId = cardMatch.id;
        }
      }

      let pagadorId = null;
      if (row.pagador) {
        const match = userPagadores.find((p: Pagador) => p.name.toLowerCase() === row.pagador!.trim().toLowerCase());
        if (match) pagadorId = match.id;
      }

      // 3. Installments & Condition
      let installmentCount: number | null = null;
      let currentInstallment: number | null = null;
      let condition = "À vista";
      
      if (row.installments) {
        if (row.installments.includes("/")) {
            const [curr, total] = row.installments.split("/");
            const c = parseInt(curr);
            const t = parseInt(total);
            if (!isNaN(c) && !isNaN(t)) {
                currentInstallment = c;
                installmentCount = t;
                condition = "Parcelado";
            }
        }
      }

      // 4. Status
      let isSettled = true; // Default to settled
      if (row.status) {
         const s = row.status.toLowerCase().trim();
         if (["pendente", "em aberto", "agendado", "a pagar", "a receber"].includes(s)) {
             isSettled = false;
         }
      }

      return {
        id: randomUUID(),
        userId: user.id,
        name: row.description.slice(0, 255),
        amount: String(row.amount.toFixed(2)),
        transactionType: row.type,
        purchaseDate: purchaseDate,
        period: period,
        paymentMethod: row.paymentMethod || "Outros",
        condition: condition,
        isSettled: isSettled,
        categoryId: categoryId,
        contaId: contaId,
        cartaoId: cartaoId,
        pagadorId: pagadorId,
        installmentCount: installmentCount,
        currentInstallment: currentInstallment,
        note: row.note,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Batch insert
    await db.insert(lancamentos).values(records);

    revalidateForEntity("lancamentos");

    return {
      success: true,
      message: `${records.length} lançamentos importados com sucesso!`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}
