"use client";

import { InvoicesWidget } from "@/components/dashboard/invoices-widget";
import { MyAccountsWidget } from "@/components/dashboard/my-accounts-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardAccount } from "@/lib/dashboard/accounts";
import type { DashboardInvoice } from "@/lib/dashboard/invoices";

type AccountsAnalysisWidgetProps = {
  accounts: DashboardAccount[];
  totalBalance: number;
  invoices: DashboardInvoice[];
  period: string;
};

export function AccountsAnalysisWidget({
  accounts,
  totalBalance,
  invoices,
  period,
}: AccountsAnalysisWidgetProps) {
  return (
    <Tabs defaultValue="accounts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="accounts">Minhas Contas</TabsTrigger>
        <TabsTrigger value="invoices">Faturas</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="accounts" className="mt-0">
          <MyAccountsWidget
            accounts={accounts}
            totalBalance={totalBalance}
            period={period}
          />
        </TabsContent>
        <TabsContent value="invoices" className="mt-0">
          <InvoicesWidget invoices={invoices} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
