import type { SavedItemKind, SavedItemRecord } from "@/lib/saved-items";

const TK_API_BASE = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
const CACHE_SECONDS = 15 * 60;

type ODataResponse<T> = {
  value?: T[];
};

type UnknownRecord = Record<string, unknown>;

export type TkActivity = {
  Id?: string;
  Nummer?: string;
  Soort?: string;
  Onderwerp?: string;
  Titel?: string;
  Status?: string;
  Datum?: string | null;
  GewijzigdOp?: string | null;
  Verwijderd?: boolean;
  Locatie?: string | null;
  Vergaderjaar?: string | null;
};

export type TkPerson = {
  Id?: string;
  Nummer?: number | null;
  Initialen?: string | null;
  Tussenvoegsel?: string | null;
  Achternaam?: string | null;
  Voornamen?: string | null;
  Roepnaam?: string | null;
  Functie?: string | null;
  Fractielabel?: string | null;
  GewijzigdOp?: string | null;
  Verwijderd?: boolean | null;
};

export type TkCase = {
  Id?: string;
  Nummer?: string | null;
  Soort?: string | null;
  Titel?: string | null;
  Status?: string | null;
  Onderwerp?: string | null;
  GestartOp?: string | null;
  Vergaderjaar?: string | null;
  GewijzigdOp?: string | null;
  Afgedaan?: boolean | null;
  Kabinetsappreciatie?: string | null;
};

export type TkDocument = {
  Id?: string;
  Soort?: string | null;
  DocumentNummer?: string | null;
  Titel?: string | null;
  Onderwerp?: string | null;
  Datum?: string | null;
  DatumOntvangst?: string | null;
  Vergaderjaar?: string | null;
  GewijzigdOp?: string | null;
};

export type TkVote = {
  Id?: string;
  Besluit_Id?: string | null;
  Soort?: string | null;
  ActorNaam?: string | null;
  ActorFractie?: string | null;
  FractieGrootte?: number | null;
  Vergissing?: boolean | null;
  GewijzigdOp?: string | null;
  Besluit?: {
    BesluitSoort?: string | null;
    BesluitTekst?: string | null;
    Status?: string | null;
    GewijzigdOp?: string | null;
  } | null;
};

export type TkMeeting = {
  Id?: string;
  Soort?: string | null;
  Titel?: string | null;
  Zaal?: string | null;
  Vergaderjaar?: string | null;
  VergaderingNummer?: number | null;
  Datum?: string | null;
  Aanvangstijd?: string | null;
  Sluiting?: string | null;
  Kamer?: string | null;
  GewijzigdOp?: string | null;
  Verwijderd?: boolean | null;
};

export type TkDossier = {
  Id?: string;
  Titel?: string | null;
  Citeertitel?: string | null;
  Nummer?: number | null;
  HoogsteVolgnummer?: number | null;
  Afgesloten?: boolean | null;
  Kamer?: string | null;
  GewijzigdOp?: string | null;
};

export type MonitorItem = {
  kind: SavedItemKind;
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  date: string;
  status?: string;
  meta: UnknownRecord;
  matchedOn?: string;
};

export type SearchSection = {
  id: string;
  title: string;
  items: MonitorItem[];
};

export type DashboardDevelopments = {
  themes: SavedItemRecord[];
  members: SavedItemRecord[];
  debates: SavedItemRecord[];
  developments: MonitorItem[];
  votes: MonitorItem[];
};

function queryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

