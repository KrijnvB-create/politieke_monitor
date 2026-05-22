import Link from "next/link";
import { Bookmark, Compass, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  let user = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Compass size={24} aria-hidden="true" />
        <span>
          Politiekemonitor
          <small>Tweede Kamer live</small>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Hoofdnavigatie">
        <Link href="/">Monitor</Link>
        <Link href="/saved">
          <Bookmark size={16} aria-hidden="true" />
          Opgeslagen
        </Link>
        {user ? (
          <>
            <Link href="/account">
              <UserCircle size={16} aria-hidden="true" />
              Account
            </Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="nav-cta" href="/login">
            Inloggen
          </Link>
        )}
      </nav>
    </header>
  );
}
