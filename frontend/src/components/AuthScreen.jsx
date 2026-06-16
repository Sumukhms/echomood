import { useState } from "react";
import axios from "axios";

export default function AuthScreen({ setAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const submitLabel = mode === "login" ? "Login" : mode === "register" ? "Register" : "Reset Password";
  const endpoint = mode === "login" ? "/api/auth/login" : mode === "register" ? "/api/auth/register" : "/api/auth/reset_password";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setMessage("Please enter both username and password.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await axios.post(`https://sumukh25-echomood-api.hf.space${endpoint}`, {
        username: username.trim(),
        password,
      });

      const data = response.data;
      if (data.success) {
        if (mode === "forgot_password") {
          setMessage("Password successfully reset! You can now login.");
          setMode("login");
          setPassword("");
        } else {
          const userObj = { username: data.user?.username || data.username };
          localStorage.setItem("echomood_user", JSON.stringify(userObj));
          setAuth(userObj);
        }
      } else {
        setMessage(data.message || "Something went wrong.");
      }
    } catch (error) {
      const errorText =
        error.response?.data?.message || "Unable to reach the server.";
      setMessage(errorText);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),_transparent_50%),linear-gradient(180deg,_#020617,_#09090b)]">
      <div className="w-full max-w-xl p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/20">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.35em] uppercase text-zinc-400 mb-2">
            Echomood Authentication
          </p>
          <h1 className="text-4xl font-serif text-white">Welcome Back</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Use your credentials to access your personalized vault and mood
            presets.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          {["login", "register"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setMessage("");
              }}
              className={`px-5 py-2 text-sm uppercase tracking-[0.2em] rounded-full transition ${
                mode === option
                  ? "bg-gold-500 text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl bg-zinc-950/70 border border-white/10 px-4 py-4 text-white outline-none focus:border-gold-500"
              placeholder="Type your username"
              autoComplete="username"
            />
          </div>
          <div className="relative">
            <label className="block text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">
              {mode === "forgot_password" ? "New Password" : "Password"}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-zinc-950/70 border border-white/10 px-4 py-4 pr-12 text-white outline-none focus:border-gold-500"
              placeholder={mode === "forgot_password" ? "Type your new password" : "Type your password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-zinc-400 hover:text-white"
              title="Toggle Password Visibility"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>

          {mode === "login" && (
            <div className="text-right mt-1">
              <button 
                type="button" 
                onClick={() => setMode("forgot_password")}
                className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-gold-500 px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-gold-400 disabled:opacity-70"
          >
            {status === "loading" ? "PLEASE WAIT..." : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
