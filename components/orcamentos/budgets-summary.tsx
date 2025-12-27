import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { PiggyBank, Receipt, Scale } from "lucide-react";

interface BudgetsSummaryProps {
  summary: {
    totalPlanned: number;
    totalSpent: number;
    totalBalance: number;
  };
}

export function BudgetsSummary({ summary }: BudgetsSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Planejado</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalPlanned)}</div>
          <p className="text-xs text-muted-foreground">
            Soma de todos os orçamentos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
          <p className="text-xs text-muted-foreground">
            Total realizado nas categorias
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</div>
          <p className="text-xs text-muted-foreground">
            Disponível para gastar
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
