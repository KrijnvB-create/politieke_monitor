/**
 * lib/tk.ts
 * Typed helpers voor de Tweede Kamer OData v4 API
 * Base URL: https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0
 */

import type { SavedItemKind, SavedItemRecord } from './saved-items';

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
    Vergaderjaar?: string;
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
    Voortouwcommissie?: Commissie;
    Zaak?: Zaak[];
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
    // expanded  CommissieZetel?: CommissieZetel[];
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
    ContentType?: string;
    Vergaderjaar?: string;
    GewijzigdOp?: string;
    ApiGewijzigdOp?: string;
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
                  'Activiteit($expand=Voortouwcommissie;$filter=Verwijderd eq false)',
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
          '$expand':
                  'ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false),Kamerstukdossier($filter=Verwijderd eq false)',
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
    search?: string;
}): Promise<TKListResponse<TKDocument>> {
    const filters = ["Verwijderd eq false", "contains(Soort,'Brief')"];
    if (opts?.search) {
          const q = opts.search.replace(/'/g, "''");
          filters.push(`(contains(Titel,'${q}') or contains(Onderwerp,'${q}'))`);
    }
    const params: Record<string, string> = {
          '$filter': filters.join(' and '),
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
                  'Voortouwcommissie',
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
    search?: string;
}): Promise<TKListResponse<Activiteit>> {
    const filters = ['Verwijderd eq false'];
    if (opts?.soort) filters.push(`Soort eq '${opts.soort}'`);
    if (opts?.vanaf) filters.push(`Aanvangstijd ge ${opts.vanaf}`);
    if (opts?.search) filters.push(`contains(Onderwerp,'${opts.search.replace(/'/g, "''")}')`);

  const params: Record<string, string> = {
        '$filter': filters.join(' and '),
        '$expand': 'Voortouwcommissie',
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

export async function getKamerleden(opts?: {
    search?: string;
}): Promise<TKListResponse<Persoon>> {
    const filters = ["Verwijderd eq false", "(Functie eq 'Tweede Kamerlid')"];
    if (opts?.search) filters.push(`contains(Achternaam,'${opts.search.replace(/'/g, "''")}')`);
    try {
          return await tkFetch<TKListResponse<Persoon>>(
                  `/Persoon?$filter=${filters.join(' and ')}&$expand=FractieZetelPersoon($expand=FractieZetel($expand=Fractie);$filter=TotEnMet eq null and Verwijderd eq false)&$orderby=Achternaam asc&$top=200`
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
                  `/Toezegging?$filter=${filters.join(' and ')}&$expand=Activiteit($filter=Verwijderd eq false)&$orderby=DatumToezegging desc&$top=${opts?.top ?? 25}`
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
                  `/Zaak?$filter=Verwijderd eq false and (contains(Titel,'${q}') or contains(Onderwerp,'${q}'))&$top=5&$expand=ZaakActor($expand=Persoon,Fractie;$filter=Verwijderd eq false),Kamerstukdossier($filter=Verwijderd eq false)`
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

// ─── Kamerkompas: hoog-niveau monitor-API ───────────────────────────────────
//
// De pagina's onder app/ praten niet rechtstreeks met de ruwe OData-types
// hierboven, maar met een klein aantal samengestelde "overview"-functies die
// alles vertalen naar een paar uniforme UI-vormen (MonitorItem, VoteSummary,
// TkFaction). Elke functie hieronder is een dunne laag boven de bestaande
// low-level helpers (getMoties, getKamerbrieven, getActiviteiten, ...).

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Kind-waarden voor een MonitorItem, gedeeld met de "volgen"-functionaliteit */
export type MonitorItemKind = SavedItemKind;

/** Uniforme kaart-vorm voor zoekresultaten, tickers, agenda's en detailpagina's */
export interface MonitorItem {
    kind: MonitorItemKind;
    id: string;
    eyebrow: string;
    title: string;
    date: string;
    status?: string;
    description?: string;
    matchedOn?: string;
    meta: Record<string, unknown>;
}

/** Uniforme kaart-vorm voor een stemming (Besluit + Stemmingen) */
export interface VoteSummary {
    id: string;
    title: string;
    date: string;
    result: string;
    voor: number;
    tegen: number;
    onthouden: number;
    total: number;
    lines: { faction: string; vote: string }[];
    meta?: Record<string, unknown>;
}

/** Subset van Fractie die de zetelverdeling-componenten nodig hebben */
export type TkFaction = Fractie;

export interface SearchSection {
    id: string;
    title: string;
    items: MonitorItem[];
}

// ─── Adapters: ruwe entiteiten → MonitorItem ────────────────────────────────

function zaakToMonitorItem(zaak: Zaak, opts?: { matchedOn?: string }): MonitorItem {
    const isMotie = zaak.Soort === 'Motie';
    const dossierId = zaak.Kamerstukdossier?.find((d) => !d.Verwijderd)?.Id;
    return {
          kind: isMotie ? 'motie' : 'dossier',
          id: dossierId ?? zaak.Id,
          eyebrow: zaak.Soort ?? 'Zaak',
          title: zaak.Titel ?? zaak.Onderwerp ?? zaak.Soort ?? 'Zaak',
          date: formatDate(zaak.GestartOp ?? zaak.GewijzigdOp),
          status: zaak.HuidigeBehandelstatus ?? zaak.Status,
          description: zaak.Onderwerp,
          matchedOn: opts?.matchedOn,
          meta: { ...zaak },
    };
}

function documentToMonitorItem(doc: TKDocument, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'kamerbrief',
          id: doc.Id,
          eyebrow: doc.Soort ?? 'Document',
          title: doc.Titel ?? doc.Onderwerp ?? doc.Soort ?? 'Document',
          date: formatDate(doc.Datum ?? doc.GewijzigdOp),
          status: doc.Status,
          description: doc.Onderwerp,
          matchedOn: opts?.matchedOn,
          meta: { ...doc },
    };
}

function activiteitToMonitorItem(act: Activiteit, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'activiteit',
          id: act.Id,
          eyebrow: act.Soort ?? 'Activiteit',
          title: act.Onderwerp ?? act.Soort ?? 'Activiteit',
          date: formatDate(act.Aanvangstijd),
          status: act.Status,
          description: act.Voortouwsamenvatting ?? act.Locatie,
          matchedOn: opts?.matchedOn,
          meta: { ...act },
    };
}

function persoonToMonitorItem(p: Persoon, opts?: { matchedOn?: string }): MonitorItem {
    const zetel = p.FractieZetelPersoon?.find((f) => !f.TotEnMet && !f.Verwijderd) ?? p.FractieZetelPersoon?.[0];
    const fractieLabel = zetel?.FractieZetel?.Fractie?.Afkorting ?? zetel?.FractieZetel?.Fractie?.NaamNL;
    return {
          kind: 'kamerlid',
          id: p.Id,
          eyebrow: p.Functie ?? 'Kamerlid',
          title: persoonNaam(p) || p.Achternaam || 'Onbekend Kamerlid',
          date: formatDate(p.GewijzigdOp),
          status: fractieLabel,
          description: fractieLabel ? `Lid namens ${fractieLabel}` : undefined,
          matchedOn: opts?.matchedOn,
          meta: { ...p, Fractielabel: fractieLabel },
    };
}

function fractieToMonitorItem(f: Fractie, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'fractie',
          id: f.Id,
          eyebrow: 'Fractie',
          title: f.NaamNL ?? f.Afkorting ?? 'Fractie',
          date: formatDate(f.GewijzigdOp),
          status: f.AantalZetels ? `${f.AantalZetels} zetels` : undefined,
          description: f.NaamEN,
          matchedOn: opts?.matchedOn,
          meta: { ...f },
    };
}

function commissieToMonitorItem(c: Commissie, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'thema',
          id: c.Id,
          eyebrow: 'Commissie',
          title: c.NaamNL ?? c.Afkorting ?? 'Commissie',
          date: formatDate(c.GewijzigdOp),
          description: c.Soort,
          matchedOn: opts?.matchedOn,
          meta: { ...c },
    };
}

function dossierToMonitorItem(d: Kamerstukdossier, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'dossier',
          id: d.Id,
          eyebrow: 'Dossier',
          title: d.Titel ?? d.Citeertitel ?? 'Dossier',
          date: formatDate(d.GewijzigdOp),
          status: d.Afgesloten ? 'Afgesloten' : 'Actief',
          description: d.Citeertitel,
          matchedOn: opts?.matchedOn,
          meta: { ...d },
    };
}

function toezeggingToMonitorItem(t: Toezegging, opts?: { matchedOn?: string }): MonitorItem {
    return {
          kind: 'activiteit',
          id: t.Activiteit?.Id ?? t.Id,
          eyebrow: 'Toezegging',
          title: t.Tekst ? truncate(t.Tekst, 140) : 'Toezegging',
          date: formatDate(t.DatumToezegging ?? t.GewijzigdOp),
          status: t.Status,
          description: [t.Minister, t.Ministerie].filter(Boolean).join(' · ') || undefined,
          matchedOn: opts?.matchedOn,
          meta: { ...t },
    };
}

function voteSummaryToMonitorItem(v: VoteSummary): MonitorItem {
    return {
          kind: 'stemming',
          id: v.id,
          eyebrow: 'Stemming',
          title: v.title,
          date: v.date,
          status: v.result,
          description: `${v.voor} voor / ${v.tegen} tegen`,
          meta: v.meta ?? {},
    };
}

// ─── Besluiten / stemmingen ──────────────────────────────────────────────────

/** Haal Zaken op met hun (genomen) Besluiten en Stemmingen erbij geëxpand */
async function fetchZakenMetStemmingen(opts: {
    top?: number;
    besluitId?: string;
}): Promise<Zaak[]> {
    const expand =
          'Besluit($expand=Stemming($expand=Fractie);$filter=Verwijderd eq false)';
    const filter = opts.besluitId
      ? `Verwijderd eq false and Besluit/any(b:b/Id eq ${opts.besluitId})`
          : 'Verwijderd eq false and Besluit/any(b:b/Stemming/any(s:s/Verwijderd eq false))';
    const params: Record<string, string> = {
          '$filter': filter,
          '$expand': expand,
          '$orderby': 'GestartOp desc',
          '$top': String(opts.top ?? 25),
    };
    try {
          const data = await tkFetch<TKListResponse<Zaak>>(`/Zaak${qs(params)}`);
          return data.value;
    } catch {
          return [];
    }
}

function besluitToVoteSummary(zaak: Zaak, besluit: Besluit): VoteSummary {
    const stemmingen = (besluit.Stemming ?? []).filter((s) => !s.Verwijderd);
    let voor = 0;
    let tegen = 0;
    let onthouden = 0;
    const lines = stemmingen.map((s) => {
          const soort = (s.Soort ?? '').toLowerCase();
          const weight = s.FractieGrootte ?? 1;
          if (soort.includes('voor')) voor += weight;
          else if (soort.includes('tegen')) tegen += weight;
          else onthouden += weight;
          return {
                  faction: s.Fractie?.Afkorting ?? s.Fractie?.NaamNL ?? 'Onbekend',
                  vote: s.Soort ?? 'Onbekend',
          };
    });
    const total = voor + tegen + onthouden;
    const result = besluit.Status ?? besluit.Soort ?? (voor >= tegen ? 'Aangenomen' : 'Verworpen');
    return {
          id: besluit.Id,
          title: zaak.Titel ?? zaak.Onderwerp ?? besluit.Tekst ?? 'Stemming',
          date: formatDate(zaak.GestartOp ?? zaak.GewijzigdOp),
          result,
          voor,
          tegen,
          onthouden,
          total,
          lines,
          meta: { besluitId: besluit.Id, zaakId: zaak.Id, zaak: zaak.Titel, opmerking: besluit.Opmerking },
    };
}

/** Overzicht van recente stemmingen (VoteSummary per Besluit-met-Stemmingen) */
export async function getVotesOverview(): Promise<{ items: VoteSummary[]; apiOk: boolean }> {
    const zaken = await fetchZakenMetStemmingen({ top: 25 });
    const items: VoteSummary[] = [];
    for (const zaak of zaken) {
          for (const besluit of zaak.Besluit ?? []) {
                  if (besluit.Verwijderd) continue;
                  const stemmingen = (besluit.Stemming ?? []).filter((s) => !s.Verwijderd);
                  if (stemmingen.length === 0) continue;
                  items.push(besluitToVoteSummary(zaak, besluit));
          }
    }
    return { items, apiOk: items.length > 0 };
}

/** Eén stemming: geeft een VoteSummary terug als er stemgegevens zijn, anders het onderliggende zaak-item */
export async function getVoteDetailById(
    id: string
  ): Promise<{ summary?: VoteSummary; item?: MonitorItem }> {
    const zaken = await fetchZakenMetStemmingen({ besluitId: id, top: 5 });
    for (const zaak of zaken) {
          const besluit = (zaak.Besluit ?? []).find((b) => b.Id === id);
          if (!besluit) continue;
          const stemmingen = (besluit.Stemming ?? []).filter((s) => !s.Verwijderd);
          if (stemmingen.length > 0) {
                  return { summary: besluitToVoteSummary(zaak, besluit) };
          }
          return { item: zaakToMonitorItem(zaak) };
    }
    return {};
}

// ─── Verslagen ────────────────────────────────────────────────────────────

export function reportResourceUrl(id?: string): string | undefined {
    if (!id) return undefined;
    return `${TK_BASE}/Verslag(${id})/resource`;
}

/** Overzicht van recente (ongecorrigeerde) verslagpublicaties */
export async function getReportsOverview(): Promise<{ items: Verslag[]; apiOk: boolean }> {
    try {
          const data = await tkFetch<TKListResponse<Verslag>>(
                  `/Verslag?$filter=Verwijderd eq false&$orderby=GewijzigdOp desc&$top=20`
                );
          return { items: data.value, apiOk: data.value.length > 0 };
    } catch {
          return { items: [], apiOk: false };
    }
}

// ─── Agenda / debatten ───────────────────────────────────────────────────────

export async function getAgendaItemById(id: string): Promise<MonitorItem | null> {
    const activiteit = await getActiviteit(id);
    if (!activiteit) return null;
    return activiteitToMonitorItem(activiteit);
}

function splitPlannedPast(activiteiten: Activiteit[]): { planned: Activiteit[]; past: Activiteit[] } {
    const nowMs = Date.now();
    const planned: Activiteit[] = [];
    const past: Activiteit[] = [];
    for (const a of activiteiten) {
          const start = a.Aanvangstijd ? new Date(a.Aanvangstijd).getTime() : undefined;
          if (start !== undefined && start >= nowMs) planned.push(a);
          else past.push(a);
    }
    planned.sort((a, b) => new Date(a.Aanvangstijd ?? 0).getTime() - new Date(b.Aanvangstijd ?? 0).getTime());
    return { planned, past };
}

/** Agenda-overzicht: komende en eerdere Activiteiten, optioneel gefilterd op onderwerp */
export async function getAgendaOverview(
    query?: string
  ): Promise<{ planned: MonitorItem[]; past: MonitorItem[]; apiOk: boolean }> {
    const data = await getActiviteiten({ top: 80, search: query });
    const { planned, past } = splitPlannedPast(data.value);
    return {
          planned: planned.map((a) => activiteitToMonitorItem(a)),
          past: past.map((a) => activiteitToMonitorItem(a)),
          apiOk: data.value.length > 0,
    };
}

/** Debat-overzicht: Activiteiten waarvan de Soort op "debat" duidt */
export async function getDebateOverview(
    query?: string
  ): Promise<{ planned: MonitorItem[]; past: MonitorItem[]; apiOk: boolean }> {
    const data = await getActiviteiten({ top: 100, search: query });
    const debates = data.value.filter((a) => (a.Soort ?? '').toLowerCase().includes('debat'));
    const { planned, past } = splitPlannedPast(debates);
    return {
          planned: planned.map((a) => activiteitToMonitorItem(a)),
          past: past.map((a) => activiteitToMonitorItem(a)),
          apiOk: data.value.length > 0,
    };
}

// ─── Fracties (monitor-view) ─────────────────────────────────────────────────

export function factionResourceUrl(id: string): string {
    return `${TK_BASE}/Fractie(${id})`;
}

export async function getFactionItemById(id: string): Promise<MonitorItem | null> {
    const fractie = await getFractie(id);
    if (!fractie) return null;
    return fractieToMonitorItem(fractie);
}

export async function getFactionsOverview(): Promise<{ items: TkFaction[]; apiOk: boolean }> {
    const data = await getFracties();
    return { items: data.value, apiOk: data.value.length > 0 };
}

// ─── Kamerbrieven (monitor-view) ─────────────────────────────────────────────

export function documentResourceUrl(id?: string): string | undefined {
    if (!id) return undefined;
    return TK_DOCUMENT_URL(id);
}

export async function getLetterItemById(id: string): Promise<MonitorItem | null> {
    const doc = await getDocument(id);
    if (!doc) return null;
    return documentToMonitorItem(doc);
}

export async function getLettersOverview(
    query?: string
  ): Promise<{ items: MonitorItem[]; apiOk: boolean }> {
    const data = await getKamerbrieven({ top: 30, search: query });
    const items = data.value.map((d) => documentToMonitorItem(d));
    return { items, apiOk: items.length > 0 };
}

// ─── Kamerleden (monitor-view) ───────────────────────────────────────────────

export function personResourceUrl(id?: string): string | undefined {
    if (!id) return undefined;
    return `${TK_BASE}/Persoon(${id})/resource`;
}

export async function getMemberItemById(id: string): Promise<MonitorItem | null> {
    const persoon = await getPersoon(id);
    if (!persoon) return null;
    return persoonToMonitorItem(persoon);
}

export async function getMembersOverview(
    query?: string
  ): Promise<{ items: MonitorItem[]; apiOk: boolean }> {
    const data = await getKamerleden({ search: query });
    const items = data.value.map((p) => persoonToMonitorItem(p));
    return { items, apiOk: items.length > 0 };
}

// ─── Kamerkompas dagdashboard ─────────────────────────────────────────────────

/** Alles wat het dagdashboard (app/page.tsx) nodig heeft, in één call */
export async function getKamerkompasOverview() {
    const [activiteitenResp, motiesResp, brievenResp, fractiesResp, toezeggingenResp, reportsOverview] =
          await Promise.all([
                  getActiviteiten({ top: 60 }),
                  getMoties({ top: 6 }),
                  getKamerbrieven({ top: 6 }),
                  getFracties(),
                  getToezeggingen({ top: 6 }),
                  getReportsOverview(),
                ]);

  const nowMs = Date.now();
    const weekAheadMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  const nowActiviteiten: Activiteit[] = [];
    const weekActiviteiten: Activiteit[] = [];
    for (const a of activiteitenResp.value) {
          const start = a.Aanvangstijd ? new Date(a.Aanvangstijd).getTime() : undefined;
          if (start === undefined) continue;
          const end = a.Eindtijd ? new Date(a.Eindtijd).getTime() : start;
          if (start <= nowMs && end >= nowMs) nowActiviteiten.push(a);
          else if (start > nowMs && start <= weekAheadMs) weekActiviteiten.push(a);
    }
    weekActiviteiten.sort(
          (a, b) => new Date(a.Aanvangstijd ?? 0).getTime() - new Date(b.Aanvangstijd ?? 0).getTime()
        );

  const motions = motiesResp.value.map((z) => zaakToMonitorItem(z));
    const letters = brievenResp.value.map((d) => documentToMonitorItem(d));
    const pledges = toezeggingenResp.value.map((t) => toezeggingToMonitorItem(t));

  const votesOverview = await getVotesOverview();

  const tickerSource = [
        ...activiteitenResp.value
          .slice(0, 10)
          .map((a) => ({ raw: a.GewijzigdOp ?? a.Aanvangstijd, item: activiteitToMonitorItem(a) })),
        ...motiesResp.value.map((z) => ({ raw: z.GewijzigdOp ?? z.GestartOp, item: zaakToMonitorItem(z) })),
        ...brievenResp.value.map((d) => ({ raw: d.GewijzigdOp ?? d.Datum, item: documentToMonitorItem(d) })),
      ];
    const ticker = tickerSource
      .sort((a, b) => new Date(b.raw ?? 0).getTime() - new Date(a.raw ?? 0).getTime())
      .map((x) => x.item)
      .slice(0, 15);

  const apiOk =
        activiteitenResp.value.length > 0 ||
        motions.length > 0 ||
        letters.length > 0 ||
        fractiesResp.value.length > 0;

  return {
        reports: reportsOverview.items,
        ticker,
        now: nowActiviteiten.map((a) => activiteitToMonitorItem(a)),
        votes: votesOverview.items.slice(0, 5),
        weekAgenda: weekActiviteiten.slice(0, 6).map((a) => activiteitToMonitorItem(a)),
        factions: fractiesResp.value,
        motions,
        letters,
        pledges,
        apiOk,
  };
}

// ─── Dashboard (volgprofiel) ──────────────────────────────────────────────────

/** Ontwikkelingen relevant voor de opgeslagen items van een gebruiker */
export async function getDashboardDevelopments(savedItems: SavedItemRecord[]): Promise<{
    themes: SavedItemRecord[];
    members: SavedItemRecord[];
    debates: SavedItemRecord[];
    developments: MonitorItem[];
    votes: MonitorItem[];
}> {
    const themes = savedItems.filter((i) => i.kind === 'thema' || i.kind === 'dossier');
    const members = savedItems.filter((i) => i.kind === 'kamerlid');
    const debates = savedItems.filter(
          (i) => i.kind === 'debat' || i.kind === 'activiteit' || i.kind === 'vergadering'
        );

  const [motiesResp, brievenResp, activiteitenResp] = await Promise.all([
        getMoties({ top: 10 }),
        getKamerbrieven({ top: 10 }),
        getActiviteiten({ top: 10 }),
      ]);

  const savedRefIds = new Set(savedItems.map((i) => i.ref_id));

  const developments = [
        ...motiesResp.value.map((z) => ({ raw: z.GestartOp ?? z.GewijzigdOp, item: zaakToMonitorItem(z) })),
        ...brievenResp.value.map((d) => ({ raw: d.Datum ?? d.GewijzigdOp, item: documentToMonitorItem(d) })),
        ...activiteitenResp.value.map((a) => ({ raw: a.Aanvangstijd, item: activiteitToMonitorItem(a) })),
      ]
      .sort((a, b) => new Date(b.raw ?? 0).getTime() - new Date(a.raw ?? 0).getTime())
      .map((x) => (savedRefIds.has(x.item.id) ? { ...x.item, matchedOn: 'Gevolgd item' } : x.item))
      .slice(0, 10);

  const votesOverview = await getVotesOverview();
    const votes = votesOverview.items.slice(0, 4).map((v) => voteSummaryToMonitorItem(v));

  return { themes, members, debates, developments, votes };
}

// ─── Zoeken (monitor-view) ────────────────────────────────────────────────────

/** Zoekresultaten gegroepeerd per entiteitstype, klaar voor de zoekpagina */
export async function searchMonitor(query: string): Promise<SearchSection[]> {
    const results = await searchAll(query);
    const matchedOn = query || undefined;

  return [
    {
            id: 'dossiers',
            title: 'Dossiers',
            items: results.dossiers.map((d) => dossierToMonitorItem(d, { matchedOn })),
    },
    {
            id: 'zaken',
            title: 'Moties, wetten en zaken',
            items: results.zaken.map((z) => zaakToMonitorItem(z, { matchedOn })),
    },
    {
            id: 'documenten',
            title: 'Kamerbrieven en documenten',
            items: results.documenten.map((d) => documentToMonitorItem(d, { matchedOn })),
    },
    {
            id: 'personen',
            title: 'Kamerleden',
            items: results.personen.map((p) => persoonToMonitorItem(p, { matchedOn })),
    },
    {
            id: 'commissies',
            title: 'Commissies',
            items: results.commissies.map((c) => commissieToMonitorItem(c, { matchedOn })),
    },
      ];
}
