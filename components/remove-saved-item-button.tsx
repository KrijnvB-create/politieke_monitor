"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RemoveSavedItemButtonProps = {
  id: string;
};

export function RemoveSavedItemButton({ id }: RemoveSavedItemButtonProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  async function handleRemove() {
    setIsBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("saved_items").delete().eq("id", id);

    if (error) {
      setIsBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      className="icon-button remove-saved-button"
      type="button"
      onClick={handleRemove}
      disabled={isBusy}
      title="Verwijderen"
      aria-label="Verwijderen"
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}
