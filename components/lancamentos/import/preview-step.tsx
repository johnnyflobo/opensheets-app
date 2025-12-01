"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NormalizedTransaction } from "./types";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/ui";

interface PreviewStepProps {
  rows: NormalizedTransaction[];
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function PreviewStep({
  rows,
  onBack,
  onConfirm,
  loading,
}: PreviewStepProps) {
  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-emerald-600">
            {validCount} Válidos
          </Badge>
        </div>
        {invalidCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{invalidCount} Inválidos</Badge>
            <span className="text-muted-foreground">
              (serão ignorados)
            </span>
          </div>
        )}
      </div>

      <div className="rounded-md border max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                className={cn(!row.isValid && "bg-destructive/10")}
              >
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  {row.amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      row.type === "Receita"
                        ? "text-emerald-600 border-emerald-200"
                        : "text-red-600 border-red-200"
                    )}
                  >
                    {row.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.isValid ? (
                    <span className="text-emerald-600 font-medium text-xs">OK</span>
                  ) : (
                    <span className="text-destructive font-medium text-xs">
                      {row.validationError}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Voltar
        </Button>
        <Button onClick={onConfirm} disabled={loading || validCount === 0}>
          {loading && <Spinner className="mr-2 size-4" />}
          Importar {validCount} Lançamentos
        </Button>
      </div>
    </div>
  );
}
