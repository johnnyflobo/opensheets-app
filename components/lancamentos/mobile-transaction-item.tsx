"use client";

import MoneyValues from "@/components/money-values";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils/date";
import { getConditionIcon, getPaymentMethodIcon } from "@/lib/utils/icons";
import { cn } from "@/lib/utils/ui";
import {
  RiBankCard2Line,
  RiBankLine,
  RiCheckLine,
  RiDeleteBin5Line,
  RiEyeLine,
  RiHistoryLine,
  RiMoreFill,
  RiPencilLine,
  RiThumbUpFill,
  RiThumbUpLine,
  RiTimeLine,
} from "@remixicon/react";
import Image from "next/image";
import { type LancamentoItem } from "./types";

interface MobileTransactionItemProps {
  item: LancamentoItem;
  onEdit?: (item: LancamentoItem) => void;
  onConfirmDelete?: (item: LancamentoItem) => void;
  onViewDetails?: (item: LancamentoItem) => void;
  onToggleSettlement?: (item: LancamentoItem) => void;
  onAnticipate?: (item: LancamentoItem) => void;
  onViewAnticipationHistory?: (item: LancamentoItem) => void;
  isSettlementLoading?: boolean;
}

export function MobileTransactionItem({
  item,
  onEdit,
  onConfirmDelete,
  onViewDetails,
  onToggleSettlement,
  onAnticipate,
  onViewAnticipationHistory,
  isSettlementLoading,
}: MobileTransactionItemProps) {
  const isReceita = item.transactionType === "Receita";
  const isTransfer = item.transactionType === "Transferência";
  const settled = Boolean(item.isSettled);

  const resolveLogoSrc = (logo: string | null) => {
    if (!logo) return null;
    const fileName = logo.split("/").filter(Boolean).pop() ?? logo;
    return `/logos/${fileName}`;
  };

  const accountLogo = resolveLogoSrc(item.cartaoLogo ?? item.contaLogo);
  const accountName = item.cartaoName ?? item.contaName;

  const paymentMethod = item.paymentMethod;
  const canToggleSettlement =
    onToggleSettlement &&
    [
      "Pix",
      "Boleto",
      "Dinheiro",
      "Cartão de débito",
    ].includes(paymentMethod);

  return (
    <div className="flex items-center justify-between border-b border-border/40 py-4 last:border-0">
      <div className="flex items-center gap-4">
        {/* Left Icon (Status or Payment Method) */}
        <div className="relative flex shrink-0 items-center justify-center">
          {canToggleSettlement ? (
            <button
              onClick={() => onToggleSettlement(item)}
              disabled={isSettlementLoading || item.readonly}
              className={cn(
                "flex size-10 items-center justify-center rounded-full transition-colors",
                settled
                  ? "bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {settled ? (
                <RiCheckLine className="size-5" />
              ) : (
                <RiTimeLine className="size-5" />
              )}
            </button>
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {getPaymentMethodIcon(paymentMethod)}
            </div>
          )}
        </div>

        {/* Center Info */}
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold leading-tight line-clamp-1">
            {item.name}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.categoriaName && (
               <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal rounded-md border-border/50">
                  {item.categoriaName}
               </Badge>
            )}
             {accountName && (
              <span className="flex items-center gap-1 truncate max-w-[100px]">
                {item.cartaoId ? (
                   <RiBankCard2Line className="size-3 shrink-0" />
                ) : (
                   <RiBankLine className="size-3 shrink-0" />
                )}
                <span className="truncate">{accountName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Info & Actions */}
      <div className="flex flex-col items-end gap-0.5">
         <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(item.purchaseDate).split("/").slice(0, 2).join(".")}
            </span>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-6 w-6 -mr-2">
                  <RiMoreFill className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onViewDetails?.(item)}>
                  <RiEyeLine className="mr-2 size-4" />
                  Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onEdit?.(item)}
                  disabled={item.readonly}
                >
                  <RiPencilLine className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onConfirmDelete?.(item)}
                  disabled={item.readonly}
                >
                  <RiDeleteBin5Line className="mr-2 size-4" />
                  Remover
                </DropdownMenuItem>

                 {/* Opções de Antecipação (Copy from table) */}
                 {item.condition === "Parcelado" && item.seriesId && (
                  <>
                    <DropdownMenuSeparator />
                    {!item.isAnticipated && onAnticipate && (
                      <DropdownMenuItem onSelect={() => onAnticipate(item)}>
                        <RiTimeLine className="mr-2 size-4" />
                        Antecipar Parcelas
                      </DropdownMenuItem>
                    )}
                    {onViewAnticipationHistory && (
                      <DropdownMenuItem onSelect={() => onViewAnticipationHistory(item)}>
                        <RiHistoryLine className="mr-2 size-4" />
                        Histórico
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
         </div>

        <MoneyValues
          amount={item.amount}
          className={cn(
            "font-semibold text-sm",
            isReceita
              ? "text-green-600 dark:text-green-400"
              : "text-foreground",
            isTransfer && "text-blue-700 dark:text-blue-500"
          )}
        />
        
        {item.condition === "Parcelado" && (
            <span className="text-[10px] text-muted-foreground">
                {item.currentInstallment}/{item.installmentCount}
            </span>
        )}
      </div>
    </div>
  );
}
