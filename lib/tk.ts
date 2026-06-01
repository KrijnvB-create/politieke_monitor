/**
 * lib/tk.ts
 * Typed helpers voor de Tweede Kamer OData v4 API
 * Base URL: https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0
 */

const TK_BASE = 'https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0';

// ─── Utility ────────────────────────────────────────────────────────────────

async function tkFetch<T>(path: string): Promise<T> {
  const url = `${TK_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`TK API error ${res.status}: ${url}`);
  const json = await res.json();
  return json;
}

/** Bouwt een OData query string op vanuit een object */
function qs(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? '?' + parts.join('&') : '';
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TKListResponse<T> {
  '@odata.count'?: number;
  value: T[];
  '@odata.nextLink'?: string;
}

export interface Kamerstukdossier {
  Id: string;
  Titel: string;
  Citeertitel?: string;
  Alias?: string;
  Nummer?: number;
  Toevoeging?: string;
  HoogsteVolgnummer?: number;
  Afgesloten?: boolean;
  Kamer?: string;
  GewijzigdOp?: string;
  ApiGewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  Zaak?: Zaak[];
  Document?: TKDocument[];
}

export interface Zaak {
  Id: string;
  Nummer?: string;
  Soort?: ZaakSoort;
  Titel?: string;
  Citeertitel?: string;
  Alias?: string;
  Status?: string;
  Onderwerp?: string;
  GestartOp?: string;
  Organisatie?: string;
  Vergaderjaar?: string;
  Volgnummer?: number;
  HuidigeBehandelstatus?: string;
  Afgedaan?: boolean;
  GrootProject?: boolean;
  Kabinetsappreciatie?: string;
  GewijzigdOp?: string;
  ApiGewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  ZaakActor?: ZaakActor[];
  Activiteit?: Activiteit[];
  Besluit?: Besluit[];
  Document?: TKDocument[];
  Kamerstukdossier?: Kamerstukdossier[];
}

export type ZaakSoort =
  | 'Motie'
  | 'Brief Kamer'
  | 'Brief regering'
  | 'Wetgeving'
  | 'Initiatiefwetgeving'
  | 'Amendement'
  | 'Schriftelijke vragen'
  | 'Mondelinge vragen'
  | 'Interpellatie'
  | 'EU-voorstel'
  | 'Overig'
  | string;

export interface ZaakActor {
  Id: string;
  Relatie?: string; // 'Indiener' | 'Medeondertekenaar' | 'Gericht aan' | etc.
  ActorNaam?: string;
  ActorFractie?: string;
  FunctieNaam?: string;
  Persoon?: Persoon;
  Fractie?: Fractie;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
}

export interface TKDocument {
  Id: string;
  Titel?: string;
  Onderwerp?: string;
  Alias?: string;
  Datum?: string;
  Soort?: string;
  Status?: string;
  Vergaderjaar?: string;
  Volgnummer?: number;
  Nummer?: string;
  Aanhangselnummer?: string;
  Kamerstukdossier?: Kamerstukdossier;
  GewijzigdOp?: string;
  ApiGewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  DocumentActor?: DocumentActor[];
  DocumentVersie?: DocumentVersie[];
  Zaak?: Zaak[];
}

export interface DocumentActor {
  Id: string;
  Relatie?: string;
  ActorNaam?: string;
  ActorFractie?: string;
  FunctieNaam?: string;
  Persoon?: Persoon;
  Fractie?: Fractie;
  Verwijderd?: boolean;
}

export interface DocumentVersie {
  Id: string;
  Versie?: number;
  Bestandsgrootte?: number;
  Extensie?: string;
  Datum?: string;
  Status?: string;
  ExterneIdentificatie?: string;
  Verwijderd?: boolean;
}

export interface Activiteit {
  Id: string;
  Soort?: string;
  Nummer?: string;
  Onderwerp?: string;
  Aanvangstijd?: string;
  Eindtijd?: string;
  Locatie?: string;
  Vergaderjaar?: string;
  Kamer?: string;
  Status?: string;
  Voortouwsamenvatting?: string;
  GewijzigdOp?: string;
  ApiGewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  Agendapunt?: Agendapunt[];
  Commissie?: Commissie[];
  Zaak?: Zaak[];
  Verslag?: Verslag[];
}

export interface Agendapunt {
  Id: string;
  Onderwerp?: string;
  Volgorde?: number;
  Rubriek?: string;
  Noot?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  Activiteit?: Activiteit;
  Zaak?: Zaak[];
  Besluit?: Besluit[];
}

export interface Besluit {
  Id: string;
  Soort?: string;
  Status?: string;
  Opmerking?: string;
  Tekst?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  Stemming?: Stemming[];
}

export interface Stemming {
  Id: string;
  Soort?: string; // 'Met algemene stemmen' | 'Hoofdelijk' | etc.
  Vergissing?: boolean;
  FractieGrootte?: number;
  Fractie?: Fractie;
  Actor?: Persoon;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
}

export interface Commissie {
  Id: string;
  Afkorting?: string;
  NaamNL?: string;
  NaamEN?: string;
  Soort?: string;
  Email?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  CommissieZetel?: CommissieZetel[];
}

export interface CommissieZetel {
  Id: string;
  Functie?: string;
  Verwijderd?: boolean;
  Commissie?: Commissie;
  CommissieZetelVastPersoon?: CommissieZetelVastPersoon[];
}

export interface CommissieZetelVastPersoon {
  Id: string;
  Van?: string;
  TotEnMet?: string | null;
  Verwijderd?: boolean;
  Persoon?: Persoon;
}

export interface Persoon {
  Id: string;
  Titels?: string;
  Initialen?: string;
  Tussenvoegsel?: string;
  Achternaam?: string;
  Voornamen?: string;
  Roepnaam?: string;
  Functie?: string;
  Geslacht?: string;
  Geboortedatum?: string;
  Geboorteplaats?: string;
  Geboorteland?: string;
  Overlijdensdatum?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  FractieZetelPersoon?: FractieZetelPersoon[];
}

export interface Fractie {
  Id: string;
  Afkorting?: string;
  NaamNL?: string;
  NaamEN?: string;
  AantalStemmen?: number;
  AantalZetels?: number;
  DatumActief?: string;
  DatumInactief?: string | null;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  // expanded
  FractieZetel?: FractieZetel[];
}

export interface FractieZetel {
  Id: string;
  Verwijderd?: boolean;
  Fractie?: Fractie;
  FractieZetelPersoon?: FractieZetelPersoon[];
}

export interface FractieZetelPersoon {
  Id: string;
  Van?: string;
  TotEnMet?: string | null;
  Verwijderd?: boolean;
  Persoon?: Persoon;
  FractieZetel?: FractieZetel;
}

export interface Toezegging {
  Id: string;
  Tekst?: string;
  Status?: string;
  NakomenOp?: string;
  Ministerie?: string;
  Minister?: string;
  DatumToezegging?: string;
  Kamerstukdossier?: Kamerstukdossier;
  Activiteit?: Activiteit;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
}

export interface Verslag {
  Id: string;
  Soort?: string;
  Status?: string;
  Vergaderjaar?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
  Activiteit?: Activiteit;
}

// ─── Dossier helpers ────────────────────────────────────────────────────────

/** Haal één Kamerstukdossier op met gerelateerde Zaken en Documenten */
export async function getDossier(id: string): Promise<Kamerstukdossier | null> {
  try {
    const expand = [
      'Zaak($expand=ZaakActor($expand=Persoon,Fractie);$filter=Verwijderd eq false;$orderby=GestartOp desc)',
      'Document($expand=DocumentActor($expand=Persoon,Fractie);$filter=Verwijderd eq false;$orderby=Datum desc)',
    ].join(',');
    const data = await tkFetch<Kamerstukdossier>(
      `/Kamerstukdossier(${id})?$expand=${expand}`
    );
    return data;
  } catch {
    return null;
  }
}

/** Lijst van Kamerstukdossiers, optioneel gefilterd */
export async function getDossiers(opts?: {
  top?: number;
  skip?: number;
  afgesloten?: boolean;
  search?: string;
}): Promise<TKListResponse<Kamerstukdossier>> {
  const filters = ['Verwijderd eq false'];
  if (opts?.afgesloten !== undefined)
    filters.push(`Afgesloten eq ${opts.afgesloten}`);
  if (opts?.search)
    filters.push(`contains(Titel,'${opts.search.replace(/'/g, "''")}')`);

  const params: Record<string, string> = {
    '$filter': filters.join(' and '),
    '$orderby': 'GewijzigdOp desc',
    '$top': String(opts?.top ?? 25),
    '$count': 'true',
  };
  if (opts?.skip) params['$skip'] = String(opts.skip);

  const path = `/Kamerstukdossier${qs(params)}`;
  try {
    return await tkFetch<TKListResponse<Kamerstukdossier>>(path);
  } catch {
    return { value: [] };
  }
}

