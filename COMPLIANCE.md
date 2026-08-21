# Compliance Register

Snapshot: 22 Aug 2026 · Commit reviewed: `18ea0e0` · Reviewed by: GG Coder compliance-guard
**This is engineering guidance, not legal advice. Nothing here says the app is "compliant".**

## What was and was not checked

- **Checked:** the repo at `18ea0e0` — schema, API routes, auth, third-party clients, UI source, config.
- **Ran:** `npm run dev` locally, screenshotted `/privacy` and `/terms`, and queried the **production** database
  read-only via `railway run` (see below).
- **Not checked:** production env-var *values*, anything added through the Railway dashboard rather than the repo.
  Runtime-injected scripts remain invisible to this review.

## Production facts (RUNTIME, 22 Aug 2026)

Queried read-only against the live Railway Postgres. **No writes, no migrations were run against production.**

| Fact | Value |
| --- | --- |
| Users | **70 real accounts** — this is not a prototype |
| Saved searches | 22 |
| Postgres version | **17.10** (local dev is 16 — rehearsals were re-run on 17 to match) |
| Migrations recorded | **5** of the repo's 8 |
| `Search` / `SearchResult` | Present, **0 rows in both** — confirms they are dead, drop is safe |
| `SavedSearchResult` count columns | Still `NOT NULL` — pre-migration state |
| Deploy behaviour | `railway.json` sets `preDeployCommand: prisma migrate deploy`, so **all 3 new migrations apply automatically on the next push** |
| `/privacy`, `/terms` in production | **307 → /login** — the old build is live; the policy is not yet reachable |

### Production-shaped rehearsal (RUNTIME)

A schema-only `pg_dump` of production was restored into a throwaway Postgres **17** container, seeded with the
5 recorded migrations and a representative saved result, then `prisma migrate deploy` was run — the exact command
Railway will execute:

- All 3 pending migrations applied cleanly.
- The seeded saved result survived intact: `viewCount` 987654, title and creator unchanged.
- `Search` / `SearchResult` dropped; the guard passed because both were empty, matching production.
- Drift against `schema.prisma` afterwards: **zero**.
- `verify-retention` passed all 8 guards against that PG17 copy.

## Assumed exposure profile

| Fact | Value | Confidence |
| --- | --- | --- |
| Operator | **Ken Kai's Group, Australia** — contact `ken@kenkais.com` | Confirmed (stated by operator) |
| Primary regime | **Australian Privacy Act / APPs**; UK/EU and US apply to users located there | Assumed |
| Reach | Invite-only, no self-signup (`/api/admin/invite` is the only account-creation path) | Confirmed (code) |
| Deployment | Public internet via Railway (`railway.json`, Dockerfile) | Confirmed (code) |
| Money | None. No payment SDK, no plan/subscription tables | Confirmed (code) |
| Users | Real people, invited by the operator | Stated by operator |
| Jurisdictions | Reachable worldwide → UK/EU + US all apply. Operator location unknown | Assumed |
| Personal data (users) | Email, name, bcrypt password hash, searches, saved content, scripts, encrypted API keys | Confirmed (code) |
| Personal data (third parties) | Creator names, creator IDs, thumbnails, transcripts of other people's videos | Confirmed (code) |
| Minors | No age gate. Low risk given invite-only | Assumed |
| Tracking | **None.** No analytics, ad pixel, session replay, or third-party cookie anywhere in the source | Confirmed (code) |
| AI | OpenRouter → user-selected model, given transcript text | Confirmed (code) |

## Coverage ledger

