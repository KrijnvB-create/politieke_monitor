import Link from "next/link";
import { LoginButtons } from "@/components/login-buttons";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Account</p>
        <h1>Log in om dossiers en activiteiten te bewaren.</h1>
        <p>
          Gebruik Google of GitHub. Daarna kun je Tweede Kamer-items opslaan en later terugvinden op je persoonlijke pagina.
        </p>
        <LoginButtons />
        <Link className="text-link" href="/">
          Terug naar monitor
        </Link>
      </section>
    </main>
  );
}
