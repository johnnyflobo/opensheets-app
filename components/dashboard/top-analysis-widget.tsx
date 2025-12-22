"use client";

import { TopEstablishmentsWidget } from "@/components/dashboard/top-establishments-widget";
import { TopExpensesWidget } from "@/components/dashboard/top-expenses-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TopExpensesData } from "@/lib/dashboard/expenses/top-expenses";
import type { TopEstablishmentsData } from "@/lib/dashboard/top-establishments";

type TopAnalysisWidgetProps = {
  allExpenses: TopExpensesData;
  cardOnlyExpenses: TopExpensesData;
  establishmentsData: TopEstablishmentsData;
};

export function TopAnalysisWidget({
  allExpenses,
  cardOnlyExpenses,
  establishmentsData,
}: TopAnalysisWidgetProps) {
  return (
    <Tabs defaultValue="expenses" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="expenses">Maiores Gastos</TabsTrigger>
        <TabsTrigger value="establishments">Estabelecimentos</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="expenses" className="mt-0">
          <TopExpensesWidget
            allExpenses={allExpenses}
            cardOnlyExpenses={cardOnlyExpenses}
          />
        </TabsContent>
        <TabsContent value="establishments" className="mt-0">
          <TopEstablishmentsWidget data={establishmentsData} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
