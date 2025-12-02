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
import { eq, sql } from "drizzle-orm";

export async function importLancamentosAction(
  rows: NormalizedTransaction[]
): Promise<ActionResult> {
  try {
    const user = await getUser();

    if (!rows || rows.length === 0) {
      return { success: false, error: "Nenhum dado para importar." };
    }

    // Fetch user entities for mapping
    console.error(`[Import] Fetching entities for user: ${user.id}`);
    const [userCategories, userAccounts, userCards, userPagadores] = await Promise.all([
      db.select().from(categorias).where(eq(categorias.userId, user.id)),
      db.select().from(contas).where(eq(contas.userId, user.id)),
      db.select().from(cartoes).where(eq(cartoes.userId, user.id)),
      db.select().from(pagadores).where(eq(pagadores.userId, user.id)),
    ]);
    console.error(`[Import] Found ${userCategories.length} categories, ${userAccounts.length} accounts, ${userCards.length} cards.`);

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

      const period = row.period || `${purchaseDate.getFullYear()}-${String(
        purchaseDate.getMonth() + 1
      ).padStart(2, "0")}`;

      // 2. Entity Mapping
      let categoryId = null;
      if (row.category) {
        const cleanCategory = row.category.trim();
        
        // Check if it's a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCategory);
        
        console.error(`[Import Debug] Category Raw: "${row.category}", Clean: "${cleanCategory}", IsUUID: ${isUUID}`);

        if (isUUID) {
            categoryId = cleanCategory;
            console.error(`[Import Debug] Assigned UUID directly: ${categoryId}`);
        } else {
            const match = userCategories.find((c: Categoria) => 
                c.name.toLowerCase() === cleanCategory.toLowerCase()
            );
            if (match) {
                categoryId = match.id;
                console.error(`[Import Debug] Matched by name: ${match.name} -> ${categoryId}`);
            }
        }
      } else {
          console.error(`[Import Debug] No category in row`);
      }

      let contaId = null;
      if (row.account) {
        const cleanAccount = row.account.trim();
        const accountMatch = userAccounts.find((a: Conta) => 
            a.name.toLowerCase() === cleanAccount.toLowerCase() || 
            a.id === cleanAccount
        );
        if (accountMatch) contaId = accountMatch.id;
      }

      let cartaoId = null;
      if (row.card) {
          const cleanCard = row.card.trim();
          const cardMatch = userCards.find((c: Cartao) => 
              c.name.toLowerCase() === cleanCard.toLowerCase() || 
              c.id === cleanCard
          );
          if (cardMatch) cartaoId = cardMatch.id;
      } else if (row.account && !contaId) {
          // Fallback: if account was mapped but not found in accounts, check cards (legacy behavior)
          const cleanAccount = row.account.trim();
          const cardMatch = userCards.find((c: Cartao) => 
              c.name.toLowerCase() === cleanAccount.toLowerCase() || 
              c.id === cleanAccount
          );
          if (cardMatch) cartaoId = cardMatch.id;
      }

      let pagadorId = null;
      if (row.pagador) {
        const cleanPagador = row.pagador.trim();
        const match = userPagadores.find((p: Pagador) => 
            p.name.toLowerCase() === cleanPagador.toLowerCase() || 
            p.id === cleanPagador
        );
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
         // Check for explicit "not paid" statuses
         if (["pendente", "em aberto", "agendado", "a pagar", "a receber", "false", "nao", "não", "0"].includes(s)) {
             isSettled = false;
         }
         // Check for explicit "paid" statuses (redundant if default is true, but good for clarity if logic changes)
         else if (["pago", "recebido", "realizado", "true", "sim", "1", "ok"].includes(s)) {
             isSettled = true;
         }
      }

      return {
        id: randomUUID(),
        userId: user.id,
        name: row.description.slice(0, 255),
        amount: String((Math.abs(row.amount) * (row.type === "Despesa" ? -1 : 1)).toFixed(2)),
        transactionType: row.type,
        purchaseDate: purchaseDate,
        period: period,
        paymentMethod: row.paymentMethod || "Outros",
        condition: condition,
        isSettled: isSettled,
        categoriaId: categoryId, // Fixed: matches schema property name
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
    if (records.length > 0) {
        console.log(`[Import] Importing ${records.length} records...`);
    }
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
