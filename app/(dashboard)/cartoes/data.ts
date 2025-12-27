import { cartoes, contas, lancamentos } from "@/db/schema";
import { db } from "@/lib/db";
import { loadLogoOptions } from "@/lib/logo/options";
import { and, eq, isNull, or, sql } from "drizzle-orm";

export type CardData = {
  id: string;
  name: string;
  brand: string | null;
  status: string | null;
  closingDay: string;
  dueDay: string;
  note: string | null;
  logo: string | null;
  limit: number | null;
  limitInUse: number;
  limitAvailable: number | null;
  contaId: string;
  contaName: string;
  isMain: boolean;
};

export type AccountSimple = {
  id: string;
  name: string;
  logo: string | null;
};

export type CardsSummaryData = {
  total: number;
  parcelado: number;
  avista: number;
};

export async function fetchCardsForUser(
  userId: string,
  period?: string
): Promise<{
  cards: CardData[];
  accounts: AccountSimple[];
  logoOptions: string[];
  summary: CardsSummaryData;
}> {
  const [cardRows, accountRows, logoOptions, usageRows, usageSummaryRows] =
    await Promise.all([
      db.query.cartoes.findMany({
        orderBy: (card: any, { desc }: any) => [desc(card.name)],
        where: eq(cartoes.userId, userId),
        with: {
          conta: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.query.contas.findMany({
        orderBy: (account: any, { desc }: any) => [desc(account.name)],
        where: eq(contas.userId, userId),
        columns: {
          id: true,
          name: true,
          logo: true,
        },
      }),
      loadLogoOptions(),
      // Usage for LIMITS (Global - Unsettled)
      db
        .select({
          cartaoId: lancamentos.cartaoId,
          total: sql<number>`coalesce(sum(${lancamentos.amount}), 0)`,
        })
        .from(lancamentos)
        .where(
          and(
            eq(lancamentos.userId, userId),
            or(isNull(lancamentos.isSettled), eq(lancamentos.isSettled, false))
          )
        )
        .groupBy(lancamentos.cartaoId),
      // Usage for SUMMARY (Filtered by Period if provided)
      db
        .select({
          installmentCount: lancamentos.installmentCount,
          amount: lancamentos.amount,
        })
        .from(lancamentos)
        .where(
          and(
            eq(lancamentos.userId, userId),
            // Only card transactions
            sql`${lancamentos.cartaoId} IS NOT NULL`,
            // If period is provided, filter by period. Otherwise, default to unset/global behavior?
            // Actually, for "Monthly Invoice" view, we likely WANT to filter by period.
            // If no period is provided, maybe we should default to current month in the caller?
            // But if we want "Global" view when no period, we keep it as is.
            // The plan says: "If period is provided: Filter ... Drop isSettled filter".
            period
              ? eq(lancamentos.period, period)
              : or(
                  isNull(lancamentos.isSettled),
                  eq(lancamentos.isSettled, false)
                )
          )
        ),
    ]);

  const usageMap = new Map<string, number>();
  usageRows.forEach((row: any) => {
    if (!row.cartaoId) return;
    usageMap.set(row.cartaoId, Number(row.total ?? 0));
  });

  // Calculate summary
  let totalCards = 0;
  let totalParcelado = 0;
  let totalAvista = 0;

  usageSummaryRows.forEach((row) => {
    const amount = Number(row.amount);
    totalCards += amount;
    // Assuming installmentCount > 1 is parcelado, otherwise avista
    if (row.installmentCount && row.installmentCount > 1) {
      totalParcelado += amount;
    } else {
      totalAvista += amount;
    }
  });

  const cards = cardRows.map((card: any) => ({
    id: card.id,
    name: card.name,
    brand: card.brand,
    status: card.status,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    note: card.note,
    logo: card.logo,
    limit: card.limit ? Number(card.limit) : null,
    limitInUse: (() => {
      const total = usageMap.get(card.id) ?? 0;
      return total < 0 ? Math.abs(total) : 0;
    })(),
    limitAvailable: (() => {
      if (!card.limit) {
        return null;
      }
      const total = usageMap.get(card.id) ?? 0;
      const inUse = total < 0 ? Math.abs(total) : 0;
      return Math.max(Number(card.limit) - inUse, 0);
    })(),
    contaId: card.contaId,
    contaName: card.conta?.name ?? "Conta não encontrada",
    isMain: card.isMain ?? false,
  }));

  const accounts = accountRows.map((account: any) => ({
    id: account.id,
    name: account.name,
    logo: account.logo,
  }));

  const summary = {
    total: totalCards,
    parcelado: totalParcelado,
    avista: totalAvista,
  };

  return { cards, accounts, logoOptions, summary };
}
