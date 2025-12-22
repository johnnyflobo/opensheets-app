"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import { getBudgetTransactionsAction } from "@/app/(dashboard)/orcamentos/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { getIconComponent } from "@/lib/utils/icons";
import { useEffect, useState } from "react";
import type { Budget } from "./types";

interface BudgetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
}

type Transaction = {
  id: string;
  name: string;
  amount: number;
  purchaseDate: string;
};

export function BudgetDetailsDialog({
  open,
  onOpenChange,
  budget,
}: BudgetDetailsDialogProps) {
  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && budget?.category?.id) {
      const fetchTransactions = async () => {
        setIsLoading(true);
        try {
          const result = await getBudgetTransactionsAction({
            categoryId: budget.category!.id,
            period: budget.period,
          });

          if (result.success && result.data) {
            setData(result.data);
          } else {
            setData([]);
          }
        } catch (error) {
          console.error("Failed to fetch transactions", error);
          setData([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTransactions();
    }
  }, [open, budget]);

  const IconComponent = budget?.category?.icon
    ? getIconComponent(budget.category.icon)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {IconComponent ? (
                <IconComponent className="size-4" />
              ) : (
                <span className="text-xs">#</span>
              )}
            </span>
            <span>{budget?.category?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma despesa encontrada neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(
                          new Date(transaction.purchaseDate),
                          "dd 'de' MMM, yyyy",
                          { locale: ptBR }
                        )}
                      </TableCell>
                      <TableCell>{transaction.name}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        -{formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
