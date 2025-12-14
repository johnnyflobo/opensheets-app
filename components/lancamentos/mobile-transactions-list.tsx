"use client";

import { EmptyState } from "@/components/empty-state";
import { type LancamentoItem } from "./types";
import { MobileTransactionItem } from "./mobile-transaction-item";

interface MobileTransactionsListProps {
  data: LancamentoItem[];
  onEdit?: (item: LancamentoItem) => void;
  onConfirmDelete?: (item: LancamentoItem) => void;
  onViewDetails?: (item: LancamentoItem) => void;
  onToggleSettlement?: (item: LancamentoItem) => void;
  onAnticipate?: (item: LancamentoItem) => void;
  onViewAnticipationHistory?: (item: LancamentoItem) => void;
  isSettlementLoading: (id: string) => boolean;
}

export function MobileTransactionsList({
  data,
  onEdit,
  onConfirmDelete,
  onViewDetails,
  onToggleSettlement,
  onAnticipate,
  onViewAnticipationHistory,
  isSettlementLoading,
}: MobileTransactionsListProps) {
  if (!data.length) {
    return (
      <div className="py-8">
         <EmptyState
            title="Nenhum lançamento encontrado"
            description="Tente ajustar os filtros ou adicione um novo lançamento."
            icon="search"
          />
      </div>
    );
  }

  // Optional: Group by Date (or Month) if desired, but for now simple list matching reference
  return (
    <div className="flex flex-col px-4 pb-20"> {/* pb-20 for bottom safe area/FAB */}
      {data.map((item) => (
        <MobileTransactionItem
          key={item.id}
          item={item}
          onEdit={onEdit}
          onConfirmDelete={onConfirmDelete}
          onViewDetails={onViewDetails}
          onToggleSettlement={onToggleSettlement}
          onAnticipate={onAnticipate}
          onViewAnticipationHistory={onViewAnticipationHistory}
          isSettlementLoading={isSettlementLoading(item.id)}
        />
      ))}
    </div>
  );
}
