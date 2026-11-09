# LSTU Website (demo)

Demo website for **Lakshmipur Science and Technology University (LSTU)**, built in a classic academic style with [Astro](https://astro.build).

## Run it locally

```bash
npm install
npm run dev      # http://localhost:4321/LSTUDEmo/
npm run build    # static site in dist/
```

## Pages

Home, About, Academics (faculties, departments, academic calendar), one page per department, Admission, Notice Board (with category filter), each notice, News and Events, Contact, 404.

## Adding content

No code needed, just add a Markdown file:

| What | Folder | Fields |
|---|---|---|
| Notice | `src/content/notices/` | `title`, `date`, `category` (Admission, Exam, General, Tender, Recruitment), optional `pdf` |
| News or event | `src/content/news/` | `title`, `date`, `type` (News or Event), `summary` |
| Department | `src/content/departments/` | `name`, `short`, `faculty`, `order`, `seats`, `programs` |

PDFs and photos go in `public/files/` and `public/images/`.

Site name, contact details, faculties and the menu are in `src/lib/site.ts`. Colours and fonts are at the top of `src/styles/global.css`.

## Deploying

`.github/workflows/deploy.yml` publishes the site to GitHub Pages on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. The site will be at https://rafat12-cyber.github.io/LSTUDEmo/.

For a custom domain, change `site` and set `base: '/'` in `astro.config.mjs`.

## Note

Names, numbers, dates and contact details are placeholders for the demo and should be replaced with official information.

## AI assistant ("Ask LSTU")

The chat button in the bottom-right corner opens the LSTU Assistant (`src/components/Assistant.astro`, `src/scripts/assistant.ts`).

- **Demo mode (now):** answers come from the website itself. At build time `src/pages/assistant-index.json.ts` publishes `/assistant-index.json` with every page, department, notice and news item, and the widget searches it and links visitors to the right page.
- **Connecting a real AI later:** build the site with `PUBLIC_ASSISTANT_API=https://your-backend/chat`. The widget then POSTs
  `{ "message": "...", "history": [{ "role": "user" | "assistant", "content": "..." }], "page": "/LSTUDEmo/admission" }`
  and expects `{ "reply": "text", "links": [{ "title": "...", "url": "..." }] }` back. If the API is unreachable it falls back to demo answers. Keep the AI provider's API key on that backend (for example the future admin panel), never in this static site.

## Motion and 3D

- `src/three/` holds the real 3D scenes, built with three.js, which only loads on pages that use it and only if the browser supports WebGL:
  - `models.ts`: the crest (shield, four quadrants, LSTU, Bangla ribbon) and each symbol as a 3D model (atom, sun over an open book, palms and sea, seedling).
  - `hero.ts`: the whole home page hero as one scene. A moonlit Meghna night with reflective water (three.js `Water`), a detailed moon, clouds, a lighthouse, village lights, nowkas, and river banks with coconut palms and boroi trees (`riverside.ts`). A ship with a sailor whose torch lights the crest. Visitors drag the crest to turn it and drag the torch light to move it. When the light leaves the crest, it loses its neon glow. The crest is placed over the `.holo-stage` box in `HoloCrest.astro`, so the page layout decides where it sits.
  - `crest3d.ts`: the 3D crest. Each logo symbol sits in its own recessed window, clipped so it never crosses the border, and shifts with the pointer for depth.
  - `scenes.ts`: the section scenes (atom, book and sun, Meghna waves, seedling).
  - `stage.ts`: renders each scene only while it's on screen and pauses when the tab is hidden.
- `src/scripts/bg3d.ts`: soft drifting gold points behind every page.
- `src/scripts/motion.ts` + `src/styles/motion.css`: scroll reveals, card tilt, counters and the progress bar.
- Visitors who set "reduce motion" on their device get still frames. Without WebGL, the hero shows the logo image.
