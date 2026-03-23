---
name: recruitment-intelligence
description: Expert in company organization and hidden job market recruitment. Use when working on SectorRegistry, SectorTitleService, sector-titles.yaml, contact scoring, or any feature related to identifying hiring managers before a job is posted.
---

## Context — ExpatHunter's core promise

ExpatHunter targets the **hidden job market**: connecting expats directly with **operational managers who have hiring authority**, before any job offer is published. The app is NOT a job board aggregator.

**Key insight**: A CTO or Engineering Manager knows they need to hire 3 weeks before posting anything. Reaching them at this moment is the entire value proposition.

**What we avoid**: HR/Talent Acquisition teams — they receive 100× more unsolicited contact than operational managers and have no hiring authority themselves. HR is an optional addon for users who want it (`include_hr: true`).

---

## Decision framework — Is this contact worth targeting?

Ask: **Does this person directly manage a team AND decide who joins it?**

✅ YES → Primary target (Engineering Manager, Head of Product, CTO, VP Engineering...)
⚠️ MAYBE → Secondary target (Lead Engineer, Principal Engineer, Staff Engineer — influence without formal authority)
❌ NO → Exclude (HR Manager, Recruiter, Talent Acquisition, CEO of 2000+ company, CFO, Legal...)

**Rule**: If the title contains "Recruiter", "Talent", "HR", "People Operations", "Acquisition" → exclude by default.

---

## Company org structures by sector

### IT / Software / Tech
```
CTO / VP Engineering
  └─ Head of Engineering / Director of Engineering
       └─ Engineering Manager ← PRIMARY TARGET (manages 5-12 devs, approves headcount)
            └─ Lead / Staff / Principal Engineer ← SECONDARY (influences but doesn't decide)
                 └─ Senior / Mid / Junior Engineer
```
**NZ/AU culture note**: "Head of Engineering" > "Director of Engineering" (less formal hierarchy).
Startups (<50 people): CTO often IS the Engineering Manager → target directly.

### Finance / Fintech / Banking
```
CFO / CRO
  └─ Head of Technology / Head of Engineering (fintech)
       └─ Development Manager / Tech Lead Manager ← PRIMARY
  └─ Head of Data / Head of Analytics ← PRIMARY if data-focused
       └─ Data Engineering Manager / Analytics Manager ← PRIMARY
```
**Note**: "Head of X" titles dominate in NZ finance. "Vice President" = mid-level in banking (not C-suite).

### Healthcare / Medtech
```
CTO / CIO
  └─ Head of Engineering / IT Manager ← PRIMARY
  └─ Clinical Informatics Manager ← PRIMARY (bridges clinical + tech)
  └─ Health IT Manager ← PRIMARY
```
**Note**: "Director of Nursing" or clinical titles = NO hiring authority for tech roles.

### Marketing / Growth / E-commerce
```
CMO / VP Marketing
  └─ Head of Growth / Head of Digital ← PRIMARY
       └─ Growth Manager / Digital Marketing Manager ← PRIMARY (manages team)
  └─ Head of Engineering (e-commerce platform) ← PRIMARY
```

### Operations / Logistics / Supply Chain
```
COO
  └─ Head of Operations / Operations Manager ← PRIMARY
  └─ Head of Technology / IT Manager ← PRIMARY
  └─ Supply Chain Manager ← SECONDARY
```

### Construction / Property / Real Estate
```
CEO (often hands-on in NZ SMEs)
  └─ IT Manager / Head of Technology ← PRIMARY
  └─ Project Manager / Development Manager ← SECONDARY
```

---

## Cultural nuances by country

| Country | Title preference | Hierarchy | Cold contact openness |
|---------|-----------------|-----------|----------------------|
| 🇳🇿 NZ | "Head of X" >> "Director" | Flat, first-name culture | ⭐⭐⭐⭐⭐ Very open |
| 🇦🇺 AU | "Head of X", "Lead" common | Moderate | ⭐⭐⭐⭐ Open |
| 🇬🇧 UK | "Director" more common | More formal | ⭐⭐⭐ Moderate |
| 🇺🇸 US | "VP", "Director" common | Formal, layered | ⭐⭐⭐ Moderate |
| 🇫🇷 FR | "Responsable", "Directeur" | Formal | ⭐⭐ Reserved |
| 🇩🇪 DE | "Leiter", "Manager" | Very formal | ⭐⭐ Reserved |
| 🇨🇦 CA | Similar to US, "Lead" popular | Moderate | ⭐⭐⭐⭐ Open |

**NZ-specific**: Companies with <200 employees (majority of NZ market) often have flat structures where Engineering Manager = effectively CTO.

---

## Hiring signals — what makes a contact "hot"

Rank from strongest to weakest:

1. **Active job posting** on Seek/LinkedIn for a role under their team → they need headcount NOW
2. **Recent funding round** (6-18 months) → growth phase, hiring imminent
3. **Company headcount growth** visible on LinkedIn (>20% in 12 months)
4. **New product launch** announced in news → team building
5. **Conference speaker** / active GitHub → open to networking
6. **Recent promotion** to a management role → building their team

---

## Validation rules for sector-titles.yaml

When reviewing or extending `data/sector-titles.yaml`:

1. **Primary titles must have direct reports** — if the role doesn't typically manage 3+ people, move to secondary
2. **Exclude HR by default** — any title with Recruiter/Talent/HR/People goes to `hr_talent` section
3. **Include acronyms** — Hunter.io searches exact titles, so "CTO" AND "Chief Technology Officer" are both needed
4. **Country calibration** — NZ/AU: prefer "Head of" over "Director of" (more common in flat culture)
5. **Size calibration** — a "Principal Engineer" is secondary in a 500-person company but primary in a 20-person startup; note this in comments
6. **Add variants** — "VP Engineering" AND "VP of Engineering" (Hunter searches exact strings)

---

## LLM prompt guidance for SectorTitleService

When generating titles for an unknown sector, the prompt must:
- Explicitly state the hidden job market context (NOT post-job-offer recruiters)
- Ask for operational managers with direct reports
- Specify country culture for title formatting
- Request both acronyms and full forms
- Return in JSON with `primary`, `secondary`, `hr_talent`, `exclude` arrays
- Include a `rationale` field per title (helps validate quality)

Reference: `data/sector-titles-prompt.md` for the full prompt template.

---

## How to use this skill

Invoke with `/recruitment-intelligence` when you need to:
- Review or extend `data/sector-titles.yaml`
- Write or refine the `SectorTitleService` fallback prompt
- Decide if a contact title should be primary/secondary/excluded
- Score contact relevance for the hidden job market
- Design company context signals (hiring signals, expat-friendly indicators)
