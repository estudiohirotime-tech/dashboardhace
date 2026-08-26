// -----------------------------------------------------------------------------
// Autenticação simples por sessão assinada (JWT via jose — compatível com Edge,
// usado no middleware). Um único login compartilhado, sobrescrevível por env.
//
// Credenciais (todas com fallback para funcionar sem configuração):
//   APP_AUTH_USER          usuário            (default: "hacecompany")
//   APP_AUTH_PASSWORD      senha em texto     (opcional; se setada, tem prioridade)
//   APP_AUTH_PASSWORD_HASH sha256 hex da senha (default: hash de "12091998")
//   AUTH_SECRET            segredo p/ assinar a sessão (DEFINA em produção!)
// -----------------------------------------------------------------------------

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hace_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

// Fallback de desenvolvimento. Em produção, defina AUTH_SECRET no ambiente —
// com o segredo default, cookies de sessão poderiam ser forjados.
const DEFAULT_SECRET = "hace-dev-secret-troque-em-producao-com-AUTH_SECRET";

// Default: sha256("12091998"). A senha em texto puro NÃO fica no código.
const DEFAULT_PASSWORD_HASH = "4c1f9c49ec4472978553b161a976615fbe0159d373a9676349f77e12876f3154";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);
}

export function getAuthUser(): string {
  return process.env.APP_AUTH_USER || "hacecompany";
}

export function getPasswordHash(): string {
  return (process.env.APP_AUTH_PASSWORD_HASH || DEFAULT_PASSWORD_HASH).toLowerCase();
}

/** sha256 hex usando Web Crypto (funciona em Node e Edge). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Valida usuário + senha. */
export async function verifyCredentials(user: string, password: string): Promise<boolean> {
  const expectedUser = getAuthUser().trim().toLowerCase();
  const plaintextEnv = process.env.APP_AUTH_PASSWORD;
  const expectedHash = plaintextEnv ? await sha256Hex(plaintextEnv) : getPasswordHash();
  const userOk = (user ?? "").trim().toLowerCase() === expectedUser;
  const passOk = (await sha256Hex(password ?? "")) === expectedHash;
  return userOk && passOk;
}

export async function createSession(user: string): Promise<string> {
  return new SignJWT({ u: user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
