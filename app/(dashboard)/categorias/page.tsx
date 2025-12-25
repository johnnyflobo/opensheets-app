import { CategoriesPage } from "@/components/categorias/categories-page";
import { getUserId } from "@/lib/auth/server";
import { fetchCategoriesForUser } from "./data";

import { getEffectiveUserId } from "@/lib/pagadores/access";

export default async function Page() {
  const userId = await getEffectiveUserId(await getUserId());
  const categories = await fetchCategoriesForUser(userId);

  return (
    <main className="flex flex-col items-start gap-6">
      <CategoriesPage categories={categories} />
    </main>
  );
}
