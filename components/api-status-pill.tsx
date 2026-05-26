export function ApiStatusPill({ apiOk }: { apiOk: boolean }) {
  return (
    <span className={apiOk ? "api-pill live" : "api-pill sample"}>
      {apiOk ? "Live Tweede Kamer Open Data" : "Voorbeelddata / API onbereikbaar"}
    </span>
  );
}
