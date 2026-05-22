"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <button className="icon-button" type="button" onClick={signOut} title="Uitloggen">
      <LogOut size={18} aria-hidden="true" />
      <span>Uitloggen</span>
    </button>
  );
}
