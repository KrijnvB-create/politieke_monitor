"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SaveButtonProps = {
  kind: "dossier" | "kamerlid" | "fractie" | "motie" | "vergadering" | "activiteit";
  refId: string;
  label: string;
  meta?: Record<string, unknown>;
};

export function SaveButton({ kind, refId, label, meta = {} }: SaveButtonProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadState() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!active || !user) {
        return;
      }

      setIsSignedIn(true);
      const { data } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("ref_id", refId)
        .maybeSingle();

      if (active) {
        setIsSaved(Boolean(data));
      }
    }

    loadState();
    return () => {
      active = false;
    };
  }, [kind, refId]);

  async function toggleSave() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setIsBusy(true);

    if (isSaved) {
      await supabase
        .from("saved_items")
        .delete()
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("ref_id", refId);
      setIsSaved(false);
    } else {
      await supabase.from("saved_items").insert({
        user_id: user.id,
        kind,
        ref_id: refId,
        label,
        meta
      });
      setIsSaved(true);
      setIsSignedIn(true);
    }

    setIsBusy(false);
  }

  const Icon = isSaved ? BookmarkCheck : Bookmark;
  const labelText = isSaved ? "Bewaard" : isSignedIn ? "Bewaar" : "Login om te bewaren";

  return (
    <button className="save-button" type="button" onClick={toggleSave} disabled={isBusy} title={labelText}>
      <Icon size={16} aria-hidden="true" />
      <span>{labelText}</span>
    </button>
  );
}
