import Link from "next/link";
import { redirect } from "next/navigation";
import { savedKindLabel, type SavedItemRecord } from "@/lib/saved-items";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("saved_items")
    .select("id, kind, ref_id, label, meta, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  const savedItems = (items ?? []) as SavedItemRecord[];

  return (
    <main className="page-shell">
      <section className="section-heading">
        <p className="eyebrow">Persoonlijk</p>
        <h1>Opgeslagen items</h1>
        <p>Alles wat je bewaart op Politiekemonitor komt hier terecht.</p>
      </section>

      {savedItems.length === 0 ? (
        <section className="empty-state">
          <h2>Nog niets bewaard</h2>
          <p>Ga terug naar de monitor en klik op een bewaar-knop bij een activiteit of dossier.</p>
          <Link className="primary-button inline-flex" href="/">
            Naar de monitor
          </Link>
        </section>
      ) : (
        <section className="saved-list" aria-label="Opgeslagen items">
          {savedItems.map((item) => (
            <article className="saved-row" key={item.id}>
              <div>
                <p className="saved-kind">{savedKindLabel(item.kind)}</p>
                <h2>{item.label ?? item.ref_id}</h2>
                <p>{new Date(item.created_at).toLocaleString("nl-NL")}</p>
              </div>
              <span>{item.ref_id}</span>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
