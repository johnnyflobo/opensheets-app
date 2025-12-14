import { NextRequest, NextResponse } from "next/server";
import { GeminiParser, ParsedLancamento } from "@/lib/telegram/gemini-parser";
import { createLancamentoInternal } from "@/app/(dashboard)/lancamentos/actions";
import { db } from "@/lib/db";
import { lancamentos, user } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!TELEGRAM_TOKEN || !ALLOWED_USER_ID || !GOOGLE_API_KEY) {
  console.error("Faltam variáveis de ambiente para o Bot do Telegram.");
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    }),
  });
}

async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [] // Clear buttons
        }
    }),
  });
}


export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. Validar se é Callback Query (Clique no botão)
  if (body.callback_query) {
      const callback = body.callback_query;
      const data = callback.data;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;

      if (String(callback.from.id) !== ALLOWED_USER_ID) {
          return NextResponse.json({ status: "ignored" });
      }

      if (data.startsWith("add:")) {
          try {
              // Decodificar JSON do payload (add:{...})
              // Nota: O payload do Telegram tem limite de 64 bytes.
              // Estratégia simples (arriscada para payloads grandes):
              // Se o payload for muito grande, essa abordagem falha.
              // Solução robusta seria salvar num KV Store (Redis/Vercel KV).
              // Pela limitação do prompt atual, vamos tentar uma abordagem híbrida:
              // Se o dado não vier no callback (improvável caber tudo),
              // a gente pede pro usuário confirmar APENAS o texto e reprocessa? Não, lento.
              // Vamos assumir cache em memória global para este MVP (funciona enquanto o lambda estiver quente).
              
              // **CORREÇÃO**: Dados completos não cabem em 64 bytes.
              // Vamos usar um "Cache Simples Em Memória" (Global Var) só para MVP.
              // Em produção real, use banco de dados para "pending_confirmations".
              
              const confirmationId = data.split(":")[1];
              const pendingData = globalThis.pendingLancamentos?.get(confirmationId);

              if (!pendingData) {
                  await sendTelegramMessage(chatId, "❌ Tempo de confirmação expirado. Envie novamente.");
                  return NextResponse.json({ status: "expired" });
              }

              // ID do usuário já foi buscado no início da rota (em um cenário real de callback puro, 
              // precisaríamos buscar novamente ou ter ele no payload, mas aqui assumimos fluxo rápido/cache)
              // Na verdade, o callback é outra request. O `targetUserId` calculado lá em cima é para msg de texto.
              // Para o CALLBACK, precisamos buscar de novo?
              // SIM. O POST do callback roda do zero.
              
              // Mas espere, eu movi a busca do usuário para ANTES do IF do callback?
              // Vamos checar a estrutura do arquivo.
              // O código original tinha:
              // 1. Validar Callback -> IF (retorna)
              // 2. Validar Mensagem -> Busca Usuário -> Logica
              
              // Se eu movi a busca de usuário para LOGO DEPOIS da validação de segurança da mensagem?
              // Não, eu preciso garantir que a busca do usuário ocorra tanto para MSG quanto para CALLBACK se eu quiser usar.
              // Mas no Callback eu já tinha adicionado a busca (Step 462).
              // Então aqui no Callback está OK.
              
              // Onde eu editei no passo anterior foi na seção "2. Validar Mensagem de Texto".
              // Então aqui dentro do IF do CALLBACK, mantenho a busca que já inseri.
              // Só preciso garantir que não quebrou nada.
              
              // (Mantendo o código do callback como estava na ultima edição 462)
              const dbUserCallback = await db.select({ id: user.id }).from(user).limit(1);
               if (!dbUserCallback.length) {
                  return NextResponse.json({ status: "error" });
              }
              const targetUserIdCallback = dbUserCallback[0].id;

              // Criar lançamento
              const result = await createLancamentoInternal({
                  name: pendingData.name,
                  amount: pendingData.amount,
                  transactionType: pendingData.transactionType,
                  paymentMethod: pendingData.paymentMethod,
                  condition: pendingData.condition,
                  categoriaId: pendingData.categoryId || undefined,
                  contaId: pendingData.accountType === 'conta' ? pendingData.accountId : undefined,
                  cartaoId: pendingData.accountType === 'cartao' ? pendingData.accountId : undefined,
                  installmentCount: pendingData.installmentCount,
                  purchaseDate: new Date().toISOString().split('T')[0], // Hoje
              }, targetUserIdCallback);

              if (result.success) {
                  await editTelegramMessage(chatId, messageId, `✅ *Lançamento Salvo!*\n${pendingData.name} - R$ ${pendingData.amount}`);
                  // Limpar cache
                  globalThis.pendingLancamentos.delete(confirmationId);
              } else {
                  await sendTelegramMessage(chatId, `❌ Erro ao salvar: ${result.error}`);
              }

          } catch (e) {
              console.error(e);
              await sendTelegramMessage(chatId, "❌ Erro ao processar confirmação.");
          }
      } else if (data === "cancel") {
          await editTelegramMessage(chatId, messageId, "❌ Cancelado.");
      }

      return NextResponse.json({ status: "ok" });
  }


  // 2. Validar Mensagem de Texto
  if (!body.message || !body.message.text) {
    return NextResponse.json({ status: "ignored" });
  }

  const msg = body.message;
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;
  const text = msg.text as string;


  // Segurança: Apenas usuário permitido
  if (userId !== ALLOWED_USER_ID) {
    await sendTelegramMessage(chatId, "⛔ Você não tem permissão para usar este bot.");
    return NextResponse.json({ status: "forbidden" });
  }
  
  // Buscar usuário real do banco de dados (Assumindo single-tenant/primeiro usuário)
  // Isso é necessário antes de chamar o Gemini para o contexto ser carregado corretamente
  const dbUser = await db.select({ id: user.id }).from(user).limit(1);
  
  if (!dbUser.length) {
      await sendTelegramMessage(chatId, "❌ Erro: Nenhum usuário encontrado no banco de dados.");
      return NextResponse.json({ status: "error" });
  }

  const targetUserId = dbUser[0].id;

  // >>> COMANDO DE SALDO (Bypass IA) <<<
  if (text.toLowerCase().includes("saldo") || text.toLowerCase().includes("resumo")) {
      await sendTelegramMessage(chatId, "🔍 Consultando gastos de hoje...");
      
      try {
          // Data de hoje (início do dia para comparação correta se necessário, ou apenas objeto Date se o driver ignorar hora)
          // Schema usa mode: "date", então espera um objeto Date.
          const todayDate = new Date();
          
          const gastosHoje = await db.select({
              total: sql<number>`sum(${lancamentos.amount})`
          })
          .from(lancamentos)
          .where(
              and(
                  eq(lancamentos.purchaseDate, todayDate),
                  eq(lancamentos.transactionType, "Despesa")
                  // TODO: Filtrar por userId também se necessário: eq(lancamentos.userId, targetUserId)
              )
          );

          const total = gastosHoje[0]?.total || 0;

          await sendTelegramMessage(chatId, `📊 *Gastos de Hoje (${todayDate.toLocaleDateString('pt-BR')}):*\n\nR$ ${Number(total).toFixed(2)}`);
          return NextResponse.json({ status: "ok" });

      } catch (error) {
          console.error("Erro ao consultar saldo:", error);
          await sendTelegramMessage(chatId, "❌ Erro ao consultar banco de dados. Verifique a conexão.");
          return NextResponse.json({ status: "error" });
      }
  }

  // 3. Processar com Gemini
  await sendTelegramMessage(chatId, "🤖 Processando...");

  if (!GOOGLE_API_KEY) {
      await sendTelegramMessage(chatId, "❌ Erro: Chave do Google não configurada.");
      return NextResponse.json({ error: "No API Key" });
  }

  const parser = new GeminiParser(GOOGLE_API_KEY);
  
  // AGORA sim passando o ID correto do usuário para o parser buscar o contexto (Categorias/Contas) do banco
  const parsedData = await parser.parseMessage(text, targetUserId);

  // Como o app é single-user (opensheets), vamos pegar o PRIMEIRO user do banco para associar?
  // O ideal seria mapear TelegramID -> InternalUserID.
  // Para simplificar este MVP, vamos buscar o primeiro usuário do banco.
  // **Importante**: No createLancamentoAction ele usa `getUser()` que pega da sessão.
  // Como aqui é API, não tem sessão.
  // Precisamos adaptar `createLancamentoAction` ou simular o contexto.
  // A `createLancamentoAction` usa `getUser()` que depende de cookies. Isso vai FALHAR na API.
  // SOLUÇÃO: Vamos modificar `createLancamentoAction` para aceitar userId opcional ou criar uma `createLancamentoInternal`.
  // Por enquanto, vou assumir que vamos corrigir a action depois. Vamos focar no bot.
  
  // Mas espera, `createLancamentoAction` verifica auth.
  // Vou precisar de uma função de serviço que não dependa de sessão web, ou mockar.
  // Vou criar `lib/lancamentos/service.ts` depois?
  // Não, vou tentar usar a action e se falhar, refatoro. (Vai falhar).
  // Vou assumir que vou criar uma função `createLancamentoInternal` no arquivo de actions que bypassa auth.

  if (!parsedData) {
      await sendTelegramMessage(chatId, "❓ Não entendi. Tente algo como: 'Gastei 50 no mercado no débito'.");
      return NextResponse.json({ status: "error" });
  }

  // 4. Salvar em Cache Temporário para Confirmação
  const confirmationId = Math.random().toString(36).substring(7);
  if (!globalThis.pendingLancamentos) {
      globalThis.pendingLancamentos = new Map();
  }
  globalThis.pendingLancamentos.set(confirmationId, parsedData);

  // 5. Pedir Confirmação
  const replyText = `
🧐 *Confirma os dados?*

🏢 *Nome:* ${parsedData.name}
💰 *Valor:* R$ ${parsedData.amount}
💳 *Método:* ${parsedData.paymentMethod} ${parsedData.condition === 'Parcelado' ? `(${parsedData.installmentCount}x)` : ''}
📂 *Categoria:* ${parsedData.categoryId ? '✅ Identificada' : '⚠️ Não identificada'}
🏦 *Conta/Cartão:* ${parsedData.accountId ? '✅ Identificada' : '⚠️ Não identificada'}
  `;

  const keyboard = {
      inline_keyboard: [
          [
              { text: "✅ Confirmar", callback_data: `add:${confirmationId}` },
              { text: "❌ Cancelar", callback_data: `cancel` }
          ]
      ]
  };

  await sendTelegramMessage(chatId, replyText, keyboard);

  return NextResponse.json({ status: "ok" });
}

// Definição global para cache em memória (típico workaround de serverless para estado curto)
declare global {
    var pendingLancamentos: Map<string, ParsedLancamento>;
}
