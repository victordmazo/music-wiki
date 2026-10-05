# Manual API walkthrough

`api.rest` is a click-through walkthrough of every route in `app/api/`, run against a
real dev server and your real Supabase project. It's for manual testing and for
capturing screenshots of the working API (e.g. for the CSC521 report) — it does not
replace the automated tests in `__tests__/api/`, which mock Supabase and run in CI via
`npm test`.

## Setup

1. Install the **REST Client** extension in VS Code (`humao.rest-client`).
2. Make sure `.env.local` is filled in (see the root `CLAUDE.md`) and the schema in
   `supabase/schema.sql` has been run against your Supabase project.
3. Start the dev server: `npm run dev` (http://localhost:3000).
4. Open `api.rest`. Each block has a **Send Request** link above it — click through
   top to bottom.

## How it's wired together

Requests are named with `# @name`, and later requests reference an earlier one's
response — e.g. `{{loginAlice.response.body.$.session.session.access_token}}` — so
you don't have to copy tokens or ids by hand. Just send requests in order.

There's one manual step partway through: this schema has no API for creating the
*first* moderator (by design — otherwise anyone could promote themselves). When you
reach the checkpoint comment, pause and run the given SQL in the Supabase SQL editor,
then continue.

Re-running the whole file from the top will fail at the register/profile steps
(usernames and emails are already taken) — either change the `@alice*`/`@bob*`/`@mod*`
variables at the top, or delete the three test users from **Authentication → Users**
in the Supabase dashboard first.
