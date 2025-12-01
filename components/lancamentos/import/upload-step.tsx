"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiUploadCloud2Line } from "@remixicon/react";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";
import { CSVRow } from "./types";

interface UploadStepProps {
  onFileSelect: (file: File, rows: CSVRow[]) => void;
}

export function UploadStep({ onFileSelect }: UploadStepProps) {
  const [parsing, setParsing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV válido.");
      return;
    }

    setParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        if (results.data && results.data.length > 0) {
          onFileSelect(file, results.data as CSVRow[]);
        } else {
          toast.error("O arquivo CSV parece estar vazio ou inválido.");
        }
      },
      error: (error) => {
        setParsing(false);
        console.error(error);
        toast.error("Erro ao ler o arquivo CSV.");
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10 border-2 border-dashed rounded-lg bg-muted/50">
      <div className="p-4 rounded-full bg-background border shadow-sm">
        <RiUploadCloud2Line className="size-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="font-medium">Clique para selecionar ou arraste o arquivo</h3>
        <p className="text-sm text-muted-foreground">
          Suporta apenas arquivos .csv
        </p>
      </div>
      <div className="relative">
        <Input
          type="file"
          accept=".csv"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          disabled={parsing}
        />
        <Button disabled={parsing}>
          {parsing ? "Lendo arquivo..." : "Selecionar Arquivo"}
        </Button>
      </div>
    </div>
  );
}
