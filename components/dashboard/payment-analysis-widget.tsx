"use client";

import { PaymentConditionsWidget } from "@/components/dashboard/payment-conditions-widget";
import { PaymentMethodsWidget } from "@/components/dashboard/payment-methods-widget";
import { PaymentStatusWidget } from "@/components/dashboard/payment-status-widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentConditionsData } from "@/lib/dashboard/payments/payment-conditions";
import type { PaymentMethodsData } from "@/lib/dashboard/payments/payment-methods";
import type { PaymentStatusData } from "@/lib/dashboard/payments/payment-status";

type PaymentAnalysisWidgetProps = {
  statusData: PaymentStatusData;
  conditionsData: PaymentConditionsData;
  methodsData: PaymentMethodsData;
};

export function PaymentAnalysisWidget({
  statusData,
  conditionsData,
  methodsData,
}: PaymentAnalysisWidgetProps) {
  return (
    <Tabs defaultValue="status" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="status">Status</TabsTrigger>
        <TabsTrigger value="conditions">Condições</TabsTrigger>
        <TabsTrigger value="methods">Formas</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="status" className="mt-0">
          <PaymentStatusWidget data={statusData} />
        </TabsContent>
        <TabsContent value="conditions" className="mt-0">
          <PaymentConditionsWidget data={conditionsData} />
        </TabsContent>
        <TabsContent value="methods" className="mt-0">
          <PaymentMethodsWidget data={methodsData} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
