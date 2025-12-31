# Mechanical Services Job Estimator PoC

Explainable range estimator for mechanical service pricing. The PoC produces Low / Expected / High ranges, confidence, similar jobs, and a short explanation.

## What this shows
- Similarity scoring over a realistic synthetic dataset.
- Confidence-based range with risk widening.
- LLM-backed explanation (optional) with fallback templates.
- Mobile-first web UI and shareable summary.

## Quick start
```bash
npm install
npm start
```

Open `http://localhost:3000`.

## OpenAI API key
Create a `.env.local` file in the project root (or copy `.env.example`):
```
OPENAI_API_KEY=your_key_here
```

Do not commit `.env.local`. When deploying, store the key as a platform secret.

## Dataset
The dataset lives at `data/jobs.json`. Regenerate it with:
```bash
npm run seed
```

## Estimation approach
- Similar jobs are selected by weighted similarity across category, job type, site, urgency, and numeric inputs.
- Expected value uses weighted average of similar job totals.
- Range uses percentiles, widened by complexity and urgency.
- Confidence drops when similarity is weak or inputs are missing.

## Vercel deployment (no domain needed)
1) Push the repo to GitHub (private is fine).
2) Go to Vercel → New Project → import the repo.
3) Framework preset: "Other".
4) Build command: leave empty. Output directory: `public`.
5) Add Environment Variable:
   - `OPENAI_API_KEY` = your key
6) Deploy. You will get a `*.vercel.app` link.

Note: Vercel uses the `api/estimate.js` and `api/explain.js` serverless functions.
