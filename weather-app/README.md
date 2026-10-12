# Weather App

A simple weather app built with React, TypeScript and Vite. It uses **Open-Meteo** for forecasts and city search, and **Firebase** for sign-up / sign-in and each user's favourite locations. Visitors can also try it as a guest.

The app focuses on the information people check most, laid out like a phone weather app: current conditions, the whole day hour by hour, a 10-day outlook, and a handful of detail tiles.

## Features

- **Your location by default** – asks the browser for your position and shows local weather (falls back to Lagos if you decline).
- **Current conditions** – temperature, feels-like, condition, today's high/low.
- **Hourly forecast** – today from 00:00 to 23:00. The strip scrolls to the current hour ("Now") with a small bounce.
- **10-day forecast** – daily low/high with a range bar and chance of rain.
- **Detail tiles** – feels like, humidity (with dew point), wind (speed, gusts, direction), UV index, sunset/sunrise, visibility, pressure, rain expected in the next 24 hours.
- **City search** – Open-Meteo Geocoding (no key needed).
- **Accounts** – sign up, sign in and sign out with Firebase Authentication (email + password).
- **Favourite locations** – saved per user in Firestore; open or remove them from the sidebar.
- **Guest mode** – use the app without an account. Guests get the full forecast but can't save favourites.
- **Overlay sidebar** – a floating button opens search, "My Location" and favourites over the page; Escape or a tap outside closes it.
- **Stays current** – the forecast refreshes in the background when it is 15 minutes old or the hour or day changes, so "Today" and "Now" don't go stale while the app is left open.
- **Light and dark** – follows the system setting.

## Tech stack

| Technology | Purpose |
| --- | --- |
| React + TypeScript + Vite | App and build tooling |
| Open-Meteo Forecast API | Current, hourly and daily weather |
| Open-Meteo Geocoding API | City search |
| BigDataCloud (free client-side API) | Turns your coordinates into a city name |
| Firebase Authentication | Sign up / sign in |
| Cloud Firestore | Favourite locations |
| Vitest | Automated tests |

## Project structure

```text
src/
├── App.tsx                      # signed in -> weather, signed out -> sign-in screen, or guest
├── App.css / index.css          # styling
├── components/                  # AuthScreen, WeatherScreen, HourlyForecast, DailyForecast, ...
├── hooks/                       # useCurrentLocation, useForecast, useFavourites
├── state/                       # favouritesStore (no React, so its timing rules are testable)
├── weatherService/              # getForecast(), types, display helpers
├── locationService/             # city search + browser geolocation
├── firebaseService/             # Firebase init, auth, favourites
├── utils/                       # scrollWithBounce
└── tests/                       # Vitest tests (firebase/, openMeteo/, utils/)
```

Components only display data, hooks load it, and services are the only code that talks to Firebase, Open-Meteo or the browser.

## Prerequisites

- Node.js 20 or newer (`node -v`)
- A Firebase project (the free Spark plan is enough)

## Local setup

```bash
git clone https://github.com/BleeQ-LTD/weather-app-dumebi.git
cd weather-app-dumebi
npm install
```

If the repository has the app in a nested folder, run the commands in the folder that contains `package.json`.

### 1. Create the Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a project and add a **Web app** (the `</>` icon). Copy the config values it shows.
2. **Authentication → Sign-in method → Email/Password → Enable → Save.**
3. **Firestore Database → Create database.**
4. **Firestore Database → Rules:** paste the contents of `firestore.rules` and **Publish**. The rules let a signed-in user read and write only their own `users/{uid}/favourites` documents.

### 2. Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Project settings → General → Your apps → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | same place (`your-project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | same place |
| `VITE_FIREBASE_STORAGE_BUCKET` | same place |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same place |
| `VITE_FIREBASE_APP_ID` | same place |

Notes:
- The file must be named exactly `.env.local` and sit next to `package.json`.
- Restart `npm run dev` after changing it. Vite only reads env files at startup.
- Open-Meteo needs **no API key**.
- Firebase web config values identify your project and aren't secret on their own. Access is controlled by the Firestore rules and by restricting the API key in Google Cloud Console (HTTP referrers). `.env.local` is git-ignored anyway.

## Run the app

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) and allow location access when the browser asks. Geolocation only works on `localhost` or HTTPS.

## Test the app

Vitest needs a small addition to `vite.config.ts`. Keep your existing plugin and imports, add the reference line at the very top, and add the `test` block:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
// ...your existing plugin import...

export default defineConfig({
  plugins: [/* your existing plugins */],
  test: { environment: "node" },
});
```

Keep `defineConfig` imported from `vite` (not `vitest/config`), which avoids type errors from two copies of Vite's types. Add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` in `package.json`.

```bash
npm test              # run everything once
npm run test:watch    # re-run on save
```

The tests use fake Firebase and a fake `fetch`, so they need no internet, `.env.local` or Firebase project. They cover:

- Sign-up, sign-in, sign-out, auth errors and the auth-state observer
- Saving, loading and removing favourites, per-user isolation and signed-out access
- The forecast request and response mapping (hourly alignment, 10 days, missing values)
- API failure: HTTP errors, network loss, timeouts, unexpected data
- City search (including no results and special characters)
- Browser geolocation (allowed, denied, unsupported) and the name lookup
- When a forecast counts as stale (15 minutes, a new hour, local midnight) and the favourites state (slow loads, switching accounts, overlapping saves)
- Display helpers and the bounce curve

They do **not** test the real Firestore security rules, or the screens in a browser. See `SUBMISSION.md` for the manual test record.

## Build and deploy

`npm run build` runs the TypeScript check before bundling, so type errors anywhere in `src/`, including the tests, fail the build. Run it before every deploy.

The environment variables are baked in at build time, so build on a machine that has your `.env.local` (or set them in your host's dashboard).

```bash
npm run build      # outputs to dist/
npm run preview    # optional: check the production build locally
```

### Firebase Hosting (recommended, same project as Auth and Firestore)

```bash
npm install -g firebase-tools
firebase login
firebase init          # choose Hosting and Firestore
                       #   public directory: dist
                       #   single-page app: Yes
                       #   don't overwrite index.html
                       #   Firestore rules file: firestore.rules (keep the existing file)
npm run build
firebase deploy --only hosting,firestore:rules
```

The command prints your live URL (`https://<project-id>.web.app`). Firebase Hosting domains are authorised for sign-in automatically.

### Netlify or Vercel

1. Import the GitHub repository.
2. Build command `npm run build`, output directory `dist`.
3. Add the six `VITE_FIREBASE_*` variables in the site settings.
4. After the first deploy, add the site's domain under **Firebase console → Authentication → Settings → Authorized domains**.

## Data model

```text
users/{uid}/favourites/{lat}_{lng}
    name: "Lagos, Nigeria"
    latitude: 6.5244
    longitude: 3.3792
    createdAt: <server timestamp>
```

The document id comes from the rounded coordinates, so saving the same place twice updates one document.

## Credits and attribution

- Weather and geocoding data: [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). The free API is for **non-commercial** use.
- Place names for "My Location": BigDataCloud free client-side reverse geocoding.

## Known limitations

See the "Known issues and limitations" section of `SUBMISSION.md`.