| # | Checklist item | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Committed secrets / `.gitignore` gaps | **pass** | `.env*` ignored except `.env.example`; `git ls-files` shows no secret files; `.env` absent from history (RUNTIME) |
| 2 | Row-level security / data-layer authorization | **pass** | Prisma runs server-side only, no client SDK. Every route scopes by `userId` from the session (CODE) |
| 3 | Authentication strength | **pass** | bcrypt cost-12, dummy-hash timing defence, rate-limited login, JWT revocation on password change (CODE) |
| 4 | Authorization on admin surface | **pass** | `ADMIN_SECRET` bearer + constant-time compare + per-IP rate limit; `/admin` also requires a session (CODE) |
| 4b | Webhook signature verification | **n-a** | No inbound webhooks |
| 5 | Rate limits on expensive endpoints | **pass** | Redis-backed limiter; `expensive` preset on transcript/LLM routes (CODE) |
| 6 | Secrets at rest | **pass** | User API keys AES-256-GCM encrypted via `ENCRYPTION_SECRET` (CODE) |
| 7 | Security headers / HTTPS | **pass** | HSTS, frame-deny, nosniff, referrer, permissions-policy, COOP in `next.config.ts` (CODE) |
| 8 | Storage buckets / client-supplied filenames | **n-a** | No uploads |
| 9 | Privacy policy exists and is reachable | **fixed** | Was absent; `/privacy` now returns 200 unauthenticated (RUNTIME) |
| 10 | Terms of use exists | **fixed** | `/terms` now returns 200 unauthenticated (RUNTIME) |
| 11 | Third-party / platform terms | **fail** | See F-1, F-2 |
| 12 | Data retention rule for cached third-party data | **fail** | See F-1 — nothing is ever purged |
| 13 | Account deletion + data export path | **fail** | See F-4 |
| 14 | Breach notification / contact point | **fail** | See F-5 |
| 15 | Minors — actual age gate | **fail** | No age check anywhere. Low probability: invite-only, operator controls who joins |
| 16 | Consent for tracking | **n-a** | No trackers to consent to. Session cookie is strictly necessary |
| 17 | Consumer contract duties (US ROSCA / EU withdrawal right) | **n-a** | No money changes hands |
| 18 | Platform duties (US DMCA agent / EU DSA) | **n-a** | Users cannot publish to or message each other; no UGC surface |
| 19 | AI transparency | **fixed** | AI-output disclaimer added to `/terms` |
| 20 | A11y — image alternatives | **pass** | `alt=""` on avatars/thumbnails is correct: they are decorative, the name/title is adjacent text (CODE) |
| 21 | A11y — form labels | **pass** | `<label htmlFor>` on every input in `AuthForm.tsx` (CODE) |
| 22 | A11y — keyboard operability | **fixed** | Sortable `<th onClick>` was mouse-only; now a real `<button>` with `aria-sort` |
| 23 | A11y — colour contrast | **fail** | See F-6 |
| 24 | A11y — focus visibility | **partial** | Auth inputs and buttons have focus rings; many table/menu controls rely on the browser default |
| 25 | A11y — zoom / text resize | **fixed** | `maximumScale: 1, userScalable: false` removed from `layout.tsx` |
| 26 | A11y — page language | **pass** | `<html lang="en">` |
| 27 | A11y — media captions | **n-a** | No `<audio>`/`<video>` elements |
| 28 | Fabricated testimonials / fake urgency | **pass** | None present |

## Findings

