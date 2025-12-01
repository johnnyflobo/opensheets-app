"use client";

import { getExportData } from "@/app/(dashboard)/lancamentos/export-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiDownloadLine,
  RiFileExcel2Line,
  RiFilePdfLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function ExportButton({ month }: { month?: string }) {
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    const data = await getExportData(month);
    if (!data || data.length === 0) {
      toast.warning("Nenhum lançamento encontrado para exportar.");
      return null;
    }
    return data;
  }

  async function handleExportExcel() {
    try {
      setLoading(true);
      toast.info("Gerando Excel...");
      const data = await fetchData();
      if (!data) return;

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
      XLSX.writeFile(
        wb,
        `opensheets_lancamentos_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar Excel.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      setLoading(true);
      toast.info("Gerando CSV...");
      const data = await fetchData();
      if (!data) return;

      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `opensheets_lancamentos_${new Date().toISOString().slice(0, 10)}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      setLoading(true);
      toast.info("Gerando PDF...");
      const data = await fetchData();
      if (!data) return;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Relatório de Lançamentos", 14, 22);
      doc.setFontSize(10);
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
        14,
        30
      );

      // Table
      const tableColumn = [
        "Data",
        "Nome",
        "Valor",
        "Tipo",
        "Categoria",
        "Conta",
        "Parcela",
      ];
      const tableRows = data.map((item) => [
        item.Data,
        item.Nome,
        Number(item.Valor).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        item.Tipo,
        item.Categoria,
        item.Conta,
        item.Parcela,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }, // Emerald-600
      });

      // Footer (Page Numbers)
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
      }

      doc.save(
        `opensheets_relatorio_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
          {loading ? (
            <RiLoader4Line className="h-4 w-4 animate-spin" />
          ) : (
            <RiDownloadLine className="h-4 w-4 text-muted-foreground" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          <RiFileExcel2Line className="mr-2 h-4 w-4 text-emerald-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <RiFileTextLine className="mr-2 h-4 w-4 text-blue-600" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <RiFilePdfLine className="mr-2 h-4 w-4 text-red-600" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
