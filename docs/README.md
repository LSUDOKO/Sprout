# Sprout — Build Kit

**Sprout** is a Nimiq Pay Mini App where saving money feels like raising a pet.
Every NIM you save goes into **your own NIM stake** (non-custodial). Your pet, Sprout,
eats your savings, grows from real staking rewards, keeps a weekly streak, evolves at
milestones, and saves alongside friends in **Squads**.

Target: **Nimiq Mini Apps Competition — Save category.**

This folder is the complete specification. Hand it to a developer or an AI coding agent
(Claude Code, Cursor) and build in the order given in `13-BUILD-PLAN.md`.

## Files

| File | What it covers |
|---|---|
| `CLAUDE.md` | Rules for the AI coding agent. Read first. |
| `01-PRODUCT-SPEC.md` | Vision, audience, every feature with acceptance criteria, scope (MVP vs stretch) |
| `02-ARCHITECTURE.md` | Stack, folder structure, data flow, environments, security |
| `03-NIMIQ-INTEGRATION.md` | Every Nimiq SDK call, staking flows, sign-in, verification, error handling (the most important file) |
| `04-GAME-DESIGN.md` | Pet stages, mood, streaks, Sparks, badges, squads, leaderboard — exact numbers and formulas |
| `05-SCREENS-UX.md` | Every screen, its states, components and copy |
| `06-DATA-MODEL-API.md` | Database schema and every API endpoint |
| `07-ASSETS-ART.md` | Art style, image-generation prompts, asset list, file naming |
| `08-ANIMATION.md` | How the 2D pet is rigged and animated in code |
| `09-TESTING-QA.md` | Unit, E2E, on-device mainnet test checklist |
| `10-DEPLOYMENT.md` | Hosting, env vars, domains, opening in Nimiq Pay |
| `11-SUBMISSION-PLAYBOOK.md` | How to score high: description, video script, promotion plan |
| `12-REFERENCES.md` | Every link: docs, repos to learn from, assets, tools |
| `13-BUILD-PLAN.md` | Step-by-step milestones with ready-to-paste prompts for an AI agent |

## One-paragraph pitch

> Most people know they should save, and most don't. Sprout makes saving a weekly
> habit by giving it a face: a small creature that grows only when you save. Savings
> go straight into your own Nimiq stake, so they earn rewards while you sleep, and
> Sprout grows with them. Keep your weekly streak, evolve Sprout from Seed to Grove,
> and save with friends in Squads where everyone's streak counts. Your money never
> leaves your wallet, and you can take it out anytime.

## Non-negotiables (from competition rules)

- Built on the Nimiq Pay Mini Apps Framework, using **NIM** as a core feature.
- Public GitHub repo, **MIT License**, no secrets committed.
- Works on the first try inside Nimiq Pay (no prototype, no mockups).
- Original code and art, or properly attributed (see `12-REFERENCES.md`, `CREDITS.md`).
- No gambling or randomness-based rewards.
