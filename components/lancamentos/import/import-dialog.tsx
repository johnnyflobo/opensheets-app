"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { ImportData, ImportStep } from "./types";
import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { PreviewStep } from "./preview-step";
import { toast } from "sonner";
import { importLancamentosAction } from "@/app/(dashboard)/lancamentos/import-action";
import { Spinner } from "@/components/ui/spinner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [data, setData] = useState<ImportData>({
    file: null,
    rawRows: [],
    mapping: {
      date: "",
      description: "",
      amount: "",
    },
    previewRows: [],
  });
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after transition
    setTimeout(() => {
      setStep("upload");
      setData({
        file: null,
        rawRows: [],
        mapping: { date: "", description: "", amount: "" },
        previewRows: [],
      });
    }, 300);
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const validRows = data.previewRows.filter((r) => r.isValid);
      
      if (validRows.length === 0) {
        toast.error("Não há transações válidas para importar.");
        return;
      }

      const result = await importLancamentosAction(validRows);
      
      if (result.success) {
        toast.success(result.message);
        handleClose();
      } else {
        toast.error(result.error || "Erro ao importar lançamentos.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado ao importar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos (CSV)</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Selecione um arquivo CSV para começar."}
            {step === "mapping" && "Identifique as colunas do seu arquivo."}
            {step === "preview" && "Revise os dados antes de finalizar."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "upload" && (
            <UploadStep
              onFileSelect={(file, rows) => {
                setData((prev) => ({ ...prev, file, rawRows: rows }));
                setStep("mapping");
              }}
            />
          )}

          {step === "mapping" && (
            <MappingStep
              rows={data.rawRows}
              mapping={data.mapping}
              onMappingChange={(mapping) =>
                setData((prev) => ({ ...prev, mapping }))
              }
              onConfirm={(previewRows) => {
                setData((prev) => ({ ...prev, previewRows }));
                setStep("preview");
              }}
              onBack={() => setStep("upload")}
            />
          )}

          {step === "preview" && (
            <PreviewStep
              rows={data.previewRows}
              onBack={() => setStep("mapping")}
              onConfirm={handleImport}
              loading={loading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