// ─── Tijdlijn voor een dossier ───────────────────────────────────────────────

export type TimelineItemType =
  | 'motie'
  | 'kamerbrief'
  | 'debat'
  | 'stemming'
  | 'toezegging'
  | 'verslag'
  | 'document'
  | 'zaak';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string;
  onderwerp?: string;
  status?: string;
  kabinetsappreciatie?: string;
  // relaties
  commissies?: { id: string; naam: string; afkorting?: string }[];
  kamerleden?: { id: string; naam: string; fractie?: string }[];
  fracties?: { id: string; naam: string; afkorting?: string }[];
  // deep links
  zaakId?: string;
  activiteitId?: string;
  besluitId?: string;
}

/** Bouw een uniforme tijdlijn op vanuit een dossier */
export function buildTimeline(dossier: Kamerstukdossier): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Zaken (moties, brieven, etc.)
  for (const zaak of dossier.Zaak ?? []) {
    if (zaak.Verwijderd) continue;
    const type = mapZaakSoortToType(zaak.Soort);
    items.push({
      id: zaak.Id,
      type,
      date: zaak.GestartOp ?? zaak.GewijzigdOp ?? '',
      title: zaak.Titel ?? zaak.Soort ?? 'Onbekend',
      onderwerp: zaak.Onderwerp,
      status: zaak.HuidigeBehandelstatus ?? zaak.Status,
      kabinetsappreciatie: zaak.Kabinetsappreciatie,
      kamerleden: (zaak.ZaakActor ?? [])
        .filter((a) => a.Persoon && !a.Verwijderd)
        .map((a) => ({
          id: a.Persoon!.Id,
          naam: persoonNaam(a.Persoon!),
          fractie: a.ActorFractie,
        })),
      fracties: uniqueById(
        (zaak.ZaakActor ?? [])
          .filter((a) => a.Fractie && !a.Verwijderd)
          .map((a) => ({
            id: a.Fractie!.Id,
            naam: a.Fractie!.NaamNL ?? a.Fractie!.Afkorting ?? '',
            afkorting: a.Fractie!.Afkorting,
          }))
      ),
      zaakId: zaak.Id,
    });
  }

  // Documenten (Kamerbrieven, bijlagen, etc.)
  for (const doc of dossier.Document ?? []) {
    if (doc.Verwijderd) continue;
    items.push({
      id: doc.Id,
      type: mapDocSoortToType(doc.Soort),
      date: doc.Datum ?? doc.GewijzigdOp ?? '',
      title: doc.Titel ?? doc.Soort ?? 'Document',
      onderwerp: doc.Onderwerp,
      status: doc.Status,
      kamerleden: (doc.DocumentActor ?? [])
        .filter((a) => a.Persoon && !a.Verwijderd)
        .map((a) => ({
          id: a.Persoon!.Id,
          naam: persoonNaam(a.Persoon!),
          fractie: a.ActorFractie,
        })),
      fracties: uniqueById(
        (doc.DocumentActor ?? [])
          .filter((a) => a.Fractie && !a.Verwijderd)
          .map((a) => ({
            id: a.Fractie!.Id,
            naam: a.Fractie!.NaamNL ?? a.Fractie!.Afkorting ?? '',
            afkorting: a.Fractie!.Afkorting,
          }))
      ),
    });
  }

  // Sorteer: nieuwste bovenaan
  return items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function mapZaakSoortToType(soort?: string): TimelineItemType {
  if (!soort) return 'zaak';
  if (soort === 'Motie') return 'motie';
  if (soort.includes('Brief')) return 'kamerbrief';
  if (soort === 'Wetgeving' || soort === 'Initiatiefwetgeving') return 'document';
  return 'zaak';
}

