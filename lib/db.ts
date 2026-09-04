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
 * Sinds de uitbreiding met Document/Besluit/Stemming/Toezegging staan ook
 * kamerbrieven, stemmingen en toezeggingen in dit model. Nog niet
 * gesynchroniseerd (blijft op lib/tk.ts / de live API): Verslag, en alle
 * lijst-pagina's die nog niet zijn omgebouwd (zie project-statusdocument).
 */

import { createClient } from './supabase/server';
import { formatDate, type MonitorItem } from './tk';

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

// ─── Documenten (kamerbrieven) ────────────────────────────────────────────────

export interface DbDocument {
  id: string;
  soort: string | null;
  titel: string | null;
  onderwerp: string | null;
  alias: string | null;
  datum: string | null;
  status: string | null;
  vergaderjaar: string | null;
  volgnummer: number | null;
  nummer: string | null;
  aanhangselnummer: string | null;
  kamerstukdossier_id: string | null;
  verwijderd: boolean;
}

/** Kamerbrieven (Document met Soort die "Brief" bevat), nieuwste eerst */
export async function getKamerbrievenDb(opts?: { search?: string; limit?: number }): Promise<DbDocument[]> {
  const supabase = await createClient();
  let query = supabase
    .from('tk_documenten')
    .select('*')
    .eq('verwijderd', false)
    .ilike('soort', '%Brief%')
    .order('datum', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 30);

  if (opts?.search) {
    const q = opts.search.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(`titel.ilike.%${q}%,onderwerp.ilike.%${q}%`);
  }

  const { data } = await query.returns<DbDocument[]>();
  return data ?? [];
}

/** Eén document (kamerbrief) op id */
export async function getKamerbriefDb(id: string): Promise<DbDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('tk_documenten').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as DbDocument;
}

/** Zet een DbDocument om naar de generieke MonitorItem-kaartvorm (voor list/detail UI) */
export function documentDbToMonitorItem(doc: DbDocument): MonitorItem {
  return {
    kind: 'kamerbrief',
    id: doc.id,
    eyebrow: doc.soort ?? 'Document',
    title: doc.titel ?? doc.onderwerp ?? doc.soort ?? 'Document',
    date: formatDate(doc.datum ?? undefined),
    status: doc.status ?? undefined,
    description: doc.onderwerp ?? undefined,
    meta: {
      Id: doc.id,
      Soort: doc.soort,
      Titel: doc.titel,
      Onderwerp: doc.onderwerp,
      Alias: doc.alias,
      Datum: doc.datum,
      Status: doc.status,
      Vergaderjaar: doc.vergaderjaar,
      Volgnummer: doc.volgnummer,
      Nummer: doc.nummer,
      Aanhangselnummer: doc.aanhangselnummer,
    },
  };
}

// ─── Besluiten + Stemmingen ────────────────────────────────────────────────────

export interface DbBesluit {
  id: string;
  soort: string | null;
  status: string | null;
  opmerking: string | null;
  tekst: string | null;
  gewijzigd_op: string | null;
  verwijderd: boolean;
}

export interface DbStemming {
  id: string;
  besluit_id: string;
  soort: string | null;
  vergissing: boolean;
  fractie_grootte: number | null;
  fractie: DbFractie | null;
}

export interface VoteSummaryDb {
  besluit: DbBesluit;
  zaak: DbZaak | null;
  stemmingen: DbStemming[];
}

interface BesluitZaakRow {
  besluit_id: string;
  zaak: DbZaak | null;
}

interface StemmingRow {
  id: string;
  besluit_id: string;
  soort: string | null;
  vergissing: boolean;
  fractie_grootte: number | null;
  fractie: DbFractie | null;
}

