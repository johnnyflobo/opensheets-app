"use server";

import { lancamentos } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { mapLancamentosData } from "@/lib/lancamentos/page-helpers";
import { and, desc, eq } from "drizzle-orm";

export async function getExportData(month?: string) {
  const userId = await getUserId();

  const whereClause = month
    ? and(eq(lancamentos.userId, userId), eq(lancamentos.period, month))
    : eq(lancamentos.userId, userId);

  const rows = await db.query.lancamentos.findMany({
    where: whereClause,
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
  return data.map((item) => {
    const parcelaInfo =
      item.currentInstallment && item.installmentCount
        ? `${item.currentInstallment}/${item.installmentCount}`
        : "-";

    return {
      Data: new Date(item.purchaseDate).toLocaleDateString("pt-BR"),
      Nome: item.name,
      Valor: item.amount,
      Tipo: item.transactionType === "Receita" ? "Receita" : "Despesa",
      Categoria: item.categoriaName || "Sem categoria",
      Conta: item.contaName || item.cartaoName || "Sem conta",
      "Forma de Pagamento": item.paymentMethod,
      "Pago Para/De": item.pagadorName || "-",
      Parcela: parcelaInfo,
      Status: item.isSettled ? "Pago" : "Pendente",
      Observação: item.note || "",
    };
  });
}
