/**
 * Pagador constants
 *
 * Extracted from /lib/pagadores.ts
 */

export const PAGADOR_STATUS_OPTIONS = ["Ativo", "Inativo"] as const;

export type PagadorStatus = (typeof PAGADOR_STATUS_OPTIONS)[number];

export const PAGADOR_ROLE_ADMIN = "admin";
export const PAGADOR_ROLE_MEMBER = "membro";
export const PAGADOR_ROLE_TERCEIRO = "terceiro";
export const DEFAULT_PAGADOR_AVATAR = "avatar_010.svg";
