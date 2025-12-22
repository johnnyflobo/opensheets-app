"use client";

import { InstallmentExpensesWidget } from "@/components/dashboard/installment-expenses-widget";
import { RecentTransactionsWidget } from "@/components/dashboard/recent-transactions-widget";
import { RecurringExpensesWidget } from "@/components/dashboard/recurring-expenses-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InstallmentExpensesData } from "@/lib/dashboard/expenses/installment-expenses";
import type { RecurringExpensesData } from "@/lib/dashboard/expenses/recurring-expenses";
import type { RecentTransactionsData } from "@/lib/dashboard/recent-transactions";
import { RiSecurePaymentLine } from "@remixicon/react";
import Link from "next/link";

type TransactionsAnalysisWidgetProps = {
  recentData: RecentTransactionsData;
  recurringData: RecurringExpensesData;
  installmentData: InstallmentExpensesData;
};

export function TransactionsAnalysisWidget({
  recentData,
  recurringData,
  installmentData,
}: TransactionsAnalysisWidgetProps) {
  return (
    <Tabs defaultValue="recent" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="recent">Recentes</TabsTrigger>
        <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        <TabsTrigger value="installment">Parcelados</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="recent" className="mt-0">
          <RecentTransactionsWidget data={recentData} />
        </TabsContent>
        <TabsContent value="recurring" className="mt-0">
          <RecurringExpensesWidget data={recurringData} />
        </TabsContent>
        <TabsContent value="installment" className="mt-0 flex flex-col gap-4">
          <InstallmentExpensesWidget data={installmentData} />
          {installmentData.expenses.length > 0 && (
              <div className="flex justify-end border-t border-dashed pt-2">
                <Link
                  href="/dashboard/analise-parcelas"
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <RiSecurePaymentLine className="size-4" />
                  Ver análise detalhada
                </Link>
              </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
