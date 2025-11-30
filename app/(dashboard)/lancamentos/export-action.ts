"use server";

import { lancamentos } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { mapLancamentosData } from "@/lib/lancamentos/page-helpers";
import { desc, eq } from "drizzle-orm";

export async function getExportData() {
  const userId = await getUserId();

  const rows = await db.query.lancamentos.findMany({
    where: eq(lancamentos.userId, userId),
    with: {
      pagador: true,
      conta: true,
      cartao: true,
      categoria: true,
    },
    orderBy: [desc(lancamentos.purchaseDate), desc(lancamentos.createdAt)],
  });

  const data = mapLancamentosData(rows);

  // Flatten and format for Excel
  return data.map((item) => ({
    Data: new Date(item.purchaseDate).toLocaleDateString("pt-BR"),
    Nome: item.name,
    Valor: item.amount,
    Tipo: item.transactionType === "receita" ? "Receita" : "Despesa",
    Categoria: item.categoriaName || "Sem categoria",
    Conta: item.contaName || item.cartaoName || "Sem conta",
    "Forma de Pagamento": item.paymentMethod,
    "Pago Para/De": item.pagadorName || "-",
    "Parcela Atual": item.currentInstallment || "-",
    "Total Parcelas": item.installmentCount || "-",
    "Status": item.isSettled ? "Pago" : "Pendente",
    "Observação": item.note || "",
  }));
}
