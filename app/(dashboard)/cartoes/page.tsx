import { CardsPage } from "@/components/cartoes/cards-page";
import { getUserId } from "@/lib/auth/server";
import { fetchCardsForUser } from "./data";

import { getEffectiveUserId } from "@/lib/pagadores/access";
import MonthPicker from "@/components/month-picker/month-picker";
import { getSingleParam, ResolvedSearchParams } from "@/lib/lancamentos/page-helpers";
import { parsePeriodParam } from "@/lib/utils/period";

type PageSearchParams = Promise<ResolvedSearchParams>;

type PageProps = {
  searchParams?: PageSearchParams;
};

export default async function Page({ searchParams }: PageProps) {
  const userId = await getEffectiveUserId(await getUserId());

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const periodoParam = getSingleParam(resolvedSearchParams, "periodo");
  const { period } = parsePeriodParam(periodoParam);

  const { cards, accounts, logoOptions, summary } = await fetchCardsForUser(
    userId,
    period
  );

  return (
    <main className="flex flex-col items-start gap-6">
      <MonthPicker />
      <CardsPage
        cards={cards}
        accounts={accounts}
        logoOptions={logoOptions}
        summary={summary}
      />
    </main>
  );
}