| ID | Severity | Trigger | Evidence | Obligation | Status |
| --- | --- | --- | --- | --- | --- |
| F-1 | **HIGH** | YouTube data cached forever | CODE — `SavedSearchResult`, `SavedItem`, `RepurposeVideo` store `viewCount`/`likeCount`/`commentCount`; no purge job existed | YouTube API Services Developer Policies III.E.4: non-authorized statistics must not be stored beyond 30 calendar days; other non-authorized data must be deleted or refreshed after 30 days | **Fixed in code, not yet scheduled** — `purgeStaleStats()` + `POST /api/admin/retention`; needs the cron in F-9 |
| F-8 | **HIGH** | Four tables created with `db push`, never migrated | RUNTIME — `prisma migrate deploy` into an empty database then failed with `The table public.RepurposeVideo does not exist`; `LlmModel`, `Script` and `UserSettings` were missing too | A restore or a rebuild from the repo produced a database missing a third of the app. Migrations must reproduce the live schema | **Fixed** — `20260822130000_baseline_db_push_tables`; drift now zero (RUNTIME) |
| F-9 | **MEDIUM** | Retention job has no scheduler | DEDUCED — no cron in `railway.json`, no scheduler anywhere in the repo | The purge only satisfies the 30-day rule if something actually calls it | **Fixed** — `src/instrumentation.ts` starts an in-process scheduler on server boot; runs 60s after start, then every 12h (RUNTIME: observed expiring a seeded stale row) |
| F-10 | **MEDIUM** | `Search` / `SearchResult` tables are dead | RUNTIME — zero `prisma.search*` call sites in `src/` once the generated client is excluded; recent searches live in `localStorage`, bookmarks in `SavedSearch` | Dead tables carrying a personal-data schema (query text + creator data) that nothing reads, so nothing ages out of them | **Fixed** — dropped in `20260822140000_drop_dead_search_tables`, guarded so it aborts rather than destroy unseen rows |
| F-2 | **HIGH** | Instagram/TikTok data via scraper resellers | CODE — `instagram-looter2.p.rapidapi.com`, `tiktok-scraper7.p.rapidapi.com` | These are unofficial scrapers, not platform APIs. Meta and TikTok both prohibit automated collection; exposure is contractual (Meta has sued scrapers), plus GDPR liability for the creator data they return | **Open — needs your decision** |
| F-3 | **MEDIUM** | Creator personal data stored | CODE — `creatorName`, `creatorId`, thumbnails, full transcripts of third parties' videos | Creators are data subjects you have no relationship with. Keep it minimal, keep it short-lived, delete on request. F-1's 30-day purge largely resolves this | Partly covered by F-1 |
| F-4 | **MEDIUM** | No deletion or export path | DEDUCED — no `DELETE /api/user`, no export route; `onDelete: Cascade` exists on every relation so a single user delete would work | Users must be able to get a copy of their data and have it erased. A documented manual process is acceptable at this size | **Open** — email process now stated in `/privacy` |
| F-5 | **MEDIUM** | No breach process, no contact point | DEDUCED | UK/EU: 72 hours to notify the regulator after becoming aware of a personal-data breach. Needs a named contact and a written plan, not code | **Open** |
| F-6 | **MEDIUM** | Low-contrast text | CODE — `text-white/30` = **2.5:1**, `text-white/40` = **3.7:1** against `bg-black`; 83 occurrences across 12 files. WCAG AA needs 4.5:1 | Accessibility of a public UI. `text-white/50` (5.3:1) and above already pass | **Open** — one-line fix, see below |
| F-7 | **LOW** | No age gate | CODE | Invite-only makes this near-theoretical; `/privacy` now states a minimum age | **Accepted risk** |

## Implemented in this pass

