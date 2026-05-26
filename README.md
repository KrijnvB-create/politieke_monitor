# Kamerkompas

Dashboard voor politiekemonitor.com rond Tweede Kamer-agenda, stemmingen, Kamerbrieven, dossiers, Kamerleden en fracties.

## Wat zit erin

- Next.js App Router met TypeScript
- Dagdashboard met "Nu in de Kamer", recente wijzigingen, weekagenda, stemmingen, moties, Kamerbrieven, toezeggingen en zetelverdeling
- Hoofdsecties voor Stemmingen, Agenda, Kamerbrieven, Dossiers, Kamerleden, Fracties, Verslag en Zoeken
- Zoekpagina voor dossiers, Kamerleden, moties, amendementen, wetten, stemmingen, Kamerbrieven en debatten
- Persoonlijk dashboard met recente ontwikkelingen rond gevolgde thema's, Kamerleden en debatten
- Supabase login via Google en GitHub
- `profiles` en `saved_items` tabellen met Row Level Security
- Bewaar-knoppen en een persoonlijke opgeslagen-pagina

## Start in GitHub Codespaces

```bash
npm install
cp .env.example .env.local
npm run dev
```

Vul in `.env.local` je Supabase waarden in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase

Open `supabase-schema.sql`, plak alles in Supabase SQL Editor en klik `Run`.

Zet daarna in Supabase Authentication de Google en GitHub providers aan.

## Vercel

Voeg dezelfde twee environment variables toe in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Daarna kan Vercel automatisch deployen vanaf GitHub.
