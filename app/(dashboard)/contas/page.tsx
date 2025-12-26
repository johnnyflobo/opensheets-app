import { AccountsPage } from "@/components/contas/accounts-page";
import { getUserId } from "@/lib/auth/server";
import { fetchAccountsForUser } from "./data";

import { getEffectiveUserId } from "@/lib/pagadores/access";


type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const userId = await getEffectiveUserId(await getUserId());
  const now = new Date();

  // Handle searchParams resolution
  const resolvedParams = searchParams ? await searchParams : undefined;
  const action = resolvedParams?.action;
  const openTransfer =
    (Array.isArray(action) ? action[0] : action) === "transfer";

  const { accounts, logoOptions } = await fetchAccountsForUser(userId);

  return (
    <main className="flex flex-col items-start gap-6">
      <AccountsPage
        accounts={accounts}
        logoOptions={logoOptions}
        openTransfer={openTransfer}
      />
    </main>
  );
}
