export type SavedItemKind =
  | "thema"
  | "dossier"
  | "kamerlid"
  | "fractie"
  | "motie"
  | "stemming"
  | "vergadering"
  | "activiteit"
  | "kamerbrief"
  | "debat"
  | "vraag"
  | "toezegging";

export type SavedItemRecord = {
  id: string;
  kind: SavedItemKind;
  ref_id: string;
  label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const kindLabels: Record<SavedItemKind, string> = {
  thema: "Thema",
  dossier: "Dossier",
  kamerlid: "Kamerlid",
  fractie: "Fractie",
  motie: "Motie",
  stemming: "Stemming",
  vergadering: "Vergadering",
  activiteit: "Activiteit",
  kamerbrief: "Kamerbrief",
  debat: "Debat",
  vraag: "Vraag",
  toezegging: "Toezegging"
};

export function savedKindLabel(kind: SavedItemKind | string) {
  return kindLabels[kind as SavedItemKind] ?? kind;
}
