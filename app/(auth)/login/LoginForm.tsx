// app/(auth)/login/LoginForm.tsx  — everything your current LoginPage.tsx has, renamed
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm transition-all outline-none";
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background, #f8f7f4)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 sm:p-7 shadow-sm" style={{ background: "#fff", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>StockFlow</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Inventory Manager</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Sign in</h1>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Enter your credentials to continue.</p>

        {error && (
          <div className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #dc262620" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Username</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. priya"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}