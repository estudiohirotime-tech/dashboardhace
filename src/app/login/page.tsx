"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-inset)",
    borderColor: "var(--border-strong)",
    color: "var(--text-primary)",
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "var(--bg-app)" }}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-[12px]"
            style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
          >
            <Store size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Dashboard Omnichannel
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Entre para acessar o painel
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="label-caps" htmlFor="username">Usuário</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="rounded-[10px] border px-3 py-2.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-caps" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-[10px] border px-3 py-2.5 text-sm"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              className="rounded-[10px] px-3 py-2 text-sm"
              style={{ background: "rgba(248,113,113,0.12)", color: "var(--negative)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-2 flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
