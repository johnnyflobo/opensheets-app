import { CardsPage } from "@/components/cartoes/cards-page";
import { getUserId } from "@/lib/auth/server";
import { fetchCardsForUser } from "./data";

import { getEffectiveUserId } from "@/lib/pagadores/access";

export default async function Page() {
  const userId = await getEffectiveUserId(await getUserId());
  const { cards, accounts, logoOptions } = await fetchCardsForUser(userId);

  return (
    <main className="flex flex-col items-start gap-6">
      <CardsPage cards={cards} accounts={accounts} logoOptions={logoOptions} />
    </main>
  );
}
