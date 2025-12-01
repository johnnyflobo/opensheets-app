"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { ColumnMapping, CSVRow, NormalizedTransaction } from "./types";
import { parse } from "date-fns";

interface MappingStepProps {
  rows: CSVRow[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: (previewRows: NormalizedTransaction[]) => void;
  onBack: () => void;
}

export function MappingStep({
  rows,
  mapping,
  onMappingChange,
  onConfirm,
  onBack,
}: MappingStepProps) {
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    if (rows.length > 0) {
      setColumns(Object.keys(rows[0]));
    }
  }, [rows]);

  const handleConfirm = () => {
    const normalized: NormalizedTransaction[] = rows.map((row) => {
      const dateStr = row[mapping.date];
      const descStr = row[mapping.description];
      const amountStr = row[mapping.amount];
      
      // Optional fields
      const typeStr = mapping.type ? row[mapping.type] : undefined;
      const categoryStr = mapping.category ? row[mapping.category] : undefined;
      const accountStr = mapping.account ? row[mapping.account] : undefined;
      const paymentMethodStr = mapping.paymentMethod ? row[mapping.paymentMethod] : undefined;
      const pagadorStr = mapping.pagador ? row[mapping.pagador] : undefined;
      const installmentsStr = mapping.installments ? row[mapping.installments] : undefined;
      const statusStr = mapping.status ? row[mapping.status] : undefined;
      const noteStr = mapping.note ? row[mapping.note] : undefined;

      // Basic validation logic
      let isValid = true;
      let validationError = undefined;
      let amount = 0;
      let type: "Receita" | "Despesa" = "Despesa";

      // Parse Amount
      try {
        // Remove currency symbols and handle comma/dot
        const cleanAmount = amountStr
          .replace(/[^0-9,.-]+/g, "")
          .replace(",", ".");
        amount = parseFloat(cleanAmount);
        
        if (isNaN(amount)) {
          isValid = false;
          validationError = "Valor inválido";
        } else {
            // Infer type logic
            if (typeStr) {
                // If type column is mapped, use it
                if (typeStr.toLowerCase().includes("receita") || typeStr.toLowerCase().includes("entrada") || typeStr.toLowerCase().includes("crédito")) {
                    type = "Receita";
                } else {
                    type = "Despesa";
                }
                amount = Math.abs(amount); // Ensure positive amount if type is explicit
            } else {
                // Infer from sign
                if (amount < 0) {
                    type = "Despesa";
                    amount = Math.abs(amount);
                } else {
                    type = "Receita";
                }
            }
        }
      } catch {
        isValid = false;
        validationError = "Erro ao ler valor";
      }

      // Basic Date Check (Can be improved with date-fns parsing if format is known)
      if (!dateStr) {
          isValid = false;
          validationError = "Data ausente";
      }

      return {
        date: dateStr,
        description: descStr || "Sem descrição",
        amount,
        type,
        category: categoryStr,
        account: accountStr,
        paymentMethod: paymentMethodStr,
        pagador: pagadorStr,
        installments: installmentsStr,
        status: statusStr,
        note: noteStr,
        originalRow: row,
        isValid,
        validationError,
      };
    });

    onConfirm(normalized);
  };

  const isComplete = mapping.date && mapping.description && mapping.amount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Coluna de Data *</Label>
          <Select
            value={mapping.date}
            onValueChange={(val) => onMappingChange({ ...mapping, date: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Coluna de Descrição *</Label>
          <Select
            value={mapping.description}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, description: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Coluna de Valor *</Label>
          <Select
            value={mapping.amount}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, amount: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo (Opcional)</Label>
          <Select
            value={mapping.type}
            onValueChange={(val) => onMappingChange({ ...mapping, type: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="undefined">Automático (pelo sinal)</SelectItem>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria (Opcional)</Label>
          <Select
            value={mapping.category}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, category: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Conta/Cartão (Opcional)</Label>
          <Select
            value={mapping.account}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, account: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Forma de Pagamento (Opcional)</Label>
          <Select
            value={mapping.paymentMethod}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, paymentMethod: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pagador (Opcional)</Label>
          <Select
            value={mapping.pagador}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, pagador: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Parcela (Opcional)</Label>
          <Select
            value={mapping.installments}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, installments: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status (Opcional)</Label>
          <Select
            value={mapping.status}
            onValueChange={(val) =>
              onMappingChange({ ...mapping, status: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observação (Opcional)</Label>
          <Select
            value={mapping.note}
            onValueChange={(val) => onMappingChange({ ...mapping, note: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-4 bg-muted/50 border-b">
          <h4 className="text-sm font-medium">Prévia das primeiras 3 linhas</h4>
        </div>
        <div className="p-4 space-y-2 text-sm">
          {rows.slice(0, 3).map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <div className="truncate text-muted-foreground">
                {row[mapping.date] || "-"}
              </div>
              <div className="truncate text-muted-foreground">
                {row[mapping.description] || "-"}
              </div>
              <div className="truncate text-muted-foreground">
                {row[mapping.amount] || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={handleConfirm} disabled={!isComplete}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
