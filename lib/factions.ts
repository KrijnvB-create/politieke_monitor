const factionColors: Record<string, string> = {
  "D66": "#1f78c8",
  "VVD": "#2454a6",
  "GroenLinks-PvdA": "#5b8f3a",
  "PVV": "#1d4f91",
  "CDA": "#2f7f54",
  "JA21": "#263b73",
  "FVD": "#7a2f66",
  "BBB": "#5c8b2f",
  "SP": "#c9302c",
  "PvdD": "#2f8f4e",
  "ChristenUnie": "#2e65a3",
  "SGP": "#e07b2d",
  "DENK": "#2f9f8f",
  "Volt": "#6d3fc8",
  "50PLUS": "#8a5a2b"
};

export function factionColor(label?: string | null) {
  if (!label) {
    return "#6b7280";
  }

  return factionColors[label] ?? "#50606f";
}
