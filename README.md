# Brainy web app

This Next.js app is Brainy's browser client. Flutter remains the client for mobile and desktop. Both use the same NestJS GraphQL API and account data.

## Run locally

1. Start MongoDB and the API from the repository root: `docker compose up -d --build mongodb api`.
2. In this directory, run `npm ci` and then `npm run dev`.
3. Open `http://localhost:3001`.

The API listens on port 3000. The Next.js app listens on port 3001 and forwards GraphQL requests through `/api/graphql`. The API URL defaults to `http://127.0.0.1:3000/graphql`; set `GRAPHQL_API_URL` in `brainy_web_app/.env.local` if it is elsewhere. For a production deployment, set this variable to a URL reachable **from the Next.js server** and serve the web app over HTTPS. The API may stay private to the server.

Email sign-in and registration work through the API. Google sign-in uses the Brainy Firebase project; enable Google in Firebase Authentication and add your web hostname to its Authorized domains. The web session is stored in an HTTP-only cookie. The language choice is stored in the browser.

## Features

New users and existing accounts without a completed profile see a short profile setup after sign-in. The private profile stores name, profession, job, field of study, interests, and hobbies for future people matching and can be edited later. Create named collections with multiple named data formats. Each data format has its own fields and a required, distinct pale color from a palette of 24, which follows its saved entries. Colors can be changed later, including for older data formats. Choose a data format when writing an entry. Fields can mix Title, Date, Number, Time, Link, Character, and Text. Number fields support plain values, presets for distance, mass, volume, temperature, money, percent, and time, or a custom unit. Add, edit, copy, and delete entries in compact rows. Each entry shows its creation date and, if changed, its edit date. Rename and delete collections. The interface is responsive and available in English and French.

## Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` in this directory. To check a live web session and entry round trip, start the API and web app, then run `npm run smoke:web` from `api/` with `MONGODB_URI` set to the same database used by the API. The smoke test deletes its own records. The API has more checks in the [project README](../README.md).
