# Exile site

Static site for Exile. No build step. Vercel serves the files as they are.

- `index.html` main page
- `report.html` sample scouting report
- `rules.html`, `privacy.html`, `terms.html`
- `config.js` shared settings: contact email, LinkedIn, waitlist endpoint
- `pages.css` styles for the inside pages (the main page carries its own)
- `vercel.json` clean URLs, the `/firms` shortcut, security headers

To change the contact email, edit `contactEmail` in `config.js`.
The waitlist saves to the `waitlist` table in the Supabase project named `exile`.
Fonts are Big Shoulders and Newsreader, both under the SIL Open Font License (see `fonts/`).
