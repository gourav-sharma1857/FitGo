import { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, from, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      if (mode === "signup") {
        await signup(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please check your credentials.");
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <div className="glass rounded-[2rem] border border-white/10 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">FitGo access</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{mode === "signup" ? "Create account" : "Welcome back"}</h1>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-[0.2em]">Email</label>
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 border border-white/10 transition-colors duration-200 hover:border-white/20">
                <Mail className="w-4 h-4 text-white/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-white placeholder:text-white/30 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-[0.2em]">Password</label>
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 border border-white/10 transition-colors duration-200 hover:border-white/20">
                <Lock className="w-4 h-4 text-white/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white placeholder:text-white/30 outline-none"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-white/50">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="inline-flex items-center gap-2 text-left text-white/70 transition hover:text-white"
            >
              <span>{mode === "login" ? "New here? Create an account" : "Already registered? Sign in"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