async function tkFetch<T>(entity: string, params: Record<string, string | number | undefined>) {
  const response = await fetch(`${TK_API_BASE}/${entity}?${queryString(params)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS }
  });

  if (!response.ok) {
    throw new Error(`Tweede Kamer API returned ${response.status} for ${entity}`);
  }

  const payload = (await response.json()) as ODataResponse<T>;
  return payload.value ?? [];
}

async function safeList<T>(promise: Promise<T[]>) {
  try {
    return await promise;
  } catch {
    return [];
  }
}

function odataString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function compactTerm(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 90);
}

function containsAny(fields: string[], value: string) {
  const term = compactTerm(value);
  return `(${fields.map((field) => `contains(${field},${odataString(term)})`).join(" or ")})`;
}

function withQuery(baseFilter: string, fields: string[], query?: string) {
  const term = query?.trim();
  return term ? `${baseFilter} and ${containsAny(fields, term)}` : baseFilter;
}

function asRecord(value: unknown) {
  return value as UnknownRecord;
}

export function formatTkDate(value?: string | null) {
  if (!value) {
    return "Datum onbekend";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined
  }).format(new Date(value));
}

export async function getRecentActivities() {
  return tkFetch<TkActivity>("Activiteit", {
    $filter: "Verwijderd eq false",
    $orderby: "GewijzigdOp desc",
    $top: 8
  });
}

export function activityId(activity: TkActivity) {
  const fallback = [activity.Soort, activity.GewijzigdOp, activity.Onderwerp].filter(Boolean).join(":");
  return activity.Id ?? activity.Nummer ?? (fallback || "activiteit-onbekend");
}

export function activityTitle(activity: TkActivity) {
  return activity.Onderwerp ?? activity.Titel ?? activity.Soort ?? "Tweede Kamer-activiteit";
}

export function activityDate(activity: TkActivity) {
  return formatTkDate(activity.Datum ?? activity.GewijzigdOp);
}

function personName(person: TkPerson) {
  return [person.Roepnaam ?? person.Voornamen ?? person.Initialen, person.Tussenvoegsel, person.Achternaam]
    .filter(Boolean)
    .join(" ")
    .trim() || "Kamerlid";
}

function dossierToItem(dossier: TkDossier): MonitorItem {
  const title = dossier.Titel ?? dossier.Citeertitel ?? `Dossier ${dossier.Nummer ?? ""}`.trim();

  return {
    kind: "dossier",
    id: dossier.Id ?? String(dossier.Nummer ?? title),
    title,
    eyebrow: "Dossier",
    description: [dossier.Kamer, dossier.Nummer ? `nr. ${dossier.Nummer}` : null, dossier.Afgesloten ? "afgesloten" : "actief"]
      .filter(Boolean)
      .join(" / "),
    date: formatTkDate(dossier.GewijzigdOp),
    status: dossier.Afgesloten ? "Afgesloten" : "Actief",
    meta: asRecord(dossier)
  };
}

function personToItem(person: TkPerson): MonitorItem {
  const title = personName(person);

  return {
    kind: "kamerlid",
    id: person.Id ?? String(person.Nummer ?? title),
    title,
    eyebrow: "Kamerlid",
    description: [person.Functie, person.Fractielabel].filter(Boolean).join(" / ") || "Tweede Kamer",
    date: formatTkDate(person.GewijzigdOp),
    status: person.Functie ?? undefined,
    meta: asRecord(person)
  };
}

function caseToItem(item: TkCase, kind: "motie" | "dossier" = "motie"): MonitorItem {
  const title = item.Onderwerp ?? item.Titel ?? item.Nummer ?? "Zaak";

  return {
    kind,
    id: item.Id ?? item.Nummer ?? title,
    title,
    eyebrow: item.Soort ?? (kind === "motie" ? "Motie" : "Zaak"),
    description: [item.Titel, item.Kabinetsappreciatie, item.Vergaderjaar].filter(Boolean).join(" / "),
    date: formatTkDate(item.GestartOp ?? item.GewijzigdOp),
    status: item.Status ?? undefined,
    meta: asRecord(item)
  };
}

function documentToItem(document: TkDocument): MonitorItem {
  const title = document.Onderwerp ?? document.Titel ?? document.DocumentNummer ?? "Kamerbrief";

  return {
    kind: "kamerbrief",
    id: document.Id ?? document.DocumentNummer ?? title,
    title,
    eyebrow: document.Soort ?? "Kamerbrief",
    description: [document.Titel, document.DocumentNummer, document.Vergaderjaar].filter(Boolean).join(" / "),
    date: formatTkDate(document.DatumOntvangst ?? document.Datum ?? document.GewijzigdOp),
    status: document.DocumentNummer ?? undefined,
    meta: asRecord(document)
  };
}

function voteToItem(vote: TkVote): MonitorItem {
  const actor = vote.ActorNaam ?? vote.ActorFractie ?? "Onbekende actor";
  const besluit = vote.Besluit?.BesluitSoort ?? vote.Besluit?.BesluitTekst ?? vote.Besluit?.Status;

  return {
    kind: "stemming",
    id: vote.Id ?? [vote.Besluit_Id, actor, vote.Soort].filter(Boolean).join(":"),
    title: `${actor} stemde ${vote.Soort ?? "onbekend"}`,
    eyebrow: "Stemming",
    description: [besluit, vote.ActorFractie, vote.Vergissing ? "vergissing gemarkeerd" : null].filter(Boolean).join(" / "),
    date: formatTkDate(vote.GewijzigdOp ?? vote.Besluit?.GewijzigdOp),
    status: vote.Soort ?? undefined,
    meta: asRecord(vote)
  };
}

function activityToItem(activity: TkActivity, kind: "activiteit" | "debat" = "activiteit"): MonitorItem {
  const title = activityTitle(activity);

  return {
    kind,
    id: activityId(activity),
    title,
    eyebrow: activity.Soort ?? (kind === "debat" ? "Debat" : "Activiteit"),
    description: [activity.Status, activity.Locatie, activity.Vergaderjaar].filter(Boolean).join(" / "),
    date: activityDate(activity),
    status: activity.Status ?? undefined,
    meta: asRecord(activity)
  };
}

function meetingToItem(meeting: TkMeeting): MonitorItem {
  const title = meeting.Titel ?? `${meeting.Soort ?? "Vergadering"} ${meeting.VergaderingNummer ?? ""}`.trim();

  return {
    kind: "debat",
    id: meeting.Id ?? title,
    title,
    eyebrow: meeting.Soort ? `${meeting.Soort} debat` : "Debat",
    description: [meeting.Zaal, meeting.Kamer, meeting.Vergaderjaar].filter(Boolean).join(" / "),
    date: formatTkDate(meeting.Aanvangstijd ?? meeting.Datum ?? meeting.GewijzigdOp),
    status: meeting.Sluiting ? "Afgelopen" : "Gepland",
    meta: asRecord(meeting)
  };
}

async function searchDossiers(query?: string, top = 6) {
  const rows = await tkFetch<TkDossier>("Kamerstukdossier", {
    $filter: withQuery("Verwijderd eq false", ["Titel", "Citeertitel"], query),
    $orderby: "GewijzigdOp desc",
    $top: top
  });

  return rows.map(dossierToItem);
}

async function searchMembers(query?: string, top = 6) {
  const rows = await tkFetch<TkPerson>("Persoon", {
    $filter: withQuery("Verwijderd eq false and Functie eq 'Tweede Kamerlid'", ["Achternaam", "Roepnaam", "Voornamen"], query),
    $orderby: query ? "GewijzigdOp desc" : "Achternaam asc",
    $top: top
  });

  return rows.map(personToItem);
}

async function searchMotions(query?: string, top = 6) {
  const rows = await tkFetch<TkCase>("Zaak", {
    $filter: withQuery("Verwijderd eq false and Soort eq 'Motie'", ["Onderwerp", "Titel", "Nummer"], query),
    $orderby: "GewijzigdOp desc",
    $top: top
  });

  return rows.map((item) => caseToItem(item, "motie"));
}

async function searchLetters(query?: string, top = 6) {
  const rows = await tkFetch<TkDocument>("Document", {
    $filter: withQuery("Verwijderd eq false and Soort eq 'Brief regering'", ["Onderwerp", "Titel", "DocumentNummer"], query),
    $orderby: "GewijzigdOp desc",
    $top: top
  });

  return rows.map(documentToItem);
}

async function searchVotes(query?: string, top = 6) {
  const rows = await tkFetch<TkVote>("Stemming", {
    $filter: withQuery("Verwijderd eq false", ["ActorNaam", "ActorFractie", "Soort"], query),
    $expand: "Besluit",
    $orderby: "GewijzigdOp desc",
    $top: top
  });

  return rows.map(voteToItem);
}

async function searchDebateActivities(query?: string, top = 6) {
  const rows = await tkFetch<TkActivity>("Activiteit", {
    $filter: withQuery("Verwijderd eq false and contains(Soort,'debat')", ["Onderwerp", "Soort"], query),
    $orderby: "GewijzigdOp desc",
    $top: top
  });

  return rows.map((activity) => activityToItem(activity, "debat"));
}

async function searchPastDebates(query?: string, top = 8) {
  const rows = await tkFetch<TkMeeting>("Vergadering", {
    $filter: withQuery("Verwijderd eq false and Sluiting ne null", ["Titel", "Soort", "Zaal"], query),
    $orderby: "Datum desc",
    $top: top
  });

  return rows.map(meetingToItem);
}

function themeItem(query: string): MonitorItem {
  const term = compactTerm(query);

  return {
    kind: "thema",
    id: term.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || term,
    title: term,
    eyebrow: "Thema",
    description: "Volg dit thema in moties, Kamerbrieven, debatten en dossiers.",
    date: "Doorlopend",
    meta: { query: term }
  };
}

export async function searchMonitor(query?: string): Promise<SearchSection[]> {
  const term = query?.trim() ?? "";
  const [dossiers, members, motions, letters, debates, votes] = await Promise.all([
    safeList(searchDossiers(term)),
    safeList(searchMembers(term)),
    safeList(searchMotions(term)),
    safeList(searchLetters(term)),
    safeList(searchDebateActivities(term)),
    safeList(searchVotes(term))
  ]);

  return [
    ...(term ? [{ id: "thema", title: "Thema volgen", items: [themeItem(term)] }] : []),
    { id: "dossiers", title: "Dossiers", items: dossiers },
    { id: "kamerleden", title: "Kamerleden", items: members },
    { id: "moties", title: "Moties", items: motions },
    { id: "kamerbrieven", title: "Kamerbrieven", items: letters },
    { id: "debatten", title: "Debatten", items: debates },
    { id: "stemmingen", title: "Stemmingen", items: votes }
  ];
}

export async function getDebateOverview(query?: string) {
  const [planned, past] = await Promise.all([
    safeList(searchDebateActivities(query, 8)),
    safeList(searchPastDebates(query, 12))
  ]);

  return { planned, past };
}

function searchTermForSavedItem(item: SavedItemRecord) {
  const label = item.label ?? item.ref_id;

  if (item.kind === "kamerlid") {
    const pieces = label.split(/\s+/).filter(Boolean);
    return pieces[pieces.length - 1] ?? label;
  }

  if (item.kind === "debat" || item.kind === "activiteit") {
    return label.replace(/^debat over\s+/i, "").split(/\s+/).slice(0, 8).join(" ");
  }

  return label;
}

async function developmentsForTerm(term: string, matchedOn: string) {
  const [letters, motions, debates, dossiers] = await Promise.all([
    safeList(searchLetters(term, 3)),
    safeList(searchMotions(term, 3)),
    safeList(searchDebateActivities(term, 3)),
    safeList(searchDossiers(term, 2))
  ]);

  return [...letters, ...motions, ...debates, ...dossiers].map((item) => ({ ...item, matchedOn }));
}

function dedupeItems(items: MonitorItem[]) {
  const seen = new Set<string>();
  const unique: MonitorItem[] = [];

  items.forEach((item) => {
    const key = `${item.kind}:${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  return unique;
}

export async function getDashboardDevelopments(savedItems: SavedItemRecord[]): Promise<DashboardDevelopments> {
  const themes = savedItems.filter((item) => item.kind === "thema" || item.kind === "dossier");
  const members = savedItems.filter((item) => item.kind === "kamerlid");
  const debates = savedItems.filter((item) => item.kind === "debat" || item.kind === "vergadering" || item.kind === "activiteit");
  const followed = [...themes, ...members, ...debates].slice(0, 8);

  const matchedGroups = await Promise.all(
    followed.map((item) => developmentsForTerm(searchTermForSavedItem(item), item.label ?? item.ref_id))
  );

  const votes = await safeList(searchVotes(undefined, 8));

  return {
    themes,
    members,
    debates,
    developments: dedupeItems(matchedGroups.flat()).slice(0, 14),
    votes
  };
}
