# Shelf — a candidate-first bench tool

> The candidate is the product. The bench is the shelf. The system specs them out.

A lean recruitment tool built on one inversion: you don't start with a job and
hunt for people. You start with your **bench** of candidates and the system
constantly **specs them out** to employers — using live job matches as the
targets. No 10,000 contacts, no CRM bloat. Just the product and the act of selling it.

Built for [Williams Recruitment](https://williams-recruitment.com) — food & CPG executive search.

## How to run

Because the app loads a JSON file, run it over a local web server (browsers block
`file://` fetches):

```bash
cd public-image-url
python3 -m http.server 8000
# then open http://localhost:8000
```

Out of the box it shows an **anonymised sample bench**. To use your real bench,
click **Load my bench** (top right) and pick your `per_candidate.json`.

## 🔒 Privacy — read this

This repo is **public**, so it contains **no real candidate data**, ever.

- The committed `bench.sample.json` is fully anonymised (CAND codes, like your
  bench register).
- **Load my bench** reads your `per_candidate.json` *in your browser only*
  (via `FileReader`). It is never uploaded, never sent to a server, and never
  committed. It persists in that browser's `localStorage` on your machine.
- `.gitignore` blocks `per_candidate.json`, `*.local.json` and any decoder files
  from ever being committed by accident.
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
