/**
 * lib/db.ts
 * Datatoegang voor het gesynchroniseerde Kamerkompas-datamodel in Supabase
 * (tabellen `tk_*`, gevuld door de `sync-tweede-kamer` Edge Function).
 *
 * Dit is de "gelinkte" laag: in plaats van losse live-calls naar de Tweede
 * Kamer OData API te doen (zie lib/tk.ts), lezen deze functies uit de eigen
 * relationele tabellen, zodat een debat écht zijn moties en deelnemers kan
 * tonen en een Kamerlid écht zijn debatten, commissies en moties.
 *
 * Nog niet in dit datamodel gesynchroniseerd (blijven op lib/tk.ts / de live
 * API): Document (kamerbrieven), Besluit/Stemming (stemmingen), Toezegging,
 * Verslag. Die pagina's zijn dus bewust ongemoeid gelaten.
 */

import { createClient } from './supabase/server';

// ─── Rijtypes (spiegelen public schema in tk_data_model migration) ──────────

export interface DbPersoon {
  id: string;
  achternaam: string | null;
  voornamen: string | null;
  tussenvoegsel: string | null;
  roepnaam: string | null;
  initialen: string | null;
  titels: string | null;
  functie: string | null;
  geslacht: string | null;
  geboortedatum: string | null;
  overlijdensdatum: string | null;
  verwijderd: boolean;
}

export interface DbFractie {
  id: string;
  naam_nl: string | null;
  naam_en: string | null;
  afkorting: string | null;
  aantal_zetels: number | null;
  aantal_stemmen: number | null;
  datum_actief: string | null;
  datum_inactief: string | null;
  verwijderd: boolean;
}

export interface DbCommissie {
  id: string;
  naam_nl: string | null;
  naam_en: string | null;
  afkorting: string | null;
  soort: string | null;
  verwijderd: boolean;
}

export interface DbZaak {
  id: string;
  soort: string | null;
  titel: string | null;
  onderwerp: string | null;
  status: string | null;
  huidige_behandelstatus: string | null;
  kabinetsappreciatie: string | null;
  gestart_op: string | null;
  kamerstukdossier_id: string | null;
  verwijderd: boolean;
}

