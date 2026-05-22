const TK_API_BASE = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";

export type TkActivity = {
  Id?: string;
  Nummer?: string;
  Soort?: string;
  Onderwerp?: string;
  Titel?: string;
  Status?: string;
  Datum?: string;
  GewijzigdOp?: string;
  Verwijderd?: boolean;
};

export async function getRecentActivities() {
  const params = new URLSearchParams();
  params.set("$filter", "Verwijderd eq false");
  params.set("$orderby", "GewijzigdOp desc");
  params.set("$top", "8");

  const response = await fetch(`${TK_API_BASE}/Activiteit?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 15 * 60 }
  });

  if (!response.ok) {
    throw new Error(`Tweede Kamer API returned ${response.status}`);
  }

  const payload = (await response.json()) as { value?: TkActivity[] };
  return payload.value ?? [];
}

export function activityId(activity: TkActivity) {
  const fallback = [activity.Soort, activity.GewijzigdOp, activity.Onderwerp].filter(Boolean).join(":");
  return activity.Id ?? activity.Nummer ?? (fallback || "activiteit-onbekend");
}

export function activityTitle(activity: TkActivity) {
  return activity.Onderwerp ?? activity.Titel ?? activity.Soort ?? "Tweede Kamer-activiteit";
}

export function activityDate(activity: TkActivity) {
  const value = activity.Datum ?? activity.GewijzigdOp;

  if (!value) {
    return "Datum onbekend";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