function mapDocSoortToType(soort?: string): TimelineItemType {
  if (!soort) return 'document';
  if (soort.includes('Brief')) return 'kamerbrief';
  if (soort.includes('Verslag')) return 'verslag';
  return 'document';
}

// ─── Zaak helpers ───────────────────────────────────────────────────────────

export async function getZaak(id: string): Promise<Zaak | null> {
  try {
    const expand = [
      'ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)',
      'Besluit($expand=Stemming($expand=Fractie);$filter=Verwijderd eq false)',
      'Document($expand=DocumentActor($expand=Persoon,Fractie);$filter=Verwijderd eq false)',
      'Activiteit($expand=Commissie;$filter=Verwijderd eq false)',
      'Kamerstukdossier($filter=Verwijderd eq false)',
    ].join(',');
    return await tkFetch<Zaak>(`/Zaak(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

export async function getMoties(opts?: {
  top?: number;
  skip?: number;
  dossierId?: string;
}): Promise<TKListResponse<Zaak>> {
  const filters = ["Verwijderd eq false", "Soort eq 'Motie'"];
  const params: Record<string, string> = {
    '$filter': filters.join(' and '),
    '$expand': 'ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)',
    '$orderby': 'GestartOp desc',
    '$top': String(opts?.top ?? 25),
    '$count': 'true',
  };
  if (opts?.skip) params['$skip'] = String(opts.skip);
  try {
    return await tkFetch<TKListResponse<Zaak>>(`/Zaak${qs(params)}`);
  } catch {
    return { value: [] };
  }
}

// ─── Document helpers ────────────────────────────────────────────────────────

export async function getDocument(id: string): Promise<TKDocument | null> {
  try {
    const expand = [
      'DocumentActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)',
      'DocumentVersie($filter=Verwijderd eq false)',
      'Zaak($expand=Kamerstukdossier;$filter=Verwijderd eq false)',
    ].join(',');
    return await tkFetch<TKDocument>(`/Document(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

export async function getKamerbrieven(opts?: {
  top?: number;
  skip?: number;
}): Promise<TKListResponse<TKDocument>> {
  const params: Record<string, string> = {
    '$filter': "Verwijderd eq false and contains(Soort,'Brief')",
    '$expand': 'DocumentActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)',
    '$orderby': 'Datum desc',
    '$top': String(opts?.top ?? 25),
    '$count': 'true',
  };
  if (opts?.skip) params['$skip'] = String(opts.skip);
  try {
    return await tkFetch<TKListResponse<TKDocument>>(`/Document${qs(params)}`);
  } catch {
    return { value: [] };
  }
}

// ─── Activiteit / Debat helpers ──────────────────────────────────────────────

export async function getActiviteit(id: string): Promise<Activiteit | null> {
  try {
    const expand = [
      'Agendapunt($expand=Zaak,Besluit($expand=Stemming($expand=Fractie));$filter=Verwijderd eq false;$orderby=Volgorde asc)',
      'Commissie($filter=Verwijderd eq false)',
      'Verslag($filter=Verwijderd eq false)',
      'Zaak($expand=ZaakActor($expand=Persoon,Fractie);$filter=Verwijderd eq false)',
    ].join(',');
    return await tkFetch<Activiteit>(`/Activiteit(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

export async function getActiviteiten(opts?: {
  top?: number;
  skip?: number;
  soort?: string;
  vanaf?: string;
}): Promise<TKListResponse<Activiteit>> {
  const filters = ['Verwijderd eq false'];
  if (opts?.soort) filters.push(`Soort eq '${opts.soort}'`);
  if (opts?.vanaf) filters.push(`Aanvangstijd ge ${opts.vanaf}`);

  const params: Record<string, string> = {
    '$filter': filters.join(' and '),
    '$expand': 'Commissie($filter=Verwijderd eq false)',
    '$orderby': 'Aanvangstijd desc',
    '$top': String(opts?.top ?? 25),
    '$count': 'true',
  };
  if (opts?.skip) params['$skip'] = String(opts.skip);
  try {
    return await tkFetch<TKListResponse<Activiteit>>(`/Activiteit${qs(params)}`);
  } catch {
    return { value: [] };
  }
}

// ─── Commissie helpers ───────────────────────────────────────────────────────

export async function getCommissies(): Promise<TKListResponse<Commissie>> {
  try {
    return await tkFetch<TKListResponse<Commissie>>(
      `/Commissie?$filter=Verwijderd eq false&$orderby=NaamNL asc&$top=100`
    );
  } catch {
    return { value: [] };
  }
}

export async function getCommissie(id: string): Promise<Commissie | null> {
  try {
    const expand = [
      'CommissieZetel($expand=CommissieZetelVastPersoon($expand=Persoon($expand=FractieZetelPersoon($expand=FractieZetel($expand=Fractie)));$filter=TotEnMet eq null and Verwijderd eq false);$filter=Verwijderd eq false)',
    ].join(',');
    return await tkFetch<Commissie>(`/Commissie(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

// ─── Persoon / Kamerlid helpers ──────────────────────────────────────────────

export async function getKamerleden(): Promise<TKListResponse<Persoon>> {
  try {
    return await tkFetch<TKListResponse<Persoon>>(
      `/Persoon?$filter=Verwijderd eq false and (Functie eq 'Tweede Kamerlid')&$expand=FractieZetelPersoon($expand=FractieZetel($expand=Fractie);$filter=TotEnMet eq null and Verwijderd eq false)&$orderby=Achternaam asc&$top=200`
    );
  } catch {
    return { value: [] };
  }
}

export async function getPersoon(id: string): Promise<Persoon | null> {
  try {
    const expand = [
      'FractieZetelPersoon($expand=FractieZetel($expand=Fractie);$filter=Verwijderd eq false)',
    ].join(',');
    return await tkFetch<Persoon>(`/Persoon(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

export async function getZakenVanPersoon(
  persoonId: string,
  opts?: { top?: number }
): Promise<TKListResponse<Zaak>> {
  try {
    const filter = `Verwijderd eq false and ZaakActor/any(a:a/Verwijderd eq false and a/Persoon/Id eq ${persoonId})`;
    return await tkFetch<TKListResponse<Zaak>>(
      `/Zaak?$filter=${encodeURIComponent(filter)}&$orderby=GestartOp desc&$top=${opts?.top ?? 20}&$expand=ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)`
    );
  } catch {
    return { value: [] };
  }
}

// ─── Fractie helpers ─────────────────────────────────────────────────────────

export async function getFracties(): Promise<TKListResponse<Fractie>> {
  try {
    return await tkFetch<TKListResponse<Fractie>>(
      `/Fractie?$filter=Verwijderd eq false and DatumInactief eq null&$orderby=AantalZetels desc&$top=50`
    );
  } catch {
    return { value: [] };
  }
}

export async function getFractie(id: string): Promise<Fractie | null> {
  try {
    const expand =
      'FractieZetel($expand=FractieZetelPersoon($expand=Persoon;$filter=TotEnMet eq null and Verwijderd eq false);$filter=Verwijderd eq false)';
    return await tkFetch<Fractie>(`/Fractie(${id})?$expand=${expand}`);
  } catch {
    return null;
  }
}

// ─── Toezegging helpers ──────────────────────────────────────────────────────

export async function getToezeggingen(opts?: {
  top?: number;
  status?: string;
}): Promise<TKListResponse<Toezegging>> {
  const filters = ['Verwijderd eq false'];
  if (opts?.status) filters.push(`Status eq '${opts.status}'`);
  try {
    return await tkFetch<TKListResponse<Toezegging>>(
      `/Toezegging?$filter=${filters.join(' and ')}&$orderby=DatumToezegging desc&$top=${opts?.top ?? 25}`
    );
  } catch {
    return { value: [] };
  }
}

// ─── Zoeken ──────────────────────────────────────────────────────────────────

export interface SearchResults {
  dossiers: Kamerstukdossier[];
  zaken: Zaak[];
  documenten: TKDocument[];
  personen: Persoon[];
  commissies: Commissie[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.replace(/'/g, "''");
  const [dossiers, zaken, documenten, personen, commissies] = await Promise.all([
    tkFetch<TKListResponse<Kamerstukdossier>>(
      `/Kamerstukdossier?$filter=Verwijderd eq false and contains(Titel,'${q}')&$top=5`
    ).catch(() => ({ value: [] as Kamerstukdossier[] })),
    tkFetch<TKListResponse<Zaak>>(
      `/Zaak?$filter=Verwijderd eq false and (contains(Titel,'${q}') or contains(Onderwerp,'${q}'))&$top=5&$expand=ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false)`
    ).catch(() => ({ value: [] as Zaak[] })),
    tkFetch<TKListResponse<TKDocument>>(
      `/Document?$filter=Verwijderd eq false and contains(Titel,'${q}')&$top=5`
    ).catch(() => ({ value: [] as TKDocument[] })),
    tkFetch<TKListResponse<Persoon>>(
      `/Persoon?$filter=Verwijderd eq false and contains(Achternaam,'${q}')&$top=5`
    ).catch(() => ({ value: [] as Persoon[] })),
    tkFetch<TKListResponse<Commissie>>(
      `/Commissie?$filter=Verwijderd eq false and contains(NaamNL,'${q}')&$top=5`
    ).catch(() => ({ value: [] as Commissie[] })),
  ]);
  return {
    dossiers: dossiers.value,
    zaken: zaken.value,
    documenten: documenten.value,
    personen: personen.value,
    commissies: commissies.value,
  };
}

// ─── Utils ───────────────────────────────────────────────────────────────────

export function persoonNaam(p: Persoon): string {
  const parts = [p.Roepnaam ?? p.Voornamen, p.Tussenvoegsel, p.Achternaam].filter(Boolean);
  return parts.join(' ');
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });
}

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}

export const TK_DOCUMENT_URL = (id: string) =>
  `https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Document(${id})/resource`;
