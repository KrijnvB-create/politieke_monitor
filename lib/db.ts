/**
 * lib/db.ts
 * Datatoegang voor het gesynchroniseerde Kamerkompas-datamodel in Supabase
 * (tabellen `tk_*`, gevuld door de `sync-tweede-kamer` Edge Function).
 *
 * Dit is de "gelinkte" laag: in plaats van losse live-calls naar de Tweede
 * Kamer OData API te doen (zie lib/tk.ts), lezen deze functies uit de eigen
 * relationele tabellen, zodat een debat echt zijn moties en deelnemers kan
 * tonen en een Kamerlid echt zijn debatten, commissies en moties.
 *
 * Sinds de uitbreiding met Document/Besluit/Stemming/Toezegging staan ook
 * kamerbrieven, stemmingen en toezeggingen in dit model. Nog niet
 * gesynchroniseerd (blijft op lib/tk.ts / de live API): Verslag, en alle
 * lijst-pagina's die nog niet zijn omgebouwd (zie project-statusdocument).
 */

import { createClient } from './supabase/server';
import { formatDate, type MonitorItem } from './tk';

// --- Rijtypes (spiegelen public schema in tk_data_model migration) ----------

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

// --- Utils -------------------------------------------------------------------

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

// --- Kamerlid ----------------------------------------------------------------

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
): Promise<(DbActiviteit & { relatie: string | null; functie: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_activiteit_deelnemers')
    .select('relatie, functie, activiteit:tk_activiteiten(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .returns<ActiviteitDeelnemerRow[]>();

  const rows = (data ?? [])
    .filter((r): r is ActiviteitDeelnemerRow & { activiteit: DbActiviteit } => !!r.activiteit && !r.activiteit.verwijderd)
    .map((r) => ({ ...r.activiteit, relatie: r.relatie, functie: r.functie }));

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

// --- Activiteit / debat ------------------------------------------------------

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

export interface MotieUitslag {
  besluitId: string;
  result: string;
  voor: number;
  tegen: number;
  onthouden: number;
}

export interface MotieMetUitslag extends DbZaak {
  uitslag: MotieUitslag | null;
}

export interface ActiviteitDetail {
  activiteit: DbActiviteit;
  voortouwcommissie: DbCommissie | null;
  moties: MotieMetUitslag[];
  overigeZaken: DbZaak[];
  deelnemers: ActiviteitDeelnemer[];
}

/** Een debat/activiteit compleet met gelinkte zaken (moties, met stemuitslag
 * zodra bekend) en deelnemers. Moties komen zowel via de rechtstreekse
 * Activiteit->Zaak-koppeling (vaak leeg) als via Agendapunt->Zaak (de route
 * die de Tweede Kamer zelf gebruikt en veel completer is). */
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

  const [{ data: zaakLinks }, { data: agendapuntRows }, { data: deelnemerRows }] = await Promise.all([
    supabase.from('tk_activiteit_zaken').select('zaak:tk_zaken(*)').eq('activiteit_id', id).returns<{ zaak: DbZaak | null }[]>(),
    supabase.from('tk_agendapunten').select('id').eq('activiteit_id', id).returns<{ id: string }[]>(),
    supabase
      .from('tk_activiteit_deelnemers')
      .select('relatie, functie, actor_naam, actor_fractie, volgorde, persoon:tk_personen(*), fractie:tk_fracties(*), commissie:tk_commissies(*)')
      .eq('activiteit_id', id)
      .eq('verwijderd', false)
      .order('volgorde', { ascending: true })
      .returns<ActiviteitDeelnemer[]>(),
  ]);

  const agendapuntIds = (agendapuntRows ?? []).map((r) => r.id);
  const { data: agendapuntZaakLinks } = agendapuntIds.length
    ? await supabase
        .from('tk_agendapunt_zaken')
        .select('zaak:tk_zaken(*)')
        .in('agendapunt_id', agendapuntIds)
        .returns<{ zaak: DbZaak | null }[]>()
    : { data: [] as { zaak: DbZaak | null }[] };

  const zaken = uniqueById(
    [...(zaakLinks ?? []), ...(agendapuntZaakLinks ?? [])]
      .map((r) => r.zaak)
      .filter((z): z is DbZaak => !!z && !z.verwijderd)
  );
  const motieZaken = zaken.filter((z) => z.soort === 'Motie');
  const overigeZaken = zaken.filter((z) => z.soort !== 'Motie');

  // Stemuitslag per motie ophalen via tk_besluit_zaken -> tk_besluiten -> tk_stemmingen.
  const motieIds = motieZaken.map((z) => z.id);
  const uitslagByMotie = new Map<string, MotieUitslag>();
  if (motieIds.length > 0) {
    const { data: besluitZaakRows } = await supabase
      .from('tk_besluit_zaken')
      .select('zaak_id, besluit:tk_besluiten(*)')
      .in('zaak_id', motieIds)
      .returns<{ zaak_id: string; besluit: DbBesluit | null }[]>();

    const besluitIds = uniqueById(
      (besluitZaakRows ?? []).map((r) => r.besluit).filter((b): b is DbBesluit => !!b && !b.verwijderd)
    ).map((b) => b.id);

    const { data: stemmingRows } = besluitIds.length
      ? await supabase
          .from('tk_stemmingen')
          .select('besluit_id, soort, fractie_grootte')
          .in('besluit_id', besluitIds)
          .eq('verwijderd', false)
          .returns<{ besluit_id: string; soort: string | null; fractie_grootte: number | null }[]>()
      : { data: [] as { besluit_id: string; soort: string | null; fractie_grootte: number | null }[] };

    const stemmingenByBesluit = new Map<string, { soort: string | null; fractie_grootte: number | null }[]>();
    for (const s of stemmingRows ?? []) {
      const list = stemmingenByBesluit.get(s.besluit_id) ?? [];
      list.push(s);
      stemmingenByBesluit.set(s.besluit_id, list);
    }

    // Een Besluit is alleen een echte stemuitslag als het Soort een afgeronde
    // stemming beschrijft (niet "Voorstel"/"Besluit"/"Ingediend"/"Stemmen -
    // aangehouden", dat zijn tussenstappen) of als er daadwerkelijk Stemmingen
    // aan hangen. Anders lijkt elke ingediende motie al "gestemd".
    const STEM_RESULT_SOORTEN = new Set(['Stemmen - aangenomen', 'Stemmen - verworpen', 'Stemmen - niet aangenomen']);

    for (const row of besluitZaakRows ?? []) {
      if (!row.besluit || row.besluit.verwijderd) continue;
      const stemmingen = stemmingenByBesluit.get(row.besluit.id) ?? [];
      const isEchteUitslag = stemmingen.length > 0 || STEM_RESULT_SOORTEN.has(row.besluit.soort ?? '');
      if (!isEchteUitslag) continue;
      let voor = 0;
      let tegen = 0;
      let onthouden = 0;
      for (const s of stemmingen) {
        const soort = (s.soort ?? '').toLowerCase();
        const weight = s.fractie_grootte ?? 1;
        if (soort.includes('voor')) voor += weight;
        else if (soort.includes('tegen')) tegen += weight;
        else onthouden += weight;
      }
      // Bij een bestaande entry (motie kan aan meerdere besluiten hangen) de
      // meest informatieve houden: er is een uitslag zodra er stemmen zijn.
      const existing = uitslagByMotie.get(row.zaak_id);
      if (existing && existing.voor + existing.tegen + existing.onthouden > 0 && stemmingen.length === 0) continue;
      const soortLabel = (row.besluit.soort ?? '').toLowerCase().startsWith('stemmen -')
        ? row.besluit.soort!.slice(row.besluit.soort!.indexOf('-') + 1).trim().replace(/^./, (c) => c.toUpperCase())
        : null;
      uitslagByMotie.set(row.zaak_id, {
        besluitId: row.besluit.id,
        result: soortLabel ?? (voor + tegen > 0 ? (voor >= tegen ? 'Aangenomen' : 'Verworpen') : (row.besluit.status ?? 'Onbekend')),
        voor,
        tegen,
        onthouden,
      });
    }
  }

  const moties: MotieMetUitslag[] = motieZaken.map((z) => ({ ...z, uitslag: uitslagByMotie.get(z.id) ?? null }));

  // Dedupe deelnemers op persoon (dezelfde persoon kan meerdere keren voorkomen,
  // bv. als spreker en als aanvrager), val terug op bewindspersonen zonder Persoon-record.
  const seenPersonIds = new Set<string>();
  const deelnemers = (deelnemerRows ?? []).filter((d) => {
    if (!d.persoon) return true;
    if (seenPersonIds.has(d.persoon.id)) return false;
    seenPersonIds.add(d.persoon.id);
    return true;
  });

  return { activiteit: activiteit as DbActiviteit, voortouwcommissie, moties, overigeZaken, deelnemers };
}

// --- Commissie ---------------------------------------------------------------

export interface CommissieDetail {
  commissie: DbCommissie;
  leden: { persoon: DbPersoon; functie: string | null }[];
}

/** Een commissie compleet met haar huidige leden */
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

// --- Documenten (kamerbrieven) ------------------------------------------------

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

/** Een document (kamerbrief) op id */
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

// --- Besluiten + Stemmingen ----------------------------------------------------

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

  // Alleen Besluit-records die daadwerkelijk een stemuitslag hebben: andere
  // "Stemmen - ..." varianten (aangehouden, ingetrokken, zonder stemming
  // aannemen) hebben geen tk_stemmingen-rijen en overheersen anders de meest
  // recent gewijzigde besluiten, waardoor deze lijst leeg leek.
  let besluitQuery = supabase.from('tk_besluiten').select('*').eq('verwijderd', false);
  besluitQuery = opts?.besluitId
    ? besluitQuery.eq('id', opts.besluitId)
    : besluitQuery
        .in('soort', ['Stemmen - aangenomen', 'Stemmen - verworpen', 'Stemmen - niet aangenomen'])
        .order('gewijzigd_op', { ascending: false, nullsFirst: false })
        .limit(opts?.limit ?? 25);

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

// --- Toezeggingen -------------------------------------------------------------

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
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

export function toezeggingDbToMonitorItem(t: DbToezegging): MonitorItem {
  return {
    kind: 'activiteit',
    id: t.id,
    eyebrow: 'Toezegging',
    title: t.tekst ? truncateText(t.tekst, 140) : 'Toezegging',
    date: formatDate(t.aanmaakdatum ?? undefined),
    status: t.status ?? undefined,
    description: [t.bewindspersoon_naam, t.ministerie].filter(Boolean).join(' - ') || undefined,
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

// --- Debat-detailpagina: AI-samenvatting, toezeggingen en gerelateerde debatten --

export interface DbSamenvatting {
  activiteit_id: string;
  korte_samenvatting: string | null;
  uitgebreide_analyse: string | null;
  onderwerpen: string[] | null;
  model: string | null;
  gegenereerd_op: string | null;
}

/** AI-samenvatting van het woordelijk verslag voor deze activiteit, indien al gegenereerd. */
export async function getSamenvattingVoorActiviteitDb(activiteitId: string): Promise<DbSamenvatting | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_debat_samenvattingen')
    .select('activiteit_id, korte_samenvatting, uitgebreide_analyse, onderwerpen, model, gegenereerd_op')
    .eq('activiteit_id', activiteitId)
    .maybeSingle();
  return (data as DbSamenvatting | null) ?? null;
}

/** Toezeggingen die bij deze activiteit horen (gekoppeld op het Kamer-nummer van de activiteit). */
export async function getToezeggingenVoorActiviteitDb(activiteitNummer: string | null): Promise<DbToezegging[]> {
  if (!activiteitNummer) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_toezeggingen')
    .select('*')
    .eq('activiteit_nummer', activiteitNummer)
    .eq('verwijderd', false)
    .order('aanmaakdatum', { ascending: false, nullsFirst: false })
    .returns<DbToezegging[]>();
  return data ?? [];
}

interface ActiviteitZaakRow {
  activiteit: DbActiviteit | null;
}

/** Eerdere activiteiten die zaken delen met hetzelfde dossier als deze activiteit. */
export async function getGerelateerdeActiviteitenDb(
  dossierId: string,
  excludeActiviteitId: string,
  opts?: { limit?: number }
): Promise<DbActiviteit[]> {
  const supabase = await createClient();

  const { data: zaakRows } = await supabase
    .from('tk_zaken')
    .select('id')
    .eq('kamerstukdossier_id', dossierId)
    .eq('verwijderd', false)
    .returns<{ id: string }[]>();

  const zaakIds = (zaakRows ?? []).map((z) => z.id);
  if (zaakIds.length === 0) return [];

  const { data } = await supabase
    .from('tk_activiteit_zaken')
    .select('activiteit:tk_activiteiten(*)')
    .in('zaak_id', zaakIds)
    .returns<ActiviteitZaakRow[]>();

  const activiteiten = uniqueById(
    (data ?? [])
      .map((r) => r.activiteit)
      .filter((a): a is DbActiviteit => !!a && !a.verwijderd && a.id !== excludeActiviteitId)
  );

  activiteiten.sort((a, b) => new Date(b.aanvangstijd ?? 0).getTime() - new Date(a.aanvangstijd ?? 0).getTime());
  return activiteiten.slice(0, opts?.limit ?? 3);
}


// --- Kamerbrieven-overzicht: afzender + dossier-verrijking ------------------

/** Documentsoorten die op de Kamerbrieven-pagina getoond worden (brieven van
 * het kabinet aan de Kamer, plus de directe reacties/antwoorden daarop). Een
 * los "Beslisnota"-type bestaat niet in de Tweede Kamer-data; de vier reeele
 * meest voorkomende soorten in deze categorie worden hier gebruikt. */
const KAMERBRIEF_SOORTEN = [
  'Brief regering',
  'Antwoord schriftelijke vragen',
  'Antwoord schriftelijke vragen (nader)',
  'Nota n.a.v. het (nader/tweede nader/enz.) verslag',
  'Mededeling (uitstel antwoord)',
];

export interface DbKamerstukdossierLite {
  id: string;
  titel: string | null;
  nummer: number | null;
}

export interface KamerbriefOverviewRow {
  doc: DbDocument;
  afzender: string | null;
  dossier: DbKamerstukdossierLite | null;
}

/** Zet "minister van X" / "staatssecretaris van X" om naar "Ministerie van X".
 * Andere functies (griffier, commissievoorzitter, ...) leveren geen afzender op:
 * die horen niet bij het "welk ministerie stuurde dit"-filter. */
function ministerieLabel(functie: string | null): string | null {
  if (!functie) return null;
  const match = /^(minister|staatssecretaris)\s+van\s+(.+)$/i.exec(functie.trim());
  if (!match) return null;
  return `Ministerie van ${match[2]}`;
}

/** Kamerbrieven (+ antwoorden/nota's/uitstelberichten) met afzender-ministerie
 * en gekoppeld dossier erbij, voor de Kamerbrieven-overzichtspagina. */
export async function getKamerbrievenOverviewDb(opts?: { limit?: number }): Promise<KamerbriefOverviewRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tk_documenten')
    .select('*')
    .eq('verwijderd', false)
    .in('soort', KAMERBRIEF_SOORTEN)
    .order('datum', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 400)
    .returns<DbDocument[]>();

  const documenten = data ?? [];
  if (documenten.length === 0) return [];

  const documentIds = documenten.map((d) => d.id);
  const dossierIds = Array.from(
    new Set(documenten.map((d) => d.kamerstukdossier_id).filter((id): id is string => !!id))
  );

  const [actorResult, dossierResult] = await Promise.all([
    supabase
      .from('tk_document_actoren')
      .select('document_id, functie')
      .in('document_id', documentIds)
      .eq('relatie', 'Eerste ondertekenaar')
      .eq('verwijderd', false)
      .returns<{ document_id: string; functie: string | null }[]>(),
    dossierIds.length
      ? supabase
          .from('tk_kamerstukdossiers')
          .select('id, titel, nummer')
          .in('id', dossierIds)
          .returns<DbKamerstukdossierLite[]>()
      : Promise.resolve({ data: [] as DbKamerstukdossierLite[] }),
  ]);

  const afzenderByDoc = new Map<string, string>();
  for (const row of actorResult.data ?? []) {
    const label = ministerieLabel(row.functie);
    if (label) afzenderByDoc.set(row.document_id, label);
  }

  const dossierById = new Map<string, DbKamerstukdossierLite>();
  for (const row of dossierResult.data ?? []) {
    dossierById.set(row.id, row);
  }

  return documenten.map((doc) => ({
    doc,
    afzender: afzenderByDoc.get(doc.id) ?? null,
    dossier: doc.kamerstukdossier_id ? dossierById.get(doc.kamerstukdossier_id) ?? null : null,
  }));
}


// --- Dossiers-overzicht -----------------------------------------------------

export interface DbDossierOverview {
  id: string;
  titel: string | null;
  citeertitel: string | null;
  nummer: number | null;
  afgesloten: boolean;
  vergaderjaar: string | null;
  gewijzigd_op: string | null;
  docCount: number;
  debatCount: number;
  commissie: string | null;
  isInitiatiefnota: boolean;
  nextAgenda: { datum: string; titel: string } | null;
}

interface DossiersOverviewRpcRow {
  dossier_id: string;
  doc_count: number;
  debat_count: number;
  commissie: string | null;
  is_initiatiefnota: boolean;
  next_agenda_datum: string | null;
  next_agenda_titel: string | null;
}

/** Dossiers met afgeleide statistieken (documenten, debatten, commissie, eerstvolgend
 * agendapunt) voor de Dossiers-overzichtspagina. Beperkt tot de meest recent gewijzigde
 * dossiers -- er zijn er in totaal duizenden, maar alleen de laatste ~180 dagen zijn ook
 * daadwerkelijk gesynchroniseerd (zie sync-tweede-kamer WINDOW_DAYS).
 *
 * De statistieken zelf komen uit de `dossiers_overview` Postgres-functie (zie migratie
 * add_dossiers_overview_function) in plaats van hier los per tabel te tellen: voor 400
 * dossiers lopen de onderliggende documenten/zaken/activiteiten-aantallen in de duizenden,
 * en de Supabase REST-laag knipt elk los .select() resultaat stil af op 1000 rijen. Tellen
 * in de database voorkomt die afkap. */
export async function getDossiersOverviewDb(opts?: { limit?: number }): Promise<DbDossierOverview[]> {
  const supabase = await createClient();
  const limit = opts?.limit ?? 400;

  const { data: dossiers } = await supabase
    .from('tk_kamerstukdossiers')
    .select('id, titel, citeertitel, nummer, afgesloten, vergaderjaar, gewijzigd_op')
    .eq('verwijderd', false)
    .order('gewijzigd_op', { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<
      { id: string; titel: string | null; citeertitel: string | null; nummer: number | null; afgesloten: boolean; vergaderjaar: string | null; gewijzigd_op: string | null }[]
    >();

  if (!dossiers || dossiers.length === 0) return [];
  const dossierIds = dossiers.map((d) => d.id);

  const { data: statsRowsRaw } = await supabase.rpc('dossiers_overview', { p_dossier_ids: dossierIds });
  const statsRows = (statsRowsRaw ?? []) as DossiersOverviewRpcRow[];

  const statsByDossier = new Map(statsRows.map((r) => [r.dossier_id, r]));

  return dossiers.map((d) => {
    const stats = statsByDossier.get(d.id);
    return {
      id: d.id,
      titel: d.titel,
      citeertitel: d.citeertitel,
      nummer: d.nummer,
      afgesloten: d.afgesloten,
      vergaderjaar: d.vergaderjaar,
      gewijzigd_op: d.gewijzigd_op,
      docCount: stats?.doc_count ?? 0,
      debatCount: stats?.debat_count ?? 0,
      commissie: stats?.commissie ?? null,
      isInitiatiefnota: stats?.is_initiatiefnota ?? false,
      nextAgenda:
        stats?.next_agenda_datum && stats.next_agenda_titel
          ? { datum: stats.next_agenda_datum, titel: stats.next_agenda_titel }
          : null,
    };
  });
}


// --- Kamerlid-detailpagina: statistieken + tijdlijn-items -------------------

export interface PersoonTopDossier {
  id: string;
  titel: string | null;
  nummer: number | null;
  count: number;
}

export interface PersoonStats {
  motieTotaal: number;
  motieAangenomen: number;
  motieVerworpen: number;
  vraagTotaal: number;
  amendementTotaal: number;
  amendementAangenomen: number;
  amendementVerworpen: number;
  toezeggingTotaal: number;
  toezeggingOpen: number;
  toezeggingLaat: number;
  debatTotaal: number;
  aankomendTotaal: number;
  fractieMotieTotaal: number;
  fractieMotieAangenomen: number;
  lidSinds: string | null;
  topDossiers: PersoonTopDossier[];
  nextActiviteit: { id: string; onderwerp: string | null; aanvangstijd: string | null; locatie: string | null } | null;
}

interface PersoonStatsRpcRow {
  motie_totaal: number;
  motie_aangenomen: number;
  motie_verworpen: number;
  vraag_totaal: number;
  amendement_totaal: number;
  amendement_aangenomen: number;
  amendement_verworpen: number;
  toezegging_totaal: number;
  toezegging_open: number;
  toezegging_laat: number;
  debat_totaal: number;
  aankomend_totaal: number;
  fractie_motie_totaal: number;
  fractie_motie_aangenomen: number;
  lid_sinds: string | null;
  top_dossiers: PersoonTopDossier[] | null;
  next_activiteit: { id: string; onderwerp: string | null; aanvangstijd: string | null; locatie: string | null } | null;
}

/** Afgeleide statistieken voor de Kamerlid-detailpagina (moties, vragen, toezeggingen,
 * debatten, amendementen, meest actieve dossiers, eerstvolgend optreden). Draait via de
 * `persoon_stats` Postgres-functie omdat de onderliggende tellingen (zaak_actoren,
 * besluit_zaken, activiteit_deelnemers) voor drukke Kamerleden makkelijk honderden rijen
 * beslaan en anders per teller een losse round-trip + de 1000-rijen REST-afkap zouden
 * riskeren -- zie dezelfde afweging bij dossiers_overview. */
export async function getPersoonStatsDb(persoonId: string): Promise<PersoonStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('persoon_stats', { p_persoon_id: persoonId });
  const row = data as PersoonStatsRpcRow | null;
  if (!row) return null;

  return {
    motieTotaal: row.motie_totaal ?? 0,
    motieAangenomen: row.motie_aangenomen ?? 0,
    motieVerworpen: row.motie_verworpen ?? 0,
    vraagTotaal: row.vraag_totaal ?? 0,
    amendementTotaal: row.amendement_totaal ?? 0,
    amendementAangenomen: row.amendement_aangenomen ?? 0,
    amendementVerworpen: row.amendement_verworpen ?? 0,
    toezeggingTotaal: row.toezegging_totaal ?? 0,
    toezeggingOpen: row.toezegging_open ?? 0,
    toezeggingLaat: row.toezegging_laat ?? 0,
    debatTotaal: row.debat_totaal ?? 0,
    aankomendTotaal: row.aankomend_totaal ?? 0,
    fractieMotieTotaal: row.fractie_motie_totaal ?? 0,
    fractieMotieAangenomen: row.fractie_motie_aangenomen ?? 0,
    lidSinds: row.lid_sinds ?? null,
    topDossiers: row.top_dossiers ?? [],
    nextActiviteit: row.next_activiteit?.id ? row.next_activiteit : null,
  };
}

interface ZaakActorZaakRow {
  zaak: DbZaak | null;
}

/** Zaken (indiener/medeindiener) van een persoon, gefilterd op soort, met stemuitslag
 * (via tk_besluit_zaken/tk_besluiten/tk_stemmingen, zelfde logica als getActiviteitDb)
 * en het gekoppelde dossier erbij. Gebruikt voor moties en amendementen op de
 * Kamerlid-detailpagina. */
async function getZakenMetUitslagVanPersoonDb(
  persoonId: string,
  soorten: string[],
  opts?: { limit?: number }
): Promise<(DbZaak & { uitslag: MotieUitslag | null; dossier: DbKamerstukdossierLite | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_zaak_actoren')
    .select('zaak:tk_zaken(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .in('relatie', ['Indiener', 'Medeindiener'])
    .returns<ZaakActorZaakRow[]>();

  const zaken = uniqueById(
    (data ?? [])
      .map((r) => r.zaak)
      .filter((z): z is DbZaak => !!z && !z.verwijderd && soorten.includes(z.soort ?? ''))
  );
  if (zaken.length === 0) return [];

  const zaakIds = zaken.map((z) => z.id);
  const dossierIds = Array.from(
    new Set(zaken.map((z) => z.kamerstukdossier_id).filter((id): id is string => !!id))
  );

  const [{ data: besluitZaakRows }, dossierResult] = await Promise.all([
    supabase
      .from('tk_besluit_zaken')
      .select('zaak_id, besluit:tk_besluiten(*)')
      .in('zaak_id', zaakIds)
      .returns<{ zaak_id: string; besluit: DbBesluit | null }[]>(),
    dossierIds.length
      ? supabase.from('tk_kamerstukdossiers').select('id, titel, nummer').in('id', dossierIds).returns<DbKamerstukdossierLite[]>()
      : Promise.resolve({ data: [] as DbKamerstukdossierLite[] }),
  ]);

  const besluitIds = uniqueById(
    (besluitZaakRows ?? []).map((r) => r.besluit).filter((b): b is DbBesluit => !!b && !b.verwijderd)
  ).map((b) => b.id);

  const { data: stemmingRows } = besluitIds.length
    ? await supabase
        .from('tk_stemmingen')
        .select('besluit_id, soort, fractie_grootte')
        .in('besluit_id', besluitIds)
        .eq('verwijderd', false)
        .returns<{ besluit_id: string; soort: string | null; fractie_grootte: number | null }[]>()
    : { data: [] as { besluit_id: string; soort: string | null; fractie_grootte: number | null }[] };

  const stemmingenByBesluit = new Map<string, { soort: string | null; fractie_grootte: number | null }[]>();
  for (const s of stemmingRows ?? []) {
    const list = stemmingenByBesluit.get(s.besluit_id) ?? [];
    list.push(s);
    stemmingenByBesluit.set(s.besluit_id, list);
  }

  // Zelfde regel als getActiviteitDb: een Besluit telt alleen als echte stemuitslag
  // als het Soort een afgeronde stemming beschrijft of er daadwerkelijk Stemmingen
  // aan hangen -- anders lijkt elke ingediende motie/amendement al "gestemd".
  const STEM_RESULT_SOORTEN = new Set(['Stemmen - aangenomen', 'Stemmen - verworpen', 'Stemmen - niet aangenomen']);
  const uitslagByZaak = new Map<string, MotieUitslag>();

  for (const row of besluitZaakRows ?? []) {
    if (!row.besluit || row.besluit.verwijderd) continue;
    const stemmingen = stemmingenByBesluit.get(row.besluit.id) ?? [];
    const isEchteUitslag = stemmingen.length > 0 || STEM_RESULT_SOORTEN.has(row.besluit.soort ?? '');
    if (!isEchteUitslag) continue;

    let voor = 0;
    let tegen = 0;
    let onthouden = 0;
    for (const s of stemmingen) {
      const soort = (s.soort ?? '').toLowerCase();
      const weight = s.fractie_grootte ?? 1;
      if (soort.includes('voor')) voor += weight;
      else if (soort.includes('tegen')) tegen += weight;
      else onthouden += weight;
    }

    const existing = uitslagByZaak.get(row.zaak_id);
    if (existing && existing.voor + existing.tegen + existing.onthouden > 0 && stemmingen.length === 0) continue;

    const soortLabel = (row.besluit.soort ?? '').toLowerCase().startsWith('stemmen -')
      ? row.besluit.soort!.slice(row.besluit.soort!.indexOf('-') + 1).trim().replace(/^./, (c) => c.toUpperCase())
      : null;

    uitslagByZaak.set(row.zaak_id, {
      besluitId: row.besluit.id,
      result: soortLabel ?? (voor + tegen > 0 ? (voor >= tegen ? 'Aangenomen' : 'Verworpen') : (row.besluit.status ?? 'Onbekend')),
      voor,
      tegen,
      onthouden,
    });
  }

  const dossierById = new Map((dossierResult.data ?? []).map((d) => [d.id, d]));

  const result = zaken.map((z) => ({
    ...z,
    uitslag: uitslagByZaak.get(z.id) ?? null,
    dossier: z.kamerstukdossier_id ? dossierById.get(z.kamerstukdossier_id) ?? null : null,
  }));

  result.sort((a, b) => new Date(b.gestart_op ?? 0).getTime() - new Date(a.gestart_op ?? 0).getTime());
  return result.slice(0, opts?.limit ?? 150);
}

/** Moties waar deze persoon indiener of medeindiener van is, met stemuitslag. */
export function getMotiesVanPersoonDb(persoonId: string, opts?: { limit?: number }) {
  return getZakenMetUitslagVanPersoonDb(persoonId, ['Motie'], opts);
}

/** Amendementen waar deze persoon indiener of medeindiener van is, met stemuitslag. */
export function getAmendementenVanPersoonDb(persoonId: string, opts?: { limit?: number }) {
  return getZakenMetUitslagVanPersoonDb(persoonId, ['Amendement'], opts);
}

/** Schriftelijke en mondelinge vragen waar deze persoon indiener/medeindiener van is. */
export async function getVragenVanPersoonDb(
  persoonId: string,
  opts?: { limit?: number }
): Promise<(DbZaak & { dossier: DbKamerstukdossierLite | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tk_zaak_actoren')
    .select('zaak:tk_zaken(*)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .in('relatie', ['Indiener', 'Medeindiener'])
    .returns<ZaakActorZaakRow[]>();

  const zaken = uniqueById(
    (data ?? [])
      .map((r) => r.zaak)
      .filter((z): z is DbZaak => !!z && !z.verwijderd && ['Schriftelijke vragen', 'Mondelinge vragen'].includes(z.soort ?? ''))
  );

  const dossierIds = Array.from(new Set(zaken.map((z) => z.kamerstukdossier_id).filter((id): id is string => !!id)));
  const { data: dossierRows } = dossierIds.length
    ? await supabase.from('tk_kamerstukdossiers').select('id, titel, nummer').in('id', dossierIds).returns<DbKamerstukdossierLite[]>()
    : { data: [] as DbKamerstukdossierLite[] };
  const dossierById = new Map((dossierRows ?? []).map((d) => [d.id, d]));

  const result = zaken.map((z) => ({
    ...z,
    dossier: z.kamerstukdossier_id ? dossierById.get(z.kamerstukdossier_id) ?? null : null,
  }));

  result.sort((a, b) => new Date(b.gestart_op ?? 0).getTime() - new Date(a.gestart_op ?? 0).getTime());
  return result.slice(0, opts?.limit ?? 150);
}

/** Toezeggingen die horen bij activiteiten waar deze persoon deelnemer van was
 * (gekoppeld via het Kamer-nummer van de activiteit, net als getToezeggingenVoorActiviteitDb). */
export async function getToezeggingenVanPersoonDb(
  persoonId: string,
  opts?: { limit?: number }
): Promise<DbToezegging[]> {
  const supabase = await createClient();
  const { data: activiteitRows } = await supabase
    .from('tk_activiteit_deelnemers')
    .select('activiteit:tk_activiteiten(nummer)')
    .eq('persoon_id', persoonId)
    .eq('verwijderd', false)
    .returns<{ activiteit: { nummer: string | null } | null }[]>();

  const nummers = Array.from(
    new Set((activiteitRows ?? []).map((r) => r.activiteit?.nummer).filter((n): n is string => !!n))
  );
  if (nummers.length === 0) return [];

  const { data } = await supabase
    .from('tk_toezeggingen')
    .select('*')
    .in('activiteit_nummer', nummers)
    .eq('verwijderd', false)
    .order('aanmaakdatum', { ascending: false, nullsFirst: false })
    .returns<DbToezegging[]>();

  return (data ?? []).slice(0, opts?.limit ?? 150);
}


// --- Motie-uitslagen op zaak-id (dossierdetailpagina) ------------------------

/** Stemuitslag per zaak-id, voor een gegeven lijst zaak-ids (moties op de
 * dossier-tijdlijn). Zelfde logica als getActiviteitDb/getZakenMetUitslagVanPersoonDb:
 * een Besluit telt alleen als echte stemuitslag als het Soort een afgeronde
 * stemming beschrijft (niet "Voorstel"/"Ingediend"/"Stemmen - aangehouden", dat
 * zijn tussenstappen) of als er daadwerkelijk Stemmingen aan hangen. */
export async function getMotieUitslagenDb(zaakIds: string[]): Promise<Map<string, MotieUitslag>> {
  const uitslagByZaak = new Map<string, MotieUitslag>();
  if (zaakIds.length === 0) return uitslagByZaak;

  const supabase = await createClient();
  const { data: besluitZaakRows } = await supabase
    .from('tk_besluit_zaken')
    .select('zaak_id, besluit:tk_besluiten(*)')
    .in('zaak_id', zaakIds)
    .returns<{ zaak_id: string; besluit: DbBesluit | null }[]>();

  const besluitIds = uniqueById(
    (besluitZaakRows ?? []).map((r) => r.besluit).filter((b): b is DbBesluit => !!b && !b.verwijderd)
  ).map((b) => b.id);

  const { data: stemmingRows } = besluitIds.length
    ? await supabase
        .from('tk_stemmingen')
        .select('besluit_id, soort, fractie_grootte')
        .in('besluit_id', besluitIds)
        .eq('verwijderd', false)
        .returns<{ besluit_id: string; soort: string | null; fractie_grootte: number | null }[]>()
    : { data: [] as { besluit_id: string; soort: string | null; fractie_grootte: number | null }[] };

  const stemmingenByBesluit = new Map<string, { soort: string | null; fractie_grootte: number | null }[]>();
  for (const s of stemmingRows ?? []) {
    const list = stemmingenByBesluit.get(s.besluit_id) ?? [];
    list.push(s);
    stemmingenByBesluit.set(s.besluit_id, list);
  }

  const STEM_RESULT_SOORTEN = new Set(['Stemmen - aangenomen', 'Stemmen - verworpen', 'Stemmen - niet aangenomen']);

  for (const row of besluitZaakRows ?? []) {
    if (!row.besluit || row.besluit.verwijderd) continue;
    const stemmingen = stemmingenByBesluit.get(row.besluit.id) ?? [];
    const isEchteUitslag = stemmingen.length > 0 || STEM_RESULT_SOORTEN.has(row.besluit.soort ?? '');
    if (!isEchteUitslag) continue;

    let voor = 0;
    let tegen = 0;
    let onthouden = 0;
    for (const s of stemmingen) {
      const soort = (s.soort ?? '').toLowerCase();
      const weight = s.fractie_grootte ?? 1;
      if (soort.includes('voor')) voor += weight;
      else if (soort.includes('tegen')) tegen += weight;
      else onthouden += weight;
    }

    const existing = uitslagByZaak.get(row.zaak_id);
    if (existing && existing.voor + existing.tegen + existing.onthouden > 0 && stemmingen.length === 0) continue;

    const soortLabel = (row.besluit.soort ?? '').toLowerCase().startsWith('stemmen -')
      ? row.besluit.soort!.slice(row.besluit.soort!.indexOf('-') + 1).trim().replace(/^./, (c) => c.toUpperCase())
      : null;

    uitslagByZaak.set(row.zaak_id, {
      besluitId: row.besluit.id,
      result: soortLabel ?? (voor + tegen > 0 ? (voor >= tegen ? 'Aangenomen' : 'Verworpen') : (row.besluit.status ?? 'Onbekend')),
      voor,
      tegen,
      onthouden,
    });
  }

  return uitslagByZaak;
}
