"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (usePassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError("That email and password combination didn't work.");
          return;
        }
        window.location.href = "/app";
        return;
      }
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError("We couldn't send the sign-in link. Please try again in a moment.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't sign you in. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div aria-live="polite" className="max-w-md rounded-2xl border border-success/40 bg-success/10 p-6">
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="mt-2 text-lg text-muted">
          We sent a sign-in link to {email}. It expires shortly, so use it soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="login-email" className="mb-1 block text-base font-medium">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text focus:border-cyan"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {usePassword ? (
        <div>
          <label htmlFor="login-password" className="mb-1 block text-base font-medium">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text focus:border-cyan"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong disabled:opacity-60"
      >
        {pending ? "Signing in…" : usePassword ? "Sign In" : "Email Me a Sign-In Link"}
      </button>
      <button
        type="button"
        className="text-left text-base text-muted underline hover:text-text"
        onClick={() => setUsePassword((value) => !value)}
      >
        {usePassword ? "Use an emailed sign-in link instead" : "Sign in with a password instead"}
      </button>
    </form>
  );
}
