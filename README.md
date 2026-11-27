# Exile site

Static site for Exile. No build step. Vercel serves the files as they are.

- `index.html` main page
- `report.html` sample scouting report
- `rules.html`, `privacy.html`, `terms.html`
- `account.html` + `account.js` sign in and edit your own trader profile (email and password, through Supabase Auth)
- `trader.html` a public profile, served at `/t/<handle>`
- `vendor/` the pinned Supabase browser library, used only by the account page
- `config.js` shared settings: contact email, LinkedIn, waitlist endpoint, Supabase project
- `pages.css` styles for the inside pages (the main page carries its own)
- `vercel.json` clean URLs, the `/firms` shortcut, security headers

To change the contact email, edit `contactEmail` in `config.js`.
The waitlist saves to the `waitlist` table in the Supabase project named `exile`.
Profiles live in the `profiles` table and photos in the `avatars` bucket. A profile shows in the home page Traders section only after `listed` is set to true in the Supabase table editor.
Fonts are Big Shoulders Display and Barlow, both under the SIL Open Font License (see `fonts/`).

Files: `site.css` is shared by every page, `home.css` and `home.js` are the home page, `chart.js` is the record chart, `data.js` holds all sample data (built by a script kept outside this folder), `pages.css` styles the inside pages.
