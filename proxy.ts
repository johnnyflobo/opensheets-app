import { auth } from "@/lib/auth/config";
import { NextRequest, NextResponse } from "next/server";

// Rotas protegidas que requerem autenticação
const PROTECTED_ROUTES = [
  "/ajustes",
  "/anotacoes",
  "/calendario",
  "/cartoes",
  "/categorias",
  "/contas",
  "/dashboard",
  "/insights",
  "/lancamentos",
  "/orcamentos",
  "/pagadores",
];

// Rotas públicas (não requerem autenticação)
const PUBLIC_AUTH_ROUTES = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignorar rotas de API (especialmente /api/auth que é usada pelo better-auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Verificar sessão usando a API do better-auth
  // Usar try/catch para evitar erros que possam bloquear o login
  let isAuthenticated = false;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    isAuthenticated = !!session?.user;
  } catch (error) {
    // Se houver erro ao verificar sessão, assumir não autenticado
    // Isso permite que o processo de login continue
    console.error("[Proxy] Erro ao verificar sessão:", error);
  }

  // Redirect authenticated users away from login/signup pages
  if (isAuthenticated && PUBLIC_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users trying to access protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to protected and auth routes
  // Rotas de API são excluídas automaticamente pela verificação no início da função
  matcher: [
    "/ajustes/:path*",
    "/anotacoes/:path*",
    "/calendario/:path*",
    "/cartoes/:path*",
    "/categorias/:path*",
    "/contas/:path*",
    "/dashboard/:path*",
    "/insights/:path*",
    "/lancamentos/:path*",
    "/orcamentos/:path*",
    "/pagadores/:path*",
    "/login/:path*",
    "/signup/:path*",
  ],
};
