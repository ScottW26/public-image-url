# Shelf — a candidate-first ATS/CRM

> The candidate is the product. Everything else is noise.

A prototype recruitment system built on one inversion: instead of starting
with a **job** and hunting for people, you start with a **candidate** and
the system constantly *specs them out* to employers — whether or not those
employers have a live vacancy.

## How to run

Open `index.html` in any browser. That's it — no install, no server.
Your data is saved in the browser (localStorage), so it persists between visits.

To start fresh with the demo data: open the browser console and run
`localStorage.removeItem('shelf.v1')`, then reload.

## The model

| Object | Role |
|---|---|
| **Candidate** | The product. The central record — everything hangs off it. |
| **Spec-out** | The core action: marketing one candidate to one employer. Replaces "application". |
| **Employer** | A buyer in *The Market*. A target, not the starting point. |
| **Response** | Did they bite? sent → opened → interested → interview → placed. |

## The three screens

1. **The Shelf** — your candidates, each shown as a product that's actively
   being sold: live spec-outs, response rate, and the single *next action*.
2. **Candidate detail** — the spec sheet (the product page) + the
   **spec-out engine** (fresh employers to pitch, ranked by fit) + a timeline
   of every time they've been put in front of someone.
3. **The Market** — the buyers. Kept deliberately thin.

## The design rule

If a feature doesn't help you market a candidate or close a placement,
it doesn't get built. That's why there's no job-req workflow, no compliance
module, no owner dashboards — that's the "noise" this is a reaction to.

## Where this goes next

This is a clickable prototype to pressure-test the concept. The natural
next step is to wire the spec-out engine to live tools:

- **Vibe Prospecting / Indeed** → auto-find and enrich target employers for each candidate
- **Gmail** → send the generated pitch and track opens/replies as spec-out status
- **Atlas** → import existing candidate data
- **Calendar** → book the interviews that come back

— built for Williams Recruitment.
