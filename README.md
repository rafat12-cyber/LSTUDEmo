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

- `src/components/HoloCrest.astro` + `src/scripts/holo.ts` + `src/styles/holo.css`: the holographic crest in the hero (drag, arrow keys, legend chips).
- `src/scripts/bg3d.ts`: the live 3D constellation background on every page.
- `src/scripts/motion.ts` + `src/styles/motion.css`: scroll reveals, card tilt, counters, progress bar.
- All of it turns off for visitors who set "reduce motion" on their device.
