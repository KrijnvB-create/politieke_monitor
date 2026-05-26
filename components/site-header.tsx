import Link from "next/link";
import {
  Bookmark,
  CalendarRange,
  Compass,
  FileText,
  Landmark,
  LayoutDashboard,
  Radio,
  Search,
  Users,
  Vote,
  UserCircle
} from "lucide-react";
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
          Kamerkompas
          <small>Tweede Kamer live</small>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Hoofdnavigatie">
        <Link href="/">Overzicht</Link>
        <Link href="/stemmingen">
          <Vote size={16} aria-hidden="true" />
          Stemmingen
        </Link>
        <Link href="/agenda">
          <CalendarRange size={16} aria-hidden="true" />
          Agenda
        </Link>
        <Link href="/kamerbrieven">
          <FileText size={16} aria-hidden="true" />
          Kamerbrieven
        </Link>
        <Link href="/dossiers">
          <Landmark size={16} aria-hidden="true" />
          Dossiers
        </Link>
        <Link href="/kamerleden">
          <Users size={16} aria-hidden="true" />
          Kamerleden
        </Link>
        <Link href="/fracties">Fracties</Link>
        <Link href="/verslag">
          <Radio size={16} aria-hidden="true" />
          Verslag
        </Link>
        <Link href="/search">
          <Search size={16} aria-hidden="true" />
          Zoeken
        </Link>
        <Link href="/dashboard">
          <LayoutDashboard size={16} aria-hidden="true" />
          Mijn kompas
        </Link>
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
