"use client";

import {
  deleteBudgetAction,
  duplicatePreviousMonthBudgetsAction,
} from "@/app/(dashboard)/orcamentos/actions";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { 
  RiAddCircleLine, 
  RiFileCopyLine, 
  RiFundsLine 
} from "@remixicon/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Card } from "../ui/card";
import { BudgetCard } from "./budget-card";
import { BudgetDetailsDialog } from "./budget-details-dialog";
import { BudgetDialog } from "./budget-dialog";
import { BudgetsSummary } from "./budgets-summary";
import type { Budget, BudgetCategory } from "./types";

interface BudgetsPageProps {
  budgets: Budget[];
  categories: BudgetCategory[];
  selectedPeriod: string;
  periodLabel: string;
  summary: {
    totalPlanned: number;
    totalSpent: number;
    totalBalance: number;
  };
}

export function BudgetsPage({
  budgets,
  categories,
  selectedPeriod,
  periodLabel,
  summary,
}: BudgetsPageProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetailsBudget, setSelectedDetailsBudget] = useState<Budget | null>(null);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [budgetToRemove, setBudgetToRemove] = useState<Budget | null>(null);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const hasBudgets = budgets.length > 0;

  const handleEdit = useCallback((budget: Budget) => {
    setSelectedBudget(budget);
    setEditOpen(true);
  }, []);

  const handleDetails = useCallback((budget: Budget) => {
    setSelectedDetailsBudget(budget);
    setDetailsOpen(true);
  }, []);

  const handleDuplicateConfirm = useCallback(async () => {
    setIsDuplicating(true);
    try {
      const result = await duplicatePreviousMonthBudgetsAction({
        period: selectedPeriod,
      });

      if (result.success) {
        toast.success(result.message);
        setDuplicateOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Erro ao duplicar orçamentos.");
    } finally {
      setIsDuplicating(false);
    }
  }, [selectedPeriod]);

  const handleEditOpenChange = useCallback((open: boolean) => {
    setEditOpen(open);
    if (!open) {
      setSelectedBudget(null);
    }
  }, []);

  const handleRemoveRequest = useCallback((budget: Budget) => {
    setBudgetToRemove(budget);
    setRemoveOpen(true);
  }, []);

  const handleRemoveOpenChange = useCallback((open: boolean) => {
    setRemoveOpen(open);
    if (!open) {
      setBudgetToRemove(null);
    }
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (!budgetToRemove) {
      return;
    }

    const result = await deleteBudgetAction({ id: budgetToRemove.id });

    if (result.success) {
      toast.success(result.message);
      return;
    }

    toast.error(result.error);
    throw new Error(result.error);
  }, [budgetToRemove]);

  const removeTitle = budgetToRemove
    ? `Remover orçamento de "${
        budgetToRemove.category?.name ?? "categoria removida"
      }"?`
    : "Remover orçamento?";

  const emptyDescription =
    categories.length === 0
      ? "Cadastre uma categoria de despesa para começar a planejar seus gastos."
      : "Crie seu primeiro orçamento para controlar os gastos por categoria.";

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <BudgetsSummary summary={summary} />

        {/* ... existing header */}
        <div className="flex justify-start gap-4">
          <BudgetDialog
            mode="create"
            categories={categories}
            defaultPeriod={selectedPeriod}
            trigger={
              <Button disabled={categories.length === 0}>
                <RiAddCircleLine className="size-4" />
                Novo orçamento
              </Button>
            }
          />
          <Button
            variant="outline"
            disabled={categories.length === 0}
            onClick={() => setDuplicateOpen(true)}
          >
            <RiFileCopyLine className="size-4" />
            Duplicar Mês Anterior
          </Button>
        </div>

        {hasBudgets ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                periodLabel={periodLabel}
                onEdit={handleEdit}
                onRemove={handleRemoveRequest}
                onDetails={handleDetails}
              />
            ))}
          </div>
        ) : (
           // ... empty state
           <Card className="flex min-h-[50vh] w-full items-center justify-center py-12">
            <EmptyState
              media={<RiFundsLine className="size-6 text-primary" />}
              title="Nenhum orçamento cadastrado"
              description={emptyDescription}
            />
          </Card>
        )}
      </div>

      <BudgetDialog
        mode="update"
        budget={selectedBudget ?? undefined}
        categories={categories}
        defaultPeriod={selectedPeriod}
        open={editOpen && !!selectedBudget}
        onOpenChange={handleEditOpenChange}
      />

      <BudgetDetailsDialog 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
        budget={selectedDetailsBudget} 
      />

      {/* ... confirm dialog */}
       <ConfirmActionDialog
        open={removeOpen && !!budgetToRemove}
        onOpenChange={handleRemoveOpenChange}
        title={removeTitle}
        description="Esta ação remove o limite configurado para a categoria selecionada."
        confirmLabel="Remover orçamento"
        pendingLabel="Removendo..."
        confirmVariant="destructive"
        onConfirm={handleRemoveConfirm}
      />

      <ConfirmActionDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="Duplicar orçamentos do mês anterior?"
        description="Isso copiará os limites definidos no mês anterior para as categorias que ainda não possuem orçamento neste mês."
        confirmLabel="Duplicar orçamentos"
        pendingLabel="Duplicando..."
        onConfirm={handleDuplicateConfirm}
      />
    </>
  );
}
