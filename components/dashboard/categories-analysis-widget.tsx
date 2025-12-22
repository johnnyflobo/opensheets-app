"use client";

import { ExpensesByCategoryWidget } from "@/components/dashboard/expenses-by-category-widget";
import { PurchasesByCategoryWidget } from "@/components/dashboard/purchases-by-category-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExpensesByCategoryData } from "@/lib/dashboard/categories/expenses-by-category";
import type { PurchasesByCategoryData } from "@/lib/dashboard/purchases-by-category";

type CategoriesAnalysisWidgetProps = {
  expensesData: ExpensesByCategoryData;
  purchasesData: PurchasesByCategoryData;
  period: string;
};

export function CategoriesAnalysisWidget({
  expensesData,
  purchasesData,
  period,
}: CategoriesAnalysisWidgetProps) {
  return (
    <Tabs defaultValue="expenses" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="expenses">Categorias por Despesas</TabsTrigger>
        <TabsTrigger value="purchases">Lançamentos por Categoria</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="expenses" className="mt-0">
          <ExpensesByCategoryWidget data={expensesData} period={period} />
        </TabsContent>
        <TabsContent value="purchases" className="mt-0">
          <PurchasesByCategoryWidget data={purchasesData} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
