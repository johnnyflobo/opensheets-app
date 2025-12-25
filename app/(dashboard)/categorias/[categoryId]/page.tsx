import { getRecentEstablishmentsAction } from "@/app/(dashboard)/lancamentos/actions";
import { CategoryDetailHeader } from "@/components/categorias/category-detail-header";
import { LancamentosPage } from "@/components/lancamentos/page/lancamentos-page";
import MonthPicker from "@/components/month-picker/month-picker";
import { fetchCategoryDetails } from "@/lib/dashboard/categories/category-details";
import { getUserId } from "@/lib/auth/server";
import { getEffectiveUserId } from "@/lib/pagadores/access";
import {
  buildOptionSets,
  buildSluggedFilters,
  fetchLancamentoFilterSources,
} from "@/lib/lancamentos/page-helpers";
import { parsePeriodParam } from "@/lib/utils/period";
import { notFound } from "next/navigation";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  params: Promise<{ categoryId: string }>;
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

const formatPeriodLabel = (period: string) => {
  const [yearStr, monthStr] = period.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const monthIndex = Number.parseInt(monthStr ?? "", 10) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0) {
    return period;
  }

  const date = new Date(year, monthIndex, 1);
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

export default async function Page({ params, searchParams }: PageProps) {
  const { categoryId } = await params;
  const userId = await getEffectiveUserId(await getUserId());
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const periodoParam = getSingleParam(resolvedSearchParams, "periodo");
  const { period: selectedPeriod } = parsePeriodParam(periodoParam);

  const [detail, filterSources, estabelecimentos] = await Promise.all([
    fetchCategoryDetails(userId, categoryId, selectedPeriod),
    fetchLancamentoFilterSources(userId),
    getRecentEstablishmentsAction(),
  ]);

  if (!detail) {
    notFound();
  }

  const sluggedFilters = buildSluggedFilters(filterSources);
  const {
    pagadorOptions,
    splitPagadorOptions,
    defaultPagadorId,
    contaOptions,
    cartaoOptions,
    categoriaOptions,
    pagadorFilterOptions,
    categoriaFilterOptions,
    contaCartaoFilterOptions,
  } = buildOptionSets({
    ...sluggedFilters,
    pagadorRows: filterSources.pagadorRows,
  });

  const currentPeriodLabel = formatPeriodLabel(detail.period);
  const previousPeriodLabel = formatPeriodLabel(detail.previousPeriod);

  return (
    <main className="flex flex-col gap-6">
      <MonthPicker />
      <CategoryDetailHeader
        category={detail.category}
        currentPeriodLabel={currentPeriodLabel}
        previousPeriodLabel={previousPeriodLabel}
        currentTotal={detail.currentTotal}
        previousTotal={detail.previousTotal}
        percentageChange={detail.percentageChange}
        transactionCount={detail.transactions.length}
      />
      <LancamentosPage
        lancamentos={detail.transactions}
        pagadorOptions={pagadorOptions}
        splitPagadorOptions={splitPagadorOptions}
        defaultPagadorId={defaultPagadorId}
        contaOptions={contaOptions}
        cartaoOptions={cartaoOptions}
        categoriaOptions={categoriaOptions}
        pagadorFilterOptions={pagadorFilterOptions}
        categoriaFilterOptions={categoriaFilterOptions}
        contaCartaoFilterOptions={contaCartaoFilterOptions}
        selectedPeriod={detail.period}
        estabelecimentos={estabelecimentos}
        allowCreate={true}
      />
    </main>
  );
}
