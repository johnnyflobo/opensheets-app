export interface CSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type?: string;
  category?: string;
  account?: string;
  card?: string;
  paymentMethod?: string;
  pagador?: string;
  installments?: string;
  status?: string;
  note?: string;
  period?: string;
}

export type ImportStep = "upload" | "mapping" | "preview" | "processing";

export interface ImportData {
  file: File | null;
  rawRows: CSVRow[];
  mapping: ColumnMapping;
  previewRows: NormalizedTransaction[];
}

export interface NormalizedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "Receita" | "Despesa";
  category?: string;
  account?: string;
  card?: string;
  paymentMethod?: string;
  pagador?: string;
  installments?: string;
  status?: string;
  note?: string;
  period?: string;
  originalRow: CSVRow;
  isValid: boolean;
  validationError?: string;
}
