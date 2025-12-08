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

export async function fetchCardsForUser(userId: string): Promise<{
  cards: CardData[];
  accounts: AccountSimple[];
  logoOptions: string[];
}> {
  const [cardRows, accountRows, logoOptions, usageRows] = await Promise.all([
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
  ]);

  const usageMap = new Map<string, number>();
  usageRows.forEach((row: any) => {
    if (!row.cartaoId) return;
    usageMap.set(row.cartaoId, Number(row.total ?? 0));
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

  return { cards, accounts, logoOptions };
}
