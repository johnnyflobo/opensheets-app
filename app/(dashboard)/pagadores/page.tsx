import { PagadoresPage } from "@/components/pagadores/pagadores-page";
import type { PagadorStatus } from "@/lib/pagadores/constants";
import {
  PAGADOR_STATUS_OPTIONS,
  DEFAULT_PAGADOR_AVATAR,
  PAGADOR_ROLE_ADMIN,
  PAGADOR_ROLE_MEMBER,
} from "@/lib/pagadores/constants";
import { getUserId } from "@/lib/auth/server";
import { getEffectiveUserId, fetchPagadoresWithAccess } from "@/lib/pagadores/access";
import { readdir } from "node:fs/promises";
import path from "node:path";

const AVATAR_DIRECTORY = path.join(process.cwd(), "public", "avatares");
const AVATAR_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".svg", ".webp"]);

async function loadAvatarOptions() {
  try {
    const files = await readdir(AVATAR_DIRECTORY, { withFileTypes: true });

    const items = files
      .filter((file) => file.isFile())
      .map((file) => file.name)
      .filter((file) => AVATAR_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    if (items.length === 0) {
      items.push(DEFAULT_PAGADOR_AVATAR);
    }

    return Array.from(new Set(items));
  } catch {
    return [DEFAULT_PAGADOR_AVATAR];
  }
}

const resolveStatus = (status: string | null): PagadorStatus => {
  const normalized = status?.trim() ?? "";
  const found = PAGADOR_STATUS_OPTIONS.find(
    (option) => option.toLowerCase() === normalized.toLowerCase()
  );
  return found ?? PAGADOR_STATUS_OPTIONS[0];
};

export default async function Page() {
  const userId = await getEffectiveUserId(await getUserId());

  const [pagadorRows, avatarOptions] = await Promise.all([
    fetchPagadoresWithAccess(userId),
    loadAvatarOptions(),
  ]);

  const pagadoresData = pagadorRows
    .map((pagador) => ({
      id: pagador.id,
      name: pagador.name,
      email: pagador.email,
      avatarUrl: pagador.avatarUrl,
      status: resolveStatus(pagador.status),
      note: pagador.note,
      role: pagador.role,
      isAutoSend: pagador.isAutoSend ?? false,
      createdAt: pagador.createdAt?.toISOString() ?? new Date().toISOString(),
      canEdit: pagador.canEdit,
      sharedByName: pagador.sharedByName ?? null,
      sharedByEmail: pagador.sharedByEmail ?? null,
      shareId: pagador.shareId ?? null,
      shareCode: pagador.canEdit ? pagador.shareCode ?? null : null,
    }))
    .sort((a, b) => {
      // Helper para pontuar roles: Admin (3) > Member (2) > Outros (1)
      const getScore = (role: string | null) => {
        if (role === PAGADOR_ROLE_ADMIN) return 3;
        if (role === PAGADOR_ROLE_MEMBER) return 2;
        return 1;
      };

      const scoreA = getScore(a.role);
      const scoreB = getScore(b.role);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Maior score primeiro
      }
      
      return a.name.localeCompare(b.name);
    });

  return (
    <main className="flex flex-col items-start gap-6">
      <PagadoresPage pagadores={pagadoresData} avatarOptions={avatarOptions} />
    </main>
  );
}
