# Shelf — a candidate-first bench tool

> The candidate is the product. The bench is the shelf. The system specs them out.

A lean recruitment tool built on one inversion: you don't start with a job and
hunt for people. You start with your **bench** of candidates and the system
constantly **specs them out** to employers — using live job matches as the
targets. No 10,000 contacts, no CRM bloat. Just the product and the act of selling it.

Built for [Williams Recruitment](https://williams-recruitment.com) — food & CPG executive search.

## Run it live locally with your real bench

This is the intended setup: full candidate data, on your own machine, nothing
uploaded anywhere.

1. **Get the folder onto your Mac** — download/clone this repo.
2. **Add your data** — drop your `per_candidate.json` into the folder and rename
   it **`bench.local.json`** (the app also accepts the original `per_candidate.json`
   name). This file is **gitignored** — it can never be committed or pushed.
3. **Launch** — double-click **`start.command`**. It starts a local server and
   opens the app in your browser, already showing your real bench (the badge
   top-right reads *“your bench · N · local file”*).

That's it. Update the file (or have `wr-candidate-engine` write it here) and
refresh — it sits live.

> No `start.command`? Just run `python3 -m http.server 8000` in the folder and
> open `http://localhost:8000`. Windows: `py -m http.server 8000`.

### Without setting up a file
You can also click **Load my bench** (top right) and pick your `per_candidate.json`
on the fly — it's read in-browser only and kept in that browser's local storage.

Out of the box (no local file) the app shows an **anonymised sample bench**.

## 🔒 Privacy — read this

This repo is **public**, so it contains **no real candidate data**, ever.

- The committed `bench.sample.json` is fully anonymised (CAND codes, like your
  bench register).
- Your real bench lives in `bench.local.json` / `per_candidate.json`, which is
  served **only** by the local server on your machine. `.gitignore` blocks those
  names (and any decoder files) from ever being committed by accident.
- The **Load my bench** button reads a file *in your browser only* (via
  `FileReader`) — never uploaded, never sent to a server, kept in that browser's
  `localStorage`.
- The app makes **no outbound network calls** — open the Network tab and you'll
  see it only ever fetches its own local files.
- Outbound pitches use the **anon spec** (`anonRef`) only — no name, no current
  employer. Real identity stays in your decoder, exactly as your engine does it.

## The model (matches your `per_candidate.json` schema)

| Field | Used as |
|---|---|
| `name` / `candidateId` | The product (real name shown only in your local browser) |
| `anonRef` | The spec-out blurb — what goes out to employers |
| `pitchHooks` | The selling points dropped into each pitch |
| `targetRoles`, `anchorSkills`, `scaleHandled` | The spec sheet |
| `matches[]` | **Live targets** — open roles your engine matched. Each is a spec-out waiting to happen |
| `primarySector`, `geography`, `seniority`, `status` | Board sorting + filters |

## The two screens

1. **The Bench** — your candidates as products, ranked by who's *closest to a
   spec-out* (best live match first). Filter by sector / status, search anything.
2. **Candidate** — the spec sheet (anon spec + pitch hooks + anchors) next to the
   **spec-out engine** (the live matched roles) and a **spec-out log** that tracks
   each pitch: sent → opened → interested → call → placed.

## Where this goes next

This prototype reads a static export. The natural next step is to close the loop
with the tools already in your stack:

- **Your `wr-candidate-engine`** writes `per_candidate.json` → Shelf reads it (today,
  manual; next, automatic).
- **Indeed / job sources** → the `matches[]` already come from live postings.
- **Gmail** → send the generated pitch and pull replies back as spec-out status,
  instead of logging by hand.
- **The engine ledger (`engine.sqlite`)** → the spec-out log could read/write the
  real system of record instead of browser storage.
