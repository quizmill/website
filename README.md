# quizmill.dev

The quizmill landing site — one interactive page, no framework, no
build step. Three live exhibits: a real practice loop (with the
mistakes re-queue) in the hero, the pack→app switcher, and the agent
authoring terminal.

## Develop

```
npx serve .        # or just open index.html
```

## Deploy (Cloudflare Pages)

```
npx wrangler login                                   # once
npx wrangler pages project create quizmill --production-branch main
npx wrangler pages deploy . --project-name quizmill
```

Then add `quizmill.dev` as a custom domain on the Pages project
(dashboard → quizmill → Custom domains). CI deploys run via
`.github/workflows/deploy.yml` once `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repo secrets exist.

## Brand

The mill metaphor carries everything: packs are **grist**, the engine
**grinds**, the practice loop is the **turn of the wheel** (answer →
review → retry). Voice: plainspoken millwright — confident, concrete,
a little wry. Never corporate.

**Mark** — an eight-paddle mill wheel that doubles as a progress loop;
one segment is always golden (the current question, the turn underway).
`assets/logo.svg`, geometry in the inline SVGs in `index.html`.

| Token | Value (light) | Use |
|---|---|---|
| paper | `#faf7f0` | ground |
| ink | `#211d18` | text, wheel |
| stone | `#6f6557` | secondary text |
| grain | `#b45309` | THE accent — amber, millstone gold |
| teal | `#0f766e` | engine/demo green-blue, sparingly |
| code | `#292218` / `#f3e9d2` | terminal panels |

Dark mode is first-class (auto via `prefers-color-scheme`); the palette
warms rather than inverts — see `:root` in `styles.css`.

**Type** — [Fraunces](https://fonts.google.com/specimen/Fraunces)
(650/750) for display, italic for the amber emphasis words; system
sans for body; `ui-monospace` for code. Wordmark is lowercase
`quizmill` in Fraunces 650.

Pack apps deliberately do NOT use the brand palette — every pack gets
its own `themeColor`. The brand belongs to the mill, not the flour.
