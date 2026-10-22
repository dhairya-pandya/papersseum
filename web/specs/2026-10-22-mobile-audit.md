# Mobile responsiveness and interaction audit

Date: 2026-10-22, on `main` after pulling `8d19fd1..` (11 files).
Method: Playwright against `next dev`, 23 routes at 320, 375 and 768 px (touch, mobile UA), full-page captures at 375, plus a scripted interaction pass at 375 (menu, banner, tabs, FAQ, theme, lesson demo). Mobile Chromium only; WebKit is not installed here, so nothing below is verified on iOS Safari.
Raw data: `D:\tmp\papersseum-audit\results-run.json`, screenshots in `D:\tmp\papersseum-audit\shots\`.

## Status

Fixed on branch `web/mobile-pass`: 1, 2 (the source, the clip stays as a backstop), 4, 5, 6, 7, 8, 10, every touch target in the P2 table, strategy tabs, the stats row, banner dismissal, the replay copy, 10 px text, safe areas and `viewport-fit=cover`, `100dvh`, the tap highlight, and S1-S10.

Not fixed in this PR:
- 3, the marketing playground. It's untracked and not shipped.
- Consolidating the 8 breakpoints. It's a refactor across every module, so it gets its own PR.
- The `params` outside `<Suspense>` warnings. That's a data-loading change, not a layout one.
- An automated overflow check in CI. It needs a running app with a seeded database in the workflow, which is an infrastructure decision.

Severity: **P0** breaks layout or scrolls the page sideways. **P1** hurts a real task on a phone. **P2** polish.

## Not covered: blocked by schema drift

The remote Supabase in `.env.local` is behind the code. `/matches`, `/matches/[id]` and `/bots/[name]` render their error state (`Couldn't load matches`, `Couldn't load this bot`) because Postgres returns `42703`:

- `column bots_2.appearance does not exist` (from #40, Bot Forge character)
- `column profiles_1.display_name does not exist`

`/me/*` and `/welcome` redirect to sign-in. These surfaces got a source-only review (section "Surfaces read from source" below), not a rendered one. Re-run `node D:\tmp\papersseum-audit\audit.mjs` once the migrations are applied and a test session exists.

## P0: the sideways scroll

### 1. Leaderboard podium is wider than the phone

`features/ladder/components/leaderboard-podium.module.css:1`

The podium overflows by 21 px at 375 and 77 px at 320. Third place (`safe2`) is cut off at the right edge and the page pans sideways.

Cause: `grid-template-columns: 1fr 1.15fr 1fr`. A bare `1fr` is `minmax(auto, 1fr)`, so a track can't shrink below its min-content. Min-content is the fixed sprite (`size={84}` / `112` in `leaderboard-podium.tsx:22`) plus `--space-4` padding on each side plus borders: about 118 + 146 + 118 = 382 px, inside a 343 px container.

Fix: `grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr)`, `min-width: 0` on `.card`, tighter horizontal padding under 640 px, and let the sprite scale (`width: 100%; max-width: 84px` or a smaller `size` under 640 px).

### 2. `html { overflow-x: clip }` hides overflow on desktop only

`app/globals.css:21`

The rule was added because the full-bleed `100vw` sections (`components/home/home.module.css:3` and `:10`) are wider than the page when Windows shows a classic scrollbar. It works for that case on desktop. On a phone it doesn't: with the podium overflowing, mobile Chromium grew the layout viewport to 396 px against a 390 px visual viewport, so the page pans sideways under a thumb even though desktop shows no scrollbar. That pan is the "random horizontal scroll" you saw.

So the clip masks bugs on the machine you test on and leaks them on the device users have. Fix the sources (item 1 and the `100vw` sections) and treat the clip as a backstop, not the fix:

- Full-bleed without `100vw`: `margin-inline: calc(50% - 50cqi)` inside a container, or `width: 100%` on a section placed outside `.wrap`.
- Add an overflow check to CI: the audit script already asserts `scrollWidth <= clientWidth` per route. Wire it into `tests/` so a new overflow fails the build instead of reaching a phone.

### 3. Marketing playground is 920 px wide on a phone

`app/playground/page.tsx` (untracked, dev-only). Artboards render at fixed export width (904 px). Low priority since it isn't shipped, but if it's meant to be previewed on a phone, scale the artboards with `transform: scale()` to fit the container width.

## P1: phone tasks that get harder

### 4. Docs: the full sidebar sits above the article

`app/docs/docs.module.css`. On `/docs/competition/what-you-submit` the article starts at y = 865 px, past the first 780 px viewport. A reader landing from a link sees only nav. The sidebar has 14 links and 4 group labels, all expanded.

Fix: under 900 px, collapse the sidebar into a disclosure ("Docs menu", current page shown as the summary) or a bottom sheet, and put breadcrumb + H1 first. The vault's tiering rule applies: docs is a *read* surface, so the article gets full parity and the nav steps aside.

### 5. Leaderboard table hides its key column

The table sits in `.table-scroll` (343 of 631 px visible), which correctly keeps the page from scrolling. But the visible part is `# / Bot / Owner`, and **Rating, Elo, ±, Games, Version** are all off-screen. A phone user sees names without scores. There's also no affordance that the table scrolls (no edge fade, no peek of a cut column, the last visible cell `Not…` just ends).

Fix: under 640 px, drop Owner, Elo, ± and Version, and show `Rating` and `Games` next to Bot. Keep the full table behind a "More columns" toggle or on the bot page. If the scroll stays, add an edge fade (`mask-image`) as the scroll cue.

### 6. Mobile menu drawer: no focus trap, no scroll lock

`components/ui/drawer.module.css`, menu in `components/shell/site-header.tsx`

- Focus moves to Close on open and returns to Menu on Esc. Good.
- ~~Tab escapes the drawer.~~ Wrong on a second look: the drawer marks the rest of the page `inert`, so Tab after the last item leaves for the browser chrome and comes back to Close. That is correct modal behaviour.
- The page behind still scrolls: a wheel of 600 px while the menu was open moved `scrollY` to 600. On touch this shows up as the page moving under the drawer. Add a body scroll lock while open and `overscroll-behavior: contain` on the panel.
- Current page is marked with `aria-current` but only by a colour step from muted to text, which is easy to miss. Add weight.
- Bigger question, not a bug: the trigger sits at the top of the screen, outside the thumb zone. The ArmorIQ shell retro in the vault (`10 Projects/armoriq-platform-proto/book/12-responsive-and-the-mobile-shell.md`) shipped a hamburger drawer, removed it nine days later and replaced it with a bottom-centre pill. Worth weighing if people navigate on phones a lot (Arena, Leaderboard, Matches between rounds).

### 7. Home: the ladder marquee can't be paused on touch

`components/home/home.module.css:113-115`. The "On the ladder now" strip animates for 40 s per loop and pauses only on `:hover`. Touch has no hover, so the bot links are moving targets, and moving content longer than 5 s needs a pause control (WCAG 2.2.2). Reduced motion is handled (`:161-163`). Fix: pause on `:focus-within` and on `touchstart`, or turn it into a swipeable `scroll-snap` row on `(hover: none)`.

### 8. Hover-only motion sticks on tap

79 `:hover` rules, 14 gated behind `(hover: hover)`. Ungated ones that move things will stick after a tap on iOS until the user taps elsewhere:

- `components/home/home.module.css:64` `.card:hover` lifts the card 3 px.
- `features/ladder/components/matches/matches.module.css:87` lifts the stage sprite.
- `features/ladder/components/leaderboard-podium.module.css` `.card:hover` background.

Fix: wrap transform/background hover effects in `@media (hover: hover) and (pointer: fine)`, the pattern the button and FAQ already use.

### 9. ~~Lesson demo grid wraps unevenly~~

Wrong. The corridor is already `repeat(8, minmax(0, 1fr))`. What looked like a wrapped cell is the first cell's "start" label stacked above its arrow.

### 10. Lesson comparison table squeezes to one word per line

Same lesson, "Agent / Environment / Action / Reward" table. Four columns at 343 px wrap to 1-2 words per line, so each row is 5-7 lines tall. It sits in `.table-scroll` (343/356 px), so it scrolls 13 px, which reads as a glitch rather than a scroll. Fix: let it scroll properly with `min-width` on the table (~480 px) and an edge fade, or stack rows into definition lists under 560 px.

## P2: polish

### Touch targets

WCAG 2.2 AA floor is 24 x 24 px; the touch default is 44 (vault: `20 Areas/Design Systems/Foundations and accessibility.md`). Below 24 at 375:

| Control | Size | Where |
|---|---|---|
| Paused banner close `×` | 17 x 18 | every page |
| Banner `Status` link | 39 x 20 | every page |
| Course map squares | 14 x 14 (15 of them) | `/learn` "Your progress" |
| `Read the rules`, `See the leaderboard`, `Try again`, `Start over` text buttons | ~23 tall | home, 404, admin, error states, lesson |
| Theme switcher System / Light / Dark | 59/45/44 x 25 | footer, every page |
| Code block `Copy` | 46 x 24 | home terminal |
| Terminal `Replay` | 60 x 29 | home |

The banner close is the worst: it's the one control people try to hit on first load. Give it a 44 px hit area (padding or a `::before` inset) without changing the glyph. Course map squares can stay 14 px visually if the link box is larger or the row becomes non-interactive on touch.

### Home page details

- Strategy tabs (`Greedy / Safe expander / Hunter / Random / Neural net`) wrap to two rows inside one pill. Make the tablist a single `overflow-x: auto` row with `scroll-snap`, or a segmented control that scrolls.
- Stats row: "Next round: After the queue clears" wraps to 4 lines in a third-width cell while the other two cells show a short number. Use a shorter value ("Queued") with the long text as a caption, or stack the row under 400 px.
- ~~Install terminal: empty black area.~~ Not a bug. The screen reserves its full height (`min-height: 300px`) so lines typing in don't shift the page, and the full-page capture ran before the animation finished.
- Paused banner takes ~72 px of a 780 px viewport and comes back on every reload; dismissal is `useState` only (`components/shell/paused-banner.tsx:19`). Persist it in `sessionStorage`.

### Replay page

`/replay` says "Drop a replay file here, or choose one." Phones have no drag and drop. Under `(pointer: coarse)` lead with "Choose a replay file". The hidden file input is 14 px font; harmless while it's visually hidden, but if it ever becomes visible it will trigger iOS zoom on focus.

### Small text

10 px text on the leaderboard: the provisional `P` marker and the `house` tag. Below 11 px is hard to read on a phone; use 11-12 px.

### System-wide

- **8 different phone and tablet cutoffs** (520, 560, 640, 720, 760, 800, 860, 900). The menu switches at 640, the matches list at 720, forge and docs at 860. Every component decides its own phone cutoff. Pick 2-3 (for example 560 and 900) as tokens and migrate. The vault's lesson from the ArmorIQ rebuild: tier surfaces by job (read, scan, navigate, author), not a breakpoint per component.
- **No `env(safe-area-inset-*)` anywhere.** The sticky header and any bottom-fixed toast or bar will sit under the notch or home indicator when the site is added to the home screen or viewed in landscape. Add `viewport-fit=cover` to the viewport export and pad fixed bars.
- **`100vh`** in `app/globals.css:14` and `app/docs/docs.module.css:2`. On mobile browsers `100vh` is the largest viewport, so the docs sidebar's `max-height` is taller than the visible area while the URL bar shows. Use `100dvh` (or `svh` for the sidebar).
- **No `-webkit-tap-highlight-color`** set, so Android shows the default blue tap flash on every card and link alongside the custom pressed states.
- `/learn/[slug]` and `/docs/[...slug]` log a Next.js warning that `params` is read outside `<Suspense>`, which blocks instant navigation. Not a layout bug, but it makes navigation on a slow phone connection feel worse.

## What passed

- No sideways overflow on 21 of 23 routes at 320, 375 and 768 px (leaderboard and the dev playground were the exceptions).
- Viewport meta is correct: `width=device-width, initial-scale=1`, no `maximum-scale`, so pinch zoom works.
- No visible input below 16 px on the public routes. Signed-in inputs are a different story, see S5.
- Menu drawer: Esc closes it, focus goes to Close on open and back to Menu on close.
- FAQ rows are 343 x 64-77 px tap targets.
- Strategy tabs are 38 px tall with proper `role="tab"`.
- `prefers-reduced-motion` is handled in 24 places, including the marquee.
- Dark theme renders on the leaderboard, replay and home without contrast breaks in the screenshots.
- Code blocks in docs scroll inside their own box (`pre` 341/380 px) and don't push the page.

## Surfaces read from source

From the CSS and TSX only, so treat these as likely, not observed. Re-check each one in the browser once the DB is migrated.

### P1

| # | Where | What breaks at 375 | Fix |
|---|---|---|---|
| S1 | `features/replay/components/replay-viewer.tsx` (~335), `app/globals.css:117` | Replay speed buttons are `.link-button` with no padding, so they're about 14-18 px tall with 10 px gaps | `min-height: 32px; padding: 0 8px`, or `Button size="sm"` |
| S2 | `features/replay/components/replay-moments.module.css:2-24` | Scrubber event marks sit in a 12 px lane with 10 px text and only grow on `:hover`. On a 300 px scrubber they're too small to tap and overlap when events are dense | Hide `.marks` under 640 px and use the `.moments` list, or give marks a 24 px hit area |
| S3 | `.replay-scrub`, `app/globals.css:116` | The native range thumb is about 16-20 px, and with no `touch-action` it competes with page scroll | `touch-action: pan-y`, taller hit area |
| S4 | `app/globals.css:116`, `replay-moments.module.css:2` | Controls row wraps unpredictably (Play, scrubber, clock, speeds) | Two-row grid under 640 px with the scrubber full width |
| S5 | `components/me/me.module.css:8`, `app/admin/admin.module.css:67-74` | Rename and admin filter inputs inherit 15 px, so iOS zooms on focus | `font-size: max(16px, 1em)` |
| S6 | `components/me/forge.module.css:18-27` | Bot Forge option chips and arrows are about 33 px, swatches about 32 px | `min-height: 40px`, arrows 44 px, under 640 px |
| S7 | `components/ui/button.module.css:40` | `.sm` buttons are 28 px tall, and they carry primary actions such as "Make active" in versions | Raise `--btn-h` to 36-40 px under 640 px |
| S8 | `components/ui/toast.module.css:72-76` | Toasts are fixed to the bottom with no safe-area inset, so they sit on the home indicator | `bottom: calc(var(--space-5) + env(safe-area-inset-bottom))` plus `viewport-fit=cover` |
| S9 | `app/me/versions/page.tsx:41-52` | Versions table has 8 columns, so on a phone the version and "Make active" scroll out of view | Stack as cards under 640 px, or pin the first column and the action |
| S10 | `app/matches/[id]/page.tsx:51-56` | Results table has 7 columns, and nowrap bot names push it to about 600 px | Drop deaths and strikes under 640 px |

### P2

- `features/ladder/components/matches/matches.module.css:19`: from 721 to 900 px the desktop grid keeps 52 px and 128 px fixed tracks, leaving about 100 px per middle column (suspect, tablet only). The layout at 720 px and below is fine.
- `matches.module.css:106`: pagination links are 32 px tall.
- `components/shell/nav.module.css:23`: the Menu button is 62 x 36. Measured in the browser, so this one is confirmed. Make it 44 px tall.
- These read clean: bot profile hero (stacks, `overflow-wrap: anywhere` on names), Elo line (fluid SVG), forge stage (unsticks under 860 px), admin rows (truncate), welcome grids (collapse at 760 px), replay canvas (`width: 100%`), drawer and toast widths (capped to the viewport).
