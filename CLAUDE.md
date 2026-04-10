# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript compile + Vite build (tsc -b && vite build)
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

This is a React 19 + TypeScript SPA for tracking a herd of guinea pigs. It uses Vite, React Router, and Supabase (auth, database, file storage). It's a PWA with offline support.

### Data Flow

All data access goes through service modules in `src/services/` which call Supabase directly. There is no global state management — components use local state with `useState`/`useEffect` and call service functions. Auth state comes from `src/hooks/useAuth.ts`.

### Key Entities

- **Pigs** (`pigs` table): name, dob, gender, desexed, description, image, last_sighted, passed_away
- **Health Records** (`health_data` table): nail_clip, haircut, notes — linked to pig_id
- **Relationships** (`pig_relationships` table): directed edges between pigs with types: `parent`, `sibling`, `foster_sibling`. The service layer resolves bidirectional lookups.

### Routes

- `/` — HomePage: lists living pigs sorted by least recently sighted, plus passed pigs
- `/pigs/:id` — PigPage: detail view with health panel, family panel, sighting button
- `/tree` — FamilyTreePage: ReactFlow graph visualization of family relationships

### Services (`src/services/`)

- `pigs.service.ts` — CRUD for pigs
- `pig-health.service.ts` — health record operations
- `pig-relationships.service.ts` — relationship queries with bidirectional edge resolution
- `pig-images.service.ts` — image compression (max 0.5MB/800px), upload to `pig_photos` bucket, signed URL generation (1-hour expiry)

### Supabase

Client initialized in `utils/supabase-client.ts`. Storage bucket: `pig_photos`. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Styling

Custom CSS with CSS variables defined in `src/variables.css`. No Tailwind. Uses "Fuzzy Bubbles" Google Font. Purple/pink/blue palette. Emoji-heavy UI.

### Types

Generated Supabase types in `src/types/database.types.ts`. Gender enum: `"female" | "male"`. Relationship types enum: `"parent" | "sibling" | "foster"`.