- `src/app/(legal)/privacy/page.tsx` — privacy policy **template**, including the YouTube-mandated clauses
  (uses YouTube API Services, links YouTube ToS, Google Privacy Policy, and Google's revocation settings page).
- `src/app/(legal)/terms/page.tsx` — terms **template**, including the mandatory "you agree to be bound by the
  YouTube Terms of Service" clause and an AI-output disclaimer.
- `src/lib/auth.config.ts` — `/privacy` and `/terms` reachable without a session.
- `src/app/(auth)/login/page.tsx` — links both documents at the point of sign-in.
- `src/components/auth/UserMenu.tsx` — privacy link persistently available inside the app.
- `src/app/layout.tsx` — pinch-zoom re-enabled.
- `src/components/data-table/DataTable.tsx` — table sorting is keyboard-operable and announces sort state.
- `src/lib/retention.ts` — `purgeStaleStats()`: expires cached statistics older than 30 days across
  `SavedSearchResult`, `SavedItem` and `RepurposeVideo`. Nulls the numbers, keeps the saved row. Every write
  is age-filtered, nothing is ever deleted, and `dryRun` counts first.
- `prisma/migrations/20260822120000_expire_cached_platform_stats` — makes the three count columns nullable so
  "expired" is representable. Widening only: no rewrite, no data loss.
- `prisma/migrations/20260822130000_baseline_db_push_tables` — the missing F-8 baseline. Idempotent
  (`IF NOT EXISTS` + `DO`/`EXCEPTION` blocks), so it is a no-op against the existing production database.
- `src/app/api/admin/retention/route.ts` — `POST /api/admin/retention`, behind the existing `ADMIN_SECRET`
  bearer + per-IP rate limit. `?dryRun=1` counts without writing.
- `src/app/api/saved/route.ts`, `src/types/index.ts`, `src/lib/utils.ts`, `DataTable.tsx` — an expired count now
  renders as `—`. It used to coerce to `0`, which would have shown a saved video as having zero views.
- `prisma/migrations/20260822140000_drop_dead_search_tables` — drops the dead `Search` / `SearchResult` tables.
  **Guarded**: it counts both tables first and raises if either holds a row, rolling the whole migration back with
  the tables intact. Production contents were never inspected, so the migration refuses to guess.
- `prisma/schema.prisma`, `src/types/index.ts` — the two dead models and the orphaned `SearchResult` interface removed.

### Verification (all RUNTIME, against local Postgres — never production)

| Drill | Result |
| --- | --- |
| Migrations into an empty database | 7/7 applied; `migrate status` clean |
| Drift check after applying | Zero — migrations now reproduce `schema.prisma` exactly |
| Both new migrations on a production-shaped database (tables pre-existing, columns still `NOT NULL`) | Applied cleanly, every existing object skipped |
| Existing count preserved across the nullable migration | `viewCount` 999 before → 999 after |
| `npm run verify:retention` | 8/8 guards pass: stale expired, fresh untouched, saved rows survive, dry run writes nothing, re-run is a no-op, nothing deleted |
| Drop migration on an **empty** database | Both tables dropped, exit 0, drift still zero |
| Drop migration on a database with **1 row** in `Search` | Refused with exit 3; the table and its row survived the abort |
| Same database after deleting the row | Dropped cleanly, exit 0 — the documented recovery path works |

`npm run lint`, `npm run typecheck` and `prettier --check` pass. `/privacy` and `/terms` return 200 unauthenticated.
**Not verified:** production. No migration was run against the live Railway database.

## Open — needs a decision from you

1. **Deploy.** The documents are complete — zero placeholders remain. Until you push, those 70 users still have
   no privacy policy, because production serves the old build (`/privacy` currently 307s to `/login`).
2. ~~**F-9 — schedule the purge.**~~ **Done** — the app schedules itself on boot. The endpoint below still works
   for a manual run:

   ```
   curl -fsS -X POST https://<your-host>/api/admin/retention \
     -H "Authorization: Bearer $ADMIN_SECRET"
   ```

   Run `?dryRun=1` first to see the counts. Daily is plenty.
3. **F-8 — one command on production**, before the next deploy that runs migrations:
   `npx prisma migrate resolve --applied 20260822130000_baseline_db_push_tables`. This records the baseline as
   already-applied. It is also safe to skip: the migration is idempotent and will simply no-op.
4. **F-2 — the Instagram/TikTok scrapers.** Keep them and accept the risk, or drop those platforms.
5. **F-6 — contrast.** `sed -i '' -E 's/text-white\/(30|40)/text-white\/60/g' src/**/*.tsx` fixes all 83 sites;
   it lightens dim secondary text, so it is a visible change.

## Needs a lawyer

- Whether **Ken Kai's Group** is a registered entity and whether the Australian Privacy Act's small-business
  exemption applies to it — that changes which obligations bind you at home. The policy is written to the
  stricter reading either way.
- Whether your use of the Instagram/TikTok scraper resellers is defensible where you live (F-2).
- Whether storing third-party creators' transcripts and metadata needs its own lawful basis under UK/EU law (F-3).
- Confirming the liability and warranty wording in `/terms` actually holds in your jurisdiction.

## Re-verify before relying (date-sensitive)

- YouTube API Services Developer Policies §III.E.4 (the 30-day rule) — read 22 Aug 2026, but Google revises
  these policies; re-check before treating the 30-day number as current.
- Guidance snapshot behind this review is dated 11 Aug 2026.