/** Besluiten met hun Stemmingen en onderliggende Zaak (voor titel/datum) */
export async function getBesluitenMetStemmingenDb(opts?: {
  limit?: number;
  besluitId?: string;
}): Promise<VoteSummaryDb[]> {
  const supabase = await createClient();

  let besluitQuery = supabase.from('tk_besluiten').select('*').eq('verwijderd', false);
  besluitQuery = opts?.besluitId
    ? besluitQuery.eq('id', opts.besluitId)
    : besluitQuery.order('gewijzigd_op', { ascending: false, nullsFirst: false }).limit(opts?.limit ?? 25);

  const { data: besluitenData } = await besluitQuery.returns<DbBesluit[]>();
  const besluiten = besluitenData ?? [];
  if (besluiten.length === 0) return [];

  const besluitIds = besluiten.map((b) => b.id);

  const [{ data: zaakLinks }, { data: stemmingRows }] = await Promise.all([
    supabase
      .from('tk_besluit_zaken')
      .select('besluit_id, zaak:tk_zaken(*)')
      .in('besluit_id', besluitIds)
      .returns<BesluitZaakRow[]>(),
    supabase
      .from('tk_stemmingen')
      .select('id, besluit_id, soort, vergissing, fractie_grootte, fractie:tk_fracties(*)')
      .in('besluit_id', besluitIds)
      .eq('verwijderd', false)
      .returns<StemmingRow[]>(),
  ]);

  const zaakByBesluit = new Map<string, DbZaak>();
  for (const row of zaakLinks ?? []) {
    if (row.zaak && !row.zaak.verwijderd && !zaakByBesluit.has(row.besluit_id)) {
      zaakByBesluit.set(row.besluit_id, row.zaak);
    }
  }

  const stemmingenByBesluit = new Map<string, DbStemming[]>();
  for (const row of stemmingRows ?? []) {
    const list = stemmingenByBesluit.get(row.besluit_id) ?? [];
    list.push(row);
    stemmingenByBesluit.set(row.besluit_id, list);
  }

  const results = besluiten
    .map((besluit) => ({
      besluit,
      zaak: zaakByBesluit.get(besluit.id) ?? null,
      stemmingen: stemmingenByBesluit.get(besluit.id) ?? [],
    }))
    .filter((r) => r.stemmingen.length > 0);

  if (!opts?.besluitId) {
    results.sort(
      (a, b) =>
        new Date(b.zaak?.gestart_op ?? b.besluit.gewijzigd_op ?? 0).getTime() -
        new Date(a.zaak?.gestart_op ?? a.besluit.gewijzigd_op ?? 0).getTime()
    );
  }

  return results;
}

/** Uniforme kaart-vorm voor een stemming, zelfde vorm als VoteSummary in lib/tk.ts */
export function besluitDbToVoteSummary(entry: VoteSummaryDb): {
  id: string;
  title: string;
  date: string;
  result: string;
  voor: number;
  tegen: number;
  onthouden: number;
  total: number;
  lines: { faction: string; vote: string }[];
  meta: Record<string, unknown>;
} {
  const { besluit, zaak, stemmingen } = entry;
  let voor = 0;
  let tegen = 0;
  let onthouden = 0;
  const lines = stemmingen.map((s) => {
    const soort = (s.soort ?? '').toLowerCase();
    const weight = s.fractie_grootte ?? 1;
    if (soort.includes('voor')) voor += weight;
    else if (soort.includes('tegen')) tegen += weight;
    else onthouden += weight;
    return { faction: s.fractie?.afkorting ?? s.fractie?.naam_nl ?? 'Onbekend', vote: s.soort ?? 'Onbekend' };
  });
  const total = voor + tegen + onthouden;
  const result = besluit.status ?? besluit.soort ?? (voor >= tegen ? 'Aangenomen' : 'Verworpen');

  return {
    id: besluit.id,
    title: zaak?.titel ?? zaak?.onderwerp ?? besluit.tekst ?? 'Stemming',
    date: formatDate(zaak?.gestart_op ?? besluit.gewijzigd_op ?? undefined),
    result,
    voor,
    tegen,
    onthouden,
    total,
    lines,
    meta: { besluitId: besluit.id, zaakId: zaak?.id, zaak: zaak?.titel, opmerking: besluit.opmerking },
  };
}

// ─── Toezeggingen ─────────────────────────────────────────────────────────────

export interface DbToezegging {
  id: string;
  nummer: string | null;
  tekst: string | null;
  status: string | null;
  aanmaakdatum: string | null;
  datum_nakoming: string | null;
  ministerie: string | null;
  bewindspersoon_naam: string | null;
  activiteit_nummer: string | null;
  verwijderd: boolean;
}

export async function getToezeggingenDb(opts?: { limit?: number }): Promise<DbToezegging[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_toezeggingen')
    .select('*')
    .eq('verwijderd', false)
    .order('aanmaakdatum', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 6)
    .returns<DbToezegging[]>();
  return data ?? [];
}

function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function toezeggingDbToMonitorItem(t: DbToezegging): MonitorItem {
  return {
    kind: 'activiteit',
    id: t.id,
    eyebrow: 'Toezegging',
    title: t.tekst ? truncateText(t.tekst, 140) : 'Toezegging',
    date: formatDate(t.aanmaakdatum ?? undefined),
    status: t.status ?? undefined,
    description: [t.bewindspersoon_naam, t.ministerie].filter(Boolean).join(' · ') || undefined,
    meta: {
      Id: t.id,
      Nummer: t.nummer,
      Status: t.status,
      Aanmaakdatum: t.aanmaakdatum,
      DatumNakoming: t.datum_nakoming,
      Ministerie: t.ministerie,
      BewindspersoonNaam: t.bewindspersoon_naam,
      ActiviteitNummer: t.activiteit_nummer,
    },
  };
}
