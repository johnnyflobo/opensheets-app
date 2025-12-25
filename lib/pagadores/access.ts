import {
  pagadores,
  pagadorShares,
  user as usersTable,
} from "@/db/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export type PagadorWithAccess = Omit<
  typeof pagadores.$inferSelect,
  "shareCode"
> & {
  shareCode: string | null;
  canEdit: boolean;
  sharedByName: string | null;
  sharedByEmail: string | null;
  shareId: string | null;
};

export async function fetchPagadoresWithAccess(
  userId: string
): Promise<PagadorWithAccess[]> {
  const [owned, shared] = await Promise.all([
    db.query.pagadores.findMany({
      where: eq(pagadores.userId, userId),
    }),
    db
      .select({
        shareId: pagadorShares.id,
        pagador: pagadores,
        ownerName: usersTable.name,
        ownerEmail: usersTable.email,
      })
      .from(pagadorShares)
      .innerJoin(
        pagadores,
        eq(pagadorShares.pagadorId, pagadores.id)
      )
      .leftJoin(
        usersTable,
        eq(pagadores.userId, usersTable.id)
      )
      .where(eq(pagadorShares.sharedWithUserId, userId)),
  ]);

  const ownedMapped: PagadorWithAccess[] = owned.map((item) => ({
    ...item,
    canEdit: true,
    sharedByName: null,
    sharedByEmail: null,
    shareId: null,
  }));

  const sharedMapped: PagadorWithAccess[] = shared.map((item) => ({
    ...item.pagador,
    shareCode: null,
    canEdit: false,
    sharedByName: item.ownerName ?? null,
    sharedByEmail: item.ownerEmail ?? null,
    shareId: item.shareId,
  }));

  return [...ownedMapped, ...sharedMapped];
}

export async function getPagadorAccess(
  userId: string,
  pagadorId: string
) {
  const pagador = await db.query.pagadores.findFirst({
    where: and(eq(pagadores.id, pagadorId)),
  });

  if (!pagador) {
    return null;
  }

  if (pagador.userId === userId) {
    return {
      pagador,
      canEdit: true,
      share: null as typeof pagadorShares.$inferSelect | null,
    };
  }

  const share = await db.query.pagadorShares.findFirst({
    where: and(
      eq(pagadorShares.pagadorId, pagadorId),
      eq(pagadorShares.sharedWithUserId, userId)
    ),
  });

  if (!share) {
    return null;
  }

  return { pagador, canEdit: false, share };
}

export async function userCanEditPagador(
  userId: string,
  pagadorId: string
) {
  const pagadorRow = await db.query.pagadores.findFirst({
    columns: { id: true },
    where: and(eq(pagadores.id, pagadorId), eq(pagadores.userId, userId)),
  });

  return Boolean(pagadorRow);
}

export async function userHasPagadorAccess(
  userId: string,
  pagadorId: string
) {
  const access = await getPagadorAccess(userId, pagadorId);
  return Boolean(access);
}

export async function getEffectiveUserId(currentUserId: string): Promise<string> {
  // Check if user has access to any ADMIN pagador from another user
  const adminShare = await db
    .select({
      ownerId: pagadores.userId,
    })
    .from(pagadorShares)
    .innerJoin(pagadores, eq(pagadorShares.pagadorId, pagadores.id))
    .where(
      and(
        eq(pagadorShares.sharedWithUserId, currentUserId),
        eq(pagadores.role, "admin") // Using string directly to avoid circular dependency if constant is not amenable
      )
    )
    .limit(1);

  if (adminShare.length > 0) {
    return adminShare[0].ownerId;
  }

  return currentUserId;
}
