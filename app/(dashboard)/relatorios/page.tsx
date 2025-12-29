import { ExpensesByCategoryReport } from "@/components/dashboard/reports/expenses-by-category-report";
import MonthPicker from "@/components/month-picker/month-picker";
import { getUser } from "@/lib/auth/server";
import { fetchExpensesByCategory } from "@/lib/dashboard/categories/expenses-by-category";
import { getEffectiveUserId } from "@/lib/pagadores/access";
import { parsePeriodParam } from "@/lib/utils/period";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  searchParams?: PageSearchParams;
};

const getSingleParam = (
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = params?.[key];
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

export default async function Page({ searchParams }: PageProps) {
  const user = await getUser();
  const effectiveUserId = await getEffectiveUserId(user.id);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const periodoParam = getSingleParam(resolvedSearchParams, "periodo");
  const { period: selectedPeriod } = parsePeriodParam(periodoParam);

  const expensesByCategoryData = await fetchExpensesByCategory(
    effectiveUserId,
    selectedPeriod
  );

  return (
    <main className="flex flex-col gap-6">
      <MonthPicker />
      <ExpensesByCategoryReport
        data={expensesByCategoryData}
        period={selectedPeriod}
      />
    </main>
  );
}
