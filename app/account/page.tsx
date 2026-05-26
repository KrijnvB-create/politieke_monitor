import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  return (
    <main className="page-shell">
      <section className="section-heading">
        <p className="eyebrow">Account</p>
        <h1>Je Kamerkompas-profiel</h1>
      </section>
      <section className="account-grid">
        <div className="profile-card">
          <div className="avatar">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span>{profile?.full_name?.slice(0, 1) ?? userData.user.email?.slice(0, 1) ?? "P"}</span>
            )}
          </div>
          <div>
            <h2>{profile?.full_name ?? "Ingelogde gebruiker"}</h2>
            <p>{profile?.email ?? userData.user.email}</p>
          </div>
        </div>
        <div className="quiet-panel">
          <h2>Wat werkt nu?</h2>
          <p>
            Je sessie loopt via Supabase. Opgeslagen items zijn afgeschermd met Row Level Security, dus alleen jij kunt je eigen items lezen en verwijderen.
          </p>
          <Link className="primary-button inline-flex" href="/saved">
            Bekijk opgeslagen items
          </Link>
        </div>
      </section>
    </main>
  );
}
