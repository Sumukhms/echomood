import { useState } from "react";
import axios from "axios";

export default function AuthScreen({ setAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const submitLabel = mode === "login" ? "Login" : "Register";
  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setMessage("Please enter both username and password.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await axios.post(`http://127.0.0.1:5000${endpoint}`, {
        username: username.trim(),
        password,
      });

      const data = response.data;
      if (data.success) {
        setAuth({ username: data.user?.username || data.username });
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
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-zinc-950/70 border border-white/10 px-4 py-4 text-white outline-none focus:border-gold-500"
              placeholder="Type your password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

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
