import { NextRequest, NextResponse } from "next/server";
import { GeminiParser, ParsedLancamento } from "@/lib/telegram/gemini-parser";
import { createLancamentoInternal } from "@/app/(dashboard)/lancamentos/actions";
import { db } from "@/lib/db";
import { lancamentos, user } from "@/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { fetchDashboardCardMetrics } from "@/lib/dashboard/metrics";
import { fetchTopExpenses } from "@/lib/dashboard/expenses/top-expenses";
import { fetchExpensesByCategory } from "@/lib/dashboard/categories/expenses-by-category";
import { fetchRecentTransactions } from "@/lib/dashboard/recent-transactions";
import { fetchExpensesByPurchaseDate } from "@/lib/dashboard/categories/expenses-by-purchase-date";
import { getLastTransaction, deleteTransaction, fetchInvoiceSummaries } from "@/lib/telegram/bot-actions";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!TELEGRAM_TOKEN || !ALLOWED_USER_ID || !GOOGLE_API_KEY) {
  console.error("Faltam variáveis de ambiente para o Bot do Telegram.");
}

// Helper para escapar caracteres do MarkdownV2 (embora estejamos usando "Markdown" legacy, é bom prevenir)
// Mas para "Markdown", os caracteres chatos são: * _ ` [
function escapeMarkdown(text: string): string {
    return text.replace(/[*_`\[]/g, ''); // Simplesmente remove os caracteres problemáticos para evitar erros
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        }),
      });
      
      if (!res.ok) {
          const err = await res.text();
          console.error("Erro ao enviar mensagem Telegram:", err);
      }
  } catch (error) {
      console.error("Falha na requisição Telegram:", error);
  }
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

      // Buscar User ID do DB para callbacks
      const dbUserCallback = await db.select({ id: user.id }).from(user).limit(1);
      if (!dbUserCallback.length) {
          return NextResponse.json({ status: "error" });
      }
      const targetUserIdCallback = dbUserCallback[0].id;

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
              
              // (Mantendo o código do callback como estava na ultima edição 462)
              // const dbUserCallback = await db.select({ id: user.id }).from(user).limit(1);
              //  if (!dbUserCallback.length) {
              //     return NextResponse.json({ status: "error" });
              // }
              // const targetUserIdCallback = dbUserCallback[0].id;

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
                  isSplit: false,
                  note: "", 
              }, targetUserIdCallback);

              if (result.success) {
                  await editTelegramMessage(chatId, messageId, `✅ *Lançamento Salvo!*\n${escapeMarkdown(pendingData.name)} - R$ ${pendingData.amount}`);
                  // Limpar cache
                  globalThis.pendingLancamentos.delete(confirmationId);
              } else {
                  await sendTelegramMessage(chatId, `❌ Erro ao salvar: ${result.error}`);
              }

          } catch (e) {
              console.error(e);
              await sendTelegramMessage(chatId, "❌ Erro ao processar confirmação.");
          }
      } 
      else if (data.startsWith("del:")) {
          // LOGICA DELETAR
          const idToDelete = data.split(":")[1];
          const result = await deleteTransaction(idToDelete, targetUserIdCallback);
          
          if (result.success) {
             const safeName = result.name ? escapeMarkdown(result.name) : "Item";
             await editTelegramMessage(chatId, messageId, `🗑️ *Apagado com sucesso:*\n${safeName}`);
          } else {
             await sendTelegramMessage(chatId, "❌ Erro ao apagar lançamento.");
          }
      }
      else if (data === "cancel") {
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

  // >>> COMANDO AJUDA <<<
  if (text.toLowerCase() === "/ajuda" || text.toLowerCase() === "/help" || text.toLowerCase() === "ajuda") {
      await sendTelegramMessage(chatId, 
          `🤖 *Comandos Disponíveis:*\n\n` +
          `💰 */saldo* - Resumo do mês (Receitas x Despesas).\n` +
          `🗓️ */semana* - Gastos detalhados desta semana.\n` +
          `💳 */fatura* - Valor parcial das faturas abertas.\n` +
          `🛍️ */real* - Gastos por data de compra (competência).\n` +
          `🏆 */top* - Maiores gastos do mês.\n` +
          `📊 */categorias* - Gastos divididos por categoria.\n` +
          `🆕 */ultimos* - Últimos lançamentos registrados.\n` +
          `↩️ */desfazer* - Apaga o último lançamento feito.\n\n` +
          `💡 *Dica:* Você pode digitar "real mercado" para filtrar!`
      );
      return NextResponse.json({ status: "ok" });
  }

  // >>> COMANDO DE SALDO (Bypass IA) <<<
  if (text.toLowerCase().includes("saldo") || text.toLowerCase().includes("resumo")) {
      await sendTelegramMessage(chatId, "📅 Calculando balanço do mês...");
      
      try {
          // Datas do Mês Atual
          const now = new Date();
          const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          // Reutilizar a MESMA lógica do Dashboard para garantir consistência
          const metrics = await fetchDashboardCardMetrics(targetUserId, currentPeriod);

          const receitas = metrics.receitas.current;
          const despesas = metrics.despesas.current; // Já vem absoluto e somado corretamente pela função
          const saldo = metrics.balanco.current;
          
          const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

          await sendTelegramMessage(chatId, 
            `💰 *Balanço de ${capitalizedMonth}:*\n\n` +
            `📈 *Receitas:* R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `📉 *Despesas:* R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `---------------------------\n` +
            `💵 *Saldo:* R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          );
          return NextResponse.json({ status: "ok" });

      } catch (error) {
          console.error("Erro ao consultar saldo:", error);
          await sendTelegramMessage(chatId, "❌ Erro ao consultar banco de dados. Verifique a conexão.");
          return NextResponse.json({ status: "error" });
      }
  }

  // >>> COMANDO DE GASTOS DA SEMANA <<<
  if (text.toLowerCase().includes("semana")) {
      await sendTelegramMessage(chatId, "📅 Calculando gastos da semana...");
      
      try {
           // Calcular Início e Fim da Semana (Domingo a Sábado)
           const now = new Date();
           const firstDayOfWeek = new Date(now);
           const dayOfWeek = now.getDay(); // 0 (Domingo) a 6 (Sábado)
           const diff = now.getDate() - dayOfWeek; 
           firstDayOfWeek.setDate(diff);
           firstDayOfWeek.setHours(0, 0, 0, 0);

           const lastDayOfWeek = new Date(firstDayOfWeek);
           lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
           lastDayOfWeek.setHours(23, 59, 59, 999);

           // Buscar APENAS Despesas da Semana
           // Nota: Não usamos fetchDashboardCardMetrics aqui pois ele é focado em Mês.
           // Vamos fazer uma query direta, mas mantendo coerência com filtros básicos.
           const gastosSemana = await db.select({
              name: lancamentos.name,
              amount: lancamentos.amount,
              purchaseDate: lancamentos.purchaseDate,
              paymentMethod: lancamentos.paymentMethod
           })
           .from(lancamentos)
           .where(
              and(
                  gte(lancamentos.purchaseDate, firstDayOfWeek),
                  lte(lancamentos.purchaseDate, lastDayOfWeek),
                  eq(lancamentos.transactionType, "Despesa"),
                  eq(lancamentos.userId, targetUserId)
              )
           )
           .orderBy(desc(lancamentos.purchaseDate)); // Ordenar mais recentes primeiro

           const totalSemana = gastosSemana.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

           const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
           const inicioStr = firstDayOfWeek.toLocaleDateString('pt-BR', options);
           const fimStr = lastDayOfWeek.toLocaleDateString('pt-BR', options);

           const list = gastosSemana.map((t: any) => {
               const dateObj = new Date(t.purchaseDate);
               const day = dateObj.getDate().toString().padStart(2, '0');
               const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
               const safeName = escapeMarkdown(t.name);
               
               let icon = "";
               if (t.paymentMethod === "Cartão de crédito") icon = "💳";
               else if (t.paymentMethod === "Pix" || t.paymentMethod === "Cartão de débito") icon = "✅";
               else icon = "💵"; // Dinheiro e outros
               
               return `• ${day}/${month} ${icon} ${safeName} - R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
           }).join("\n");

           await sendTelegramMessage(chatId, 
            `🗓️ *Gastos da Semana (${inicioStr} - ${fimStr}):*\n\n` +
            `${list}\n` +
            `---------------------------\n` +
            `📉 *Total:* R$ ${totalSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
           );
           return NextResponse.json({ status: "ok" });
      } catch (error) {
           console.error("Erro ao consultar semana:", error);
           await sendTelegramMessage(chatId, "❌ Erro ao consultar banco de dados.");
           return NextResponse.json({ status: "error" });
      }
  }

  // >>> COMANDO TOP GASTOS <<<
  if (text.toLowerCase().includes("top")) {
      await sendTelegramMessage(chatId, "🏆 Buscando maiores gastos do mês...");
      try {
           const now = new Date();
           const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
           
           const data = await fetchTopExpenses(targetUserId, currentPeriod);
           
           if (!data.expenses.length) {
               await sendTelegramMessage(chatId, "Nenhum gasto encontrado neste mês.");
               return NextResponse.json({ status: "ok" });
           }

           // Top 5 apenas
           const top5 = data.expenses.slice(0, 5).map((e, i) => 
               `${i+1}. *${e.name}*: R$ ${e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
           ).join("\n");

           await sendTelegramMessage(chatId, `🏆 *Top Despesas de ${now.toLocaleDateString('pt-BR', { month: 'long' })}:*\n\n${top5}`);
           return NextResponse.json({ status: "ok" });

      } catch (error) {
           console.error("Erro top gastos:", error);
           return NextResponse.json({ status: "error" });
      }
  }

  // >>> COMANDO CATEGORIAS <<<
  if (text.toLowerCase().includes("categoria") || text.toLowerCase().includes("categorias")) {
      await sendTelegramMessage(chatId, "🍕 Analisando categorias...");
      try {
           const now = new Date();
           const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
           
           const data = await fetchExpensesByCategory(targetUserId, currentPeriod);
           
           if (!data.categories.length) {
                await sendTelegramMessage(chatId, "Nenhuma despesa categorizada neste mês.");
                return NextResponse.json({ status: "ok" });
           }

           const list = data.categories.slice(0, 8).map(c => 
               `▪️ *${c.categoryName}*: R$ ${c.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${c.percentageOfTotal.toFixed(1)}%)`
           ).join("\n");

           await sendTelegramMessage(chatId, `📊 *Gastos por Categoria:*\n\n${list}`);
           return NextResponse.json({ status: "ok" });

      } catch (error) {
          console.error("Erro categorias:", error);
          return NextResponse.json({ status: "error" });
      }
  }

  // >>> COMANDO ULTIMOS LANCAMENTOS <<<
  if (text.toLowerCase().includes("ultimo") || text.toLowerCase().includes("último")) {
       await sendTelegramMessage(chatId, "📄 Buscando últimos lançamentos...");
       try {
           const now = new Date();
           // O fetchRecentTransactions pede 'period', mas queremos ver os ultimos independente do mês? 
           // A função original filtra por periodo (WHERE period = ...).
           // Então vamos usar o periodo atual.
           const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
           
           const data = await fetchRecentTransactions(targetUserId, currentPeriod);
           
           if (!data.transactions.length) {
               await sendTelegramMessage(chatId, "Nenhum lançamento recente neste mês.");
               return NextResponse.json({ status: "ok" });
           }

           const list = data.transactions.map(t => {
               const dateObj = new Date(t.purchaseDate);
               const day = dateObj.getDate().toString().padStart(2, '0');
               const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
               return `🗓️ ${day}/${month}: *${t.name}* - R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
           }).join("\n");

           await sendTelegramMessage(chatId, `🆕 *Últimos Lançamentos:*\n\n${list}`);
           return NextResponse.json({ status: "ok" });

       } catch (error) {
           console.error("Erro ultimos:", error);
           return NextResponse.json({ status: "error" });
       }
  }

  // >>> COMANDO REAL (Competência / Compra) <<<
  if (text.toLowerCase().includes("real") || text.toLowerCase().includes("compra")) {
      await sendTelegramMessage(chatId, "📅 Calculando gastos por data de compra...");
      
      try {
           const now = new Date();
           // Primeiro dia do mês
           const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
           // Último dia do mês
           const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
           endDate.setHours(23, 59, 59, 999);

           // Extrair termo de busca (tudo após "real" ou "compra")
           // Ex: "real mercado" -> "mercado"
           const lowerText = text.toLowerCase();
           let searchTerm = "";
           
           if (lowerText.startsWith("real ")) {
               searchTerm = lowerText.replace("real ", "").trim();
           } else if (lowerText.startsWith("compra ")) {
               searchTerm = lowerText.replace("compra ", "").trim();
           } else if (lowerText.startsWith("/real ")) {
               searchTerm = lowerText.replace("/real ", "").trim();
           }
           
           if (searchTerm) {
               await sendTelegramMessage(chatId, `🔍 Filtrando por "${searchTerm}"...`);
           }

           const data = await fetchExpensesByPurchaseDate(targetUserId, startDate, endDate, searchTerm);
           
           if (!data.categories.length) {
                await sendTelegramMessage(chatId, `Nenhuma despesa encontrada de competência neste mês${searchTerm ? ` para "${searchTerm}"` : ''}.`);
                return NextResponse.json({ status: "ok" });
           }

           // Se tiver filtro e transações, mostrar detalhes
           let detailsText = "";
           
           if (searchTerm && data.transactions?.length) {
               detailsText = "\n📝 *Detalhamento:*\n" + data.transactions.map(t => {
                   const dateObj = new Date(t.purchaseDate);
                   const day = dateObj.getDate().toString().padStart(2, '0');
                   const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                   const sanitizedName = escapeMarkdown(t.name);
                   return `• ${day}/${month}: ${sanitizedName} - R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
               }).join("\n");
           } else {
               // Resumo padrão por categoria (top 10)
               detailsText = data.categories.slice(0, 10).map(c => {
                   const sanitizedCat = escapeMarkdown(c.categoryName);
                   return `▪️ *${sanitizedCat}*: R$ ${c.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${c.percentageOfTotal.toFixed(1)}%)`;
               }).join("\n");
           }
           
           const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
           const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

           const safeSearchTerm = escapeMarkdown(searchTerm);
           const title = searchTerm 
                ? `🛍️ *Gastos Reais: ${safeSearchTerm} (${capitalizedMonth})*`
                : `🛍️ *Gastos Reais de ${capitalizedMonth} (Por Compra):*`;

           await sendTelegramMessage(chatId, 
            `${title}\n` +
            `_Regime de Competência (Data da Compra)_\n\n` +
            `${detailsText}\n` +
            `---------------------------\n` +
            `💰 *Total:* R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
           );
           return NextResponse.json({ status: "ok" });

      } catch (error) {
          console.error("Erro gastos reais:", error);
          return NextResponse.json({ status: "error" });
      }
  }

  // >>> COMANDO DESFAZER <<<
  if (text.toLowerCase() === "/desfazer" || text.toLowerCase() === "desfazer") {
       const lastItem = await getLastTransaction(targetUserId);
       
       if (!lastItem) {
           await sendTelegramMessage(chatId, "Nenhum lançamento encontrado para desfazer.");
           return NextResponse.json({ status: "ok" });
       }
       
       const safeName = escapeMarkdown(lastItem.name);
       const confirmText = `⚠️ *Apagar último lançamento?*\n\n${safeName} - R$ ${Number(lastItem.amount).toFixed(2)}`;
       
       const keyboard = {
          inline_keyboard: [
              [
                  { text: "🗑️ Sim, apagar", callback_data: `del:${lastItem.id}` },
                  { text: "Cancelar", callback_data: `cancel` }
              ]
          ]
       };
       
       await sendTelegramMessage(chatId, confirmText, keyboard);
       return NextResponse.json({ status: "ok" });
  }

  // >>> COMANDO FATURA <<<
  if (text.toLowerCase().includes("fatura")) {
      await sendTelegramMessage(chatId, "💳 Calculando faturas abertas...");
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const summaries = await fetchInvoiceSummaries(targetUserId, currentPeriod);
      
      if (!summaries.length) {
          await sendTelegramMessage(chatId, "Nenhuma fatura com gastos neste mês.");
          return NextResponse.json({ status: "ok" });
      }
      
      const list = summaries.map((f: any) => 
          `💳 *${escapeMarkdown(f.cartaoName)}*\n` +
          `Venc: dia ${f.dueDay} | Fecha: dia ${f.closingDay}\n` +
          `💰 *Total:* R$ ${f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join("\n\n");
      
      await sendTelegramMessage(chatId, `🧾 *Faturas do Mês (${currentPeriod}):*\n\n${list}`);
      return NextResponse.json({ status: "ok" });
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
