"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
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
      setError("We couldn't send the sign-in link. Please check your connection and try again.");
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
        {pending ? "Sending…" : "Email Me a Sign-In Link"}
      </button>
    </form>
  );
}
