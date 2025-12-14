import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import {
  LANCAMENTO_CONDITIONS,
  LANCAMENTO_PAYMENT_METHODS,
  LANCAMENTO_TRANSACTION_TYPES,
} from "@/lib/lancamentos/constants";
import { CATEGORY_LIST } from "@/lib/constants/categories";

// Definição da interface de saída esperada do Gemini
export interface ParsedLancamento {
  name: string;
  amount: number;
  transactionType: "Despesa" | "Receita" | "Transferência";
  paymentMethod: "Dinheiro" | "Pix" | "Boleto" | "Cartão de débito" | "Cartão de crédito";
  condition: "À vista" | "Parcelado" | "Recorrente";
  categoryId?: string | null;
  accountId?: string | null; // ID da conta ou cartão
  accountType?: "conta" | "cartao";
  note?: string;
  installmentCount?: number; // Se parcelado
}

export class GeminiParser {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" },
    });
  }


  async parseMessage(
    userMessage: string,
    userId: string
  ): Promise<ParsedLancamento | null> {
    try {
      // 1. Carregar contexto do usuário (Categorias e Contas)
      const dbCategorias = await db.query.categorias.findMany({
        where: (cat, { eq }) => eq(cat.userId, userId),
        columns: { id: true, name: true },
      });
      
      // Combinar categorias do banco com as do sistema (priorizando DB se houver duplicidade de ID, mas aqui os IDs são chaves)
      // Como o usuário pediu hardcoded, vamos garantir que ELAS estejam no prompt.
      const allCategorias = [...CATEGORY_LIST];
      
      // Adicionar do banco apenas se não estriverem na lista (por ID)
      const systemIds = new Set(CATEGORY_LIST.map(c => c.id));
      dbCategorias.forEach(c => {
          if (!systemIds.has(c.id)) {
              allCategorias.push(c);
          }
      });

      const contas = await db.query.contas.findMany({
        where: (c, { eq }) => eq(c.userId, userId),
        columns: { id: true, name: true },
      });

      const cartoes = await db.query.cartoes.findMany({
        where: (c, { eq }) => eq(c.userId, userId),
        columns: { id: true, name: true },
      });

      // 2. Montar o Prompt
      const prompt = `
      Você é um assistente financeiro pessoal. Seu objetivo é extrair dados estruturados de uma mensagem informal sobre gastos.
      
      CONTEXTO DO USUÁRIO:
      - Categorias Disponíveis: ${JSON.stringify(allCategorias.map((c) => `${c.name} (ID: ${c.id})`))}
      - Contas Bancárias: ${JSON.stringify(contas.map((c) => `${c.name} (ID: ${c.id})`))}
      - Cartões de Crédito: ${JSON.stringify(cartoes.map((c) => `${c.name} (ID: ${c.id})`))}

      OPÇÕES VÁLIDAS DO SISTEMA:
      - Tipos: ${LANCAMENTO_TRANSACTION_TYPES.join(", ")}
      - Pagamento: ${LANCAMENTO_PAYMENT_METHODS.join(", ")}
      - Condição: ${LANCAMENTO_CONDITIONS.join(", ")}

      MENSAGEM DO USUÁRIO: "${userMessage}"

      INSTRUÇÕES ESPECIAIS:
      1. Tente encontrar a Categoria mais adequada pelo nome. Se não tiver certeza, deixe null.
      2. Tente encontrar a Conta ou Cartão pelo nome.
         - Se o usuário falar "Crédito Nubank", procure nos Cartões.
         - Se o usuário falar "Débito Itaú", procure nas Contas.
         - O campo 'accountId' deve ser o ID (UUID) encontrado.
         - O campo 'accountType' deve ser 'cartao' ou 'conta'.
      3. Se for 'Parcelado' (ex: "em 3x"), preencha 'installmentCount'.
      4. O valor deve ser numérico (float).

      Retorne APENAS o JSON com a seguinte estrutura (sem markdown):
      {
        "name": "Nome do estabelecimento ou descrição",
        "amount": 0.00,
        "transactionType": "Despesa",
        "paymentMethod": "...",
        "condition": "...",
        "categoryId": "uuid_ou_null",
        "accountId": "uuid_ou_null",
        "accountType": "conta" | "cartao",
        "installmentCount": 0
      }
      `;

      // 3. Chamar Gemini
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // 4. Parsear JSON
      const data = JSON.parse(responseText) as ParsedLancamento;
      
      // Garantir defaults para evitar erro de validação (Zod)
      if (!data.installmentCount || data.installmentCount < 1) {
          data.installmentCount = 1;
      }
      
      return data;
    } catch (error) {
      console.error("Erro ao processar mensagem com Gemini:", error);
      return null;
    }
  }
}
