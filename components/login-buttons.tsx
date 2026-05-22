"use client";

import { Github, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

async function signIn(provider: Provider) {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;

  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });
}

export function LoginButtons() {
  return (
    <div className="auth-actions">
      <button className="primary-button" type="button" onClick={() => signIn("google")}>
        <Mail size={18} aria-hidden="true" />
        Google
      </button>
      <button className="secondary-button" type="button" onClick={() => signIn("github")}>
        <Github size={18} aria-hidden="true" />
        GitHub
      </button>
    </div>
  );
}
