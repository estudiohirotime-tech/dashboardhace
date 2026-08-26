import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Prefixos públicos (não exigem sessão): apenas o fluxo de autenticação.
// As rotas de dados do Instagram (/api/ig/*) ficam atrás do login.
const PUBLIC_PREFIXES = ["/login", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authed = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (authed) return NextResponse.next();

  // API protegida -> 401; página -> redireciona para /login com ?next
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Roda em tudo, exceto assets estáticos do Next e o favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