export interface DbActiviteit {
  id: string;
  soort: string | null;
  nummer: string | null;
  onderwerp: string | null;
  aanvangstijd: string | null;
  eindtijd: string | null;
  locatie: string | null;
  status: string | null;
  voortouwsamenvatting: string | null;
  voortouwcommissie_id: string | null;
  verwijderd: boolean;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

export function persoonNaamDb(p: Pick<DbPersoon, 'roepnaam' | 'voornamen' | 'tussenvoegsel' | 'achternaam'>): string {
  const parts = [p.roepnaam ?? p.voornamen, p.tussenvoegsel, p.achternaam].filter(Boolean);
  return parts.join(' ');
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ─── Kamerlid ────────────────────────────────────────────────────────────────

export interface PersoonMetFractie extends DbPersoon {
  fractie: DbFractie | null;
}

/** Kamerlid + huidige fractie (via tk_fractie_lidmaatschappen) */
export async function getPersoonDb(id: string): Promise<PersoonMetFractie | null> {
  const supabase = await createClient();
  const { data: persoon, error } = await supabase
    .from('tk_personen')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !persoon) return null;

  const today = todayIso();
  const { data: lidmaatschap } = await supabase
    .from('tk_fractie_lidmaatschappen')
    .select('van, tot_en_met, fractie:tk_fracties(*)')
    .eq('persoon_id', id)
    .eq('verwijderd', false)
    .lte('van', today)
    .or(`tot_en_met.is.null,tot_en_met.gte.${today}`)
    .order('van', { ascending: false })
    .limit(1);

  const fractie = (lidmaatschap?.[0]?.fractie as unknown as DbFractie | null) ?? null;

  return { ...(persoon as DbPersoon), fractie };
}

interface ZaakActorRow {
  relatie: string | null;
  zaak: DbZaak | null;
}

/** Moties/zaken waar deze persoon als indiener/ondertekenaar/etc. bij betrokken is */
export async function getZakenVanPersoonDb(
  persoonId: string,
  opts?: { limit?: number }
): Promise<(DbZaak & { relatie: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_zaak_actoren')
    .select('relatie, zaak:tk_zaken(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .returns<ZaakActorRow[]>();

  const rows = (data ?? [])
    .filter((r): r is ZaakActorRow & { zaak: DbZaak } => !!r.zaak && !r.zaak.verwijderd)
    .map((r) => ({ ...r.zaak, relatie: r.relatie }));

  const deduped = uniqueById(rows);
  deduped.sort((a, b) => new Date(b.gestart_op ?? 0).getTime() - new Date(a.gestart_op ?? 0).getTime());
  return deduped.slice(0, opts?.limit ?? 20);
}

interface ActiviteitDeelnemerRow {
  relatie: string | null;
  functie: string | null;
  activiteit: DbActiviteit | null;
}

/** Debatten/vergaderingen waar deze persoon als deelnemer bij staat geregistreerd */
export async function getActiviteitenVanPersoonDb(
  persoonId: string,
  opts?: { limit?: number }
): Promise<(DbActiviteit & { relatie: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_activiteit_deelnemers')
    .select('relatie, functie, activiteit:tk_activiteiten(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .returns<ActiviteitDeelnemerRow[]>();

  const rows = (data ?? [])
    .filter((r): r is ActiviteitDeelnemerRow & { activiteit: DbActiviteit } => !!r.activiteit && !r.activiteit.verwijderd)
    .map((r) => ({ ...r.activiteit, relatie: r.relatie }));

  const deduped = uniqueById(rows);
  deduped.sort((a, b) => new Date(b.aanvangstijd ?? 0).getTime() - new Date(a.aanvangstijd ?? 0).getTime());
  return deduped.slice(0, opts?.limit ?? 12);
}

interface CommissieLidRow {
  functie: string | null;
  tot_en_met: string | null;
  commissie: DbCommissie | null;
}

/** Commissies waar deze persoon momenteel (nog) lid van is */
export async function getCommissiesVanPersoonDb(
  persoonId: string
): Promise<(DbCommissie & { functie: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_commissie_lidmaatschappen')
    .select('functie, tot_en_met, commissie:tk_commissies(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .is('tot_en_met', null)
    .returns<CommissieLidRow[]>();

  const rows = (data ?? [])
    .filter((r): r is CommissieLidRow & { commissie: DbCommissie } => !!r.commissie && !r.commissie.verwijderd)
    .map((r) => ({ ...r.commissie, functie: r.functie }));

  return uniqueById(rows).sort((a, b) => (a.naam_nl ?? '').localeCompare(b.naam_nl ?? ''));
}

// ─── Activiteit / debat ──────────────────────────────────────────────────────

export interface ActiviteitDeelnemer {
  persoon: DbPersoon | null;
  fractie: DbFractie | null;
  commissie: DbCommissie | null;
  relatie: string | null;
  functie: string | null;
  actor_naam: string | null;
  actor_fractie: string | null;
  volgorde: number | null;
}

export interface ActiviteitDetail {
  activiteit: DbActiviteit;
  voortouwcommissie: DbCommissie | null;
  moties: DbZaak[];
  overigeZaken: DbZaak[];
  deelnemers: ActiviteitDeelnemer[];
}

/** Eén debat/activiteit compleet met gelinkte zaken (moties) en deelnemers */
export async function getActiviteitDb(id: string): Promise<ActiviteitDetail | null> {
  const supabase = await createClient();

  const { data: activiteitRow, error } = await supabase
    .from('tk_activiteiten')
    .select('*, voortouwcommissie:tk_commissies(*)')
    .eq('id', id)
    .maybeSingle();

  if (error || !activiteitRow) return null;

  const { voortouwcommissie, ...activiteit } = activiteitRow as DbActiviteit & {
    voortouwcommissie: DbCommissie | null;
  };

  const [{ data: zaakLinks }, { data: deelnemerRows }] = await Promise.all([
    supabase.from('tk_activiteit_zaken').select('zaak:tk_zaken(*)').eq('activiteit_id', id).returns<{ zaak: DbZaak | null }[]>(),
    supabase
      .from('tk_activiteit_deelnemers')
      .select('relatie, functie, actor_naam, actor_fractie, volgorde, persoon:tk_personen(*), fractie:tk_fracties(*), commissie:tk_commissies(*)')
      .eq('activiteit_id', id)
      .eq('verwijderd', false)
      .order('volgorde', { ascending: true })
      .returns<ActiviteitDeelnemer[]>(),
  ]);

  const zaken = uniqueById(
    (zaakLinks ?? [])
      .map((r) => r.zaak)
      .filter((z): z is DbZaak => !!z && !z.verwijderd)
  );
  const moties = zaken.filter((z) => z.soort === 'Motie');
  const overigeZaken = zaken.filter((z) => z.soort !== 'Motie');

  // Dedupe deelnemers op persoon (dezelfde persoon kan meerdere keren voorkomen,
  // bv. als spreker én als aanvrager), val terug op bewindspersonen zonder Persoon-record.
  const seenPersonIds = new Set<string>();
  const deelnemers = (deelnemerRows ?? []).filter((d) => {
    if (!d.persoon) return true;
    if (seenPersonIds.has(d.persoon.id)) return false;
    seenPersonIds.add(d.persoon.id);
    return true;
  });

  return { activiteit: activiteit as DbActiviteit, voortouwcommissie, moties, overigeZaken, deelnemers };
}

// ─── Commissie ───────────────────────────────────────────────────────────────

export interface CommissieDetail {
  commissie: DbCommissie;
  leden: { persoon: DbPersoon; functie: string | null }[];
}

/** Eén commissie compleet met haar huidige leden */
export async function getCommissieDb(id: string): Promise<CommissieDetail | null> {
  const supabase = await createClient();

  const { data: commissie, error } = await supabase
    .from('tk_commissies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !commissie) return null;

  const { data: ledenRows } = await supabase
    .from('tk_commissie_lidmaatschappen')
    .select('functie, persoon:tk_personen(*)')
    .eq('commissie_id', id)
    .eq('verwijderd', false)
    .is('tot_en_met', null)
    .returns<{ functie: string | null; persoon: DbPersoon | null }[]>();

  const seen = new Set<string>();
  const leden = (ledenRows ?? [])
    .filter((r): r is { functie: string | null; persoon: DbPersoon } => !!r.persoon && !r.persoon.verwijderd)
    .filter((r) => {
      if (seen.has(r.persoon.id)) return false;
      seen.add(r.persoon.id);
      return true;
    })
    .sort((a, b) => (a.persoon.achternaam ?? '').localeCompare(b.persoon.achternaam ?? ''));

  return { commissie: commissie as DbCommissie, leden };
}
