/**
 * Better Auth Configuration
 *
 * Configuração central de autenticação usando Better Auth.
 * Suporta email/password e Google OAuth.
 */

import { seedDefaultCategoriesForUser } from "@/lib/categorias/defaults";
import { db, schema } from "@/lib/db";
import { ensureDefaultPagadorForUser } from "@/lib/pagadores/defaults";
import { normalizeNameFromEmail } from "@/lib/pagadores/utils";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { GoogleProfile } from "better-auth/social-providers";

// ============================================================================
// GOOGLE OAUTH CONFIGURATION
// ============================================================================

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Extrai nome do usuário do perfil do Google com fallback hierárquico:
 * 1. profile.name (nome completo)
 * 2. profile.given_name + profile.family_name
 * 3. Nome extraído do email
 * 4. "Usuário" (fallback final)
 */
function getNameFromGoogleProfile(profile: GoogleProfile): string {
  const fullName = profile.name?.trim();
  if (fullName) return fullName;

  const fromGivenFamily = [profile.given_name, profile.family_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromGivenFamily) return fromGivenFamily;

  const fromEmail = profile.email
    ? normalizeNameFromEmail(profile.email)
    : undefined;

  return fromEmail ?? "Usuário";
}

// ============================================================================
// BETTER AUTH INSTANCE
// ============================================================================

export const auth = betterAuth({
  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  // Database adapter (Drizzle + PostgreSQL)
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),

  // Google OAuth (se configurado)
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            mapProfileToUser: (profile) => ({
              name: getNameFromGoogleProfile(profile),
              email: profile.email,
              image: profile.picture,
              emailVerified: profile.email_verified,
            }),
          },
        }
      : undefined,

  // Database hooks - Executados após eventos do DB
  databaseHooks: {
    user: {
      create: {
        /**
         * Após criar novo usuário, inicializa:
         * 1. Categorias padrão (Receitas/Despesas)
         * 2. Pagador padrão (vinculado ao usuário)
         */
        after: async (user) => {
          // Se falhar aqui, o usuário já foi criado - considere usar queue para retry
          try {
            await seedDefaultCategoriesForUser(user.id);
            await ensureDefaultPagadorForUser({
              id: user.id,
              name: user.name ?? undefined,
              email: user.email ?? undefined,
              image: user.image ?? undefined,
            });
          } catch (error) {
            console.error(
              "[Auth] Falha ao criar dados padrão do usuário:",
              error
            );
            // TODO: Considere enfileirar para retry ou notificar admin
          }
        },
      },
    },
  },
  trustedOrigins: [
    "https://opensheets-azure.vercel.app",
    process.env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[],
});

// Aviso em desenvolvimento se Google OAuth não estiver configurado
if (!googleClientId && process.env.NODE_ENV === "development") {
  console.warn(
    "[Auth] Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET."
  );
}
