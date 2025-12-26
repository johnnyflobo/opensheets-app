
import "dotenv/config";
import { db } from "@/lib/db";
import { contas, lancamentos, pagadores, user } from "@/db/schema";
import { and, eq, lte, isNotNull, ne, sum, sql } from "drizzle-orm";
import { INITIAL_BALANCE_NOTE } from "@/lib/accounts/constants";


async function run() {
  console.log("Starting debug script...");
  console.log(`DB URL: ${process.env.DATABASE_URL?.split('@')[1]}`); // Log host only

  const users = await db.select().from(user);
  console.log(`Found ${users.length} users.`);



  const targetUser = "iVZqN1iLm157P6IsPFDLu7myEtanSmuE";
  console.log(`\nProfiling User: ${targetUser}`);
  
  // 1. By Period
  const byPeriod = await db
    .select({
      period: lancamentos.period,
      count: sql<number>`count(*)`,
      amount: sum(lancamentos.amount).mapWith(Number)
    })
    .from(lancamentos)
    .where(eq(lancamentos.userId, targetUser))
    .groupBy(lancamentos.period)
    .orderBy(lancamentos.period);
    
  console.log("By Period:");
  byPeriod.forEach(p => console.log(`  ${p.period}: ${p.count} txs, ${p.amount}`));

  // 2. By Settled
  const bySettled = await db
    .select({
      isSettled: lancamentos.isSettled,
      count: sql<number>`count(*)`,
      amount: sum(lancamentos.amount).mapWith(Number)
    })
    .from(lancamentos)
    .where(eq(lancamentos.userId, targetUser))
    .groupBy(lancamentos.isSettled);
    
  console.log("By Settled:");
  bySettled.forEach(p => console.log(`  ${p.isSettled}: ${p.count} txs, ${p.amount}`));

    // Calculate balance for requested period 2025-12 (Since 2025-11 was empty)
    const targetPeriod = "2025-12";
    console.log(`  > CALCULATING FOR ${targetPeriod}:`);
    
    // 1. Initial Balance
    const [initialResult] = await db
      .select({ total: sum(contas.initialBalance).mapWith(Number) })
      .from(contas)
      .where(and(eq(contas.userId, targetUser), eq(contas.excludeFromBalance, false)));
    
    // 2. Settled Movements
    const movements = await db
      .select({ 
        amount: lancamentos.amount, 
        type: lancamentos.transactionType,
        note: lancamentos.note,
        date: lancamentos.date,
        conta: contas.name
      })
      .from(lancamentos)
      .leftJoin(contas, eq(lancamentos.contaId, contas.id))
      .where(
        and(
          eq(lancamentos.userId, targetUser),
          lte(lancamentos.period, targetPeriod),
          eq(lancamentos.isSettled, true),
          isNotNull(lancamentos.contaId),
          eq(contas.excludeFromBalance, false),
          ne(lancamentos.note, INITIAL_BALANCE_NOTE)
        )
      );
      
    const totalMovements = movements.reduce((s, m) => s + Number(m.amount), 0);
    const totalInitial = initialResult?.total ?? 0;
    
    console.log(`    > Initial Balance: ${totalInitial}`);
    console.log(`    > Settled Movements: ${totalMovements}`);
    console.log(`    > TOTAL BALANCE: ${totalInitial + totalMovements}`);
    
    console.log(`    > Transactions Included:`);
    movements.forEach(m => {
       console.log(`      [${m.date}] ${m.type} (${m.conta}): ${m.amount} | Note: ${m.note}`);
    });

  // 3. By Account Association
  const byAccount = await db
    .select({
      hasAccount: isNotNull(lancamentos.contaId),
      excluded: contas.excludeFromBalance,
      count: sql<number>`count(*)`,
      amount: sum(lancamentos.amount).mapWith(Number)
    })
    .from(lancamentos)
    .leftJoin(contas, eq(lancamentos.contaId, contas.id))
    .where(eq(lancamentos.userId, targetUser))
    .groupBy(isNotNull(lancamentos.contaId), contas.excludeFromBalance);
    
  console.log("By Account Status:");
  byAccount.forEach(p => console.log(`  HasAcc: ${p.hasAccount}, Excluded: ${p.excluded}, Count: ${p.count}, Sum: ${p.amount}`));
  
  // 4. Initial Balances
  const initials = await db
    .select({
        name: contas.name,
        excluded: contas.excludeFromBalance,
        initial: contas.initialBalance
    })
    .from(contas)
    .where(eq(contas.userId, targetUser));
    
  console.log("Accounts:");
  initials.forEach(a => console.log(`  ${a.name}: Excl=${a.excluded}, Init=${a.initial}`));




}


run().catch(console.error);
