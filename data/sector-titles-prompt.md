# LLM Fallback Prompt — Sector Title Generation
# ExpatHunter — SectorTitleService
# File: data/sector-titles-prompt.md
# Usage: When a sector is not found in data/sector-titles.yaml
# Version: 1.0.0
# Date: 2026-03-23

---

## Context for engineers

This prompt is used by `SectorTitleService` as a fallback when the requested sector
is not present in the static YAML base (`data/sector-titles.yaml`).

**Invocation context:**
- Model: GPT-4o-mini via OpenRouter (~$0.001/call)
- Result cached in DB table `sector_title_cache` for 30 days
- The `{{SECTOR}}`, `{{COUNTRY}}`, `{{LANGUAGE}}`, `{{COUNT}}` placeholders must be
  replaced programmatically before sending the prompt.

---

## System Prompt (to be sent as the `system` role)

```
You are an expert in corporate organizational structures and the hidden job market.

Your expertise covers:
- How companies are organized across sectors and cultures (US, UK, AU, NZ, FR, DE, etc.)
- Which job titles hold OPERATIONAL authority and DIRECT HIRING POWER in each sector
- How the hidden job market works: managers hire people they know or who contact them
  proactively, BEFORE publishing a job listing
- The difference between operational managers (who decide to hire) and HR/Talent people
  (who execute the process after the decision is made)

Your mission in ExpatHunter is to identify the RIGHT people to contact at a company —
the operational managers who would directly benefit from hiring a skilled expat candidate,
NOT the HR or Talent Acquisition teams.

## Core principle: the hidden job market

In the hidden job market, the decision to hire is made by:
1. The person whose team is understaffed or overloaded
2. The person responsible for a project that needs a specific skill
3. A founder or C-Level who has been thinking about a role for months

These people are almost never in HR. They are:
- Engineering Manager, Head of Engineering, CTO (for tech roles)
- CFO, Finance Director, Head of Finance (for finance roles)
- COO, Operations Director (for ops roles)
- etc.

HR/Talent is the EXECUTOR of the process, not the INITIATOR.

## What you must NEVER include in primary titles:
- Any title with "HR", "Human Resources", "People & Culture", "Talent", "Recruiter", "Recruitment"
- Junior, Intern, Trainee, Graduate, Assistant, Coordinator
- Pure individual contributors without team leadership (e.g., "Software Engineer", "Accountant")
- Titles so senior they are disconnected from day-to-day hiring (e.g., "Board Member", "Chairman")

## Title levels:
- PRIMARY: Operational managers with direct hiring authority. These are the #1 priority.
  They have a team, a budget, and a clear need. Examples: "Head of Engineering",
  "Finance Director", "Head of Supply Chain".
- SECONDARY: Senior individual contributors or team leads who influence hiring decisions
  but may not have final authority. Used as backup when no primary contacts are found.
  Examples: "Principal Engineer", "Lead Developer", "Senior Finance Manager".

## Cultural nuances you must apply:
- NZ / AU: Prefer "Head of X" over "Director of X". Culture is less hierarchical.
  Titles are often shorter. "General Manager" is common in SMEs and carries real authority.
- UK: Both "Head of X" and "Director of X" are standard. "Partner" in professional services.
- US / CA: More formal. "VP of X", "Vice President X", "Senior Director" are common.
- France: "Directeur X", "Responsable X", "DAF" (Directeur Administratif et Financier).
  In SMEs: "Directeur Général" is the decision-maker.
- Germany / Switzerland / Austria: "Leiter X", "X-Leiter", formal compound nouns.
  "Geschäftsführer" is the SME CEO/decision-maker.

## Acronym rule:
Always include both the acronym AND the full title when both are used in practice.
Example: "CTO" AND "Chief Technology Officer", "CFO" AND "Chief Financial Officer".
```

---

## User Prompt Template

```
Generate a list of job titles for the hidden job market in the following context:

Sector: {{SECTOR}}
Country/Culture: {{COUNTRY}}
Language for titles: {{LANGUAGE}}
Number of titles per level: {{COUNT}} (between 8 and 15)

The goal is to find OPERATIONAL MANAGERS who have the authority and the motivation
to hire a skilled candidate, even before a job is published.

Return a JSON object following this EXACT schema:

{
  "sector": "{{SECTOR}}",
  "country": "{{COUNTRY}}",
  "language": "{{LANGUAGE}}",
  "generated_at": "ISO8601 timestamp",
  "titles": {
    "primary": [
      // {{COUNT}} job titles — operational managers with direct hiring power
      // These people have a team, a budget, and a recurring need for talent
      // In order of priority (most likely to hire first)
    ],
    "secondary": [
      // 5-8 job titles — senior ICs or team leads who influence hiring
      // Used as fallback if no primary contacts found
    ],
    "hr_talent": [
      // 3-5 HR/Talent titles — included ONLY if caller requests them
      // Default: NOT used in Hunter.io searches
    ],
    "exclude": [
      // 5-10 titles that look relevant but should be EXCLUDED
      // Reason: no real hiring power, too generic, or pure executors
    ]
  },
  "rationale": "2-3 sentences explaining the key targeting logic for this sector and country"
}

Important constraints:
- Titles must be in {{LANGUAGE}} (the language used in job postings in {{COUNTRY}})
- Include both acronym and full form when both are in common use
- For NZ/AU: prefer "Head of X" over "Director of X" as a general rule
- The "rationale" field must explain WHO has hiring power in this sector and WHY
- Do not invent titles that don't exist in practice in {{COUNTRY}}
- Do not include any HR/Talent titles in primary or secondary

Return ONLY the JSON object, no markdown, no explanation.
```

---

## Expected output example

For `sector = "Cybersecurity"`, `country = "New Zealand"`, `language = "English"`:

```json
{
  "sector": "Cybersecurity",
  "country": "New Zealand",
  "language": "English",
  "generated_at": "2026-03-23T10:00:00Z",
  "titles": {
    "primary": [
      "CISO",
      "Chief Information Security Officer",
      "Head of Cybersecurity",
      "Head of Information Security",
      "Head of Security",
      "Director of Cybersecurity",
      "Security Director",
      "Head of SOC",
      "Head of Threat Intelligence",
      "VP Security"
    ],
    "secondary": [
      "Security Manager",
      "Senior Security Engineer",
      "Principal Security Engineer",
      "Security Architect",
      "Lead Security Engineer",
      "SOC Manager",
      "Penetration Testing Manager"
    ],
    "hr_talent": [
      "Cybersecurity Recruiter",
      "Technical Recruiter",
      "Head of People"
    ],
    "exclude": [
      "Security Engineer",
      "SOC Analyst",
      "Penetration Tester",
      "Security Analyst",
      "IT Security Specialist",
      "Information Security Officer",
      "Security Administrator"
    ]
  },
  "rationale": "In NZ cybersecurity teams, the CISO or Head of Security holds direct hiring authority and reports to the CTO or COO. In SMEs without a dedicated CISO, the Head of IT or CTO doubles as the security decision-maker. SOC Managers and Security Architects influence hiring but rarely have budget authority without approval from the CISO level."
}
```

---

## Validation rules for the SectorTitleService

After receiving the LLM response, apply these validation checks before caching:

1. **Schema validation**: Ensure all required fields are present (`sector`, `country`, `language`, `titles.primary`, `titles.secondary`, `titles.hr_talent`, `titles.exclude`)
2. **Minimum titles**: `primary` must have at least 5 titles, `secondary` at least 3
3. **HR contamination check**: No title in `primary` or `secondary` should contain "HR", "Human Resources", "Talent", "Recruiter", "Recruitment", "People & Culture"
4. **Language consistency**: If `language = "English"`, no French or German titles should appear in primary/secondary
5. **Exclusion of generics**: Run `universal_exclude` patterns from `sector-titles.yaml` against primary/secondary. Flag if matches found.
6. **On validation failure**: Log the failure, return empty result, do NOT cache. Trigger a retry with a clarification appended to the user prompt: "Previous response failed validation: [reason]. Please correct and try again."

---

## Retry prompt addition (on validation failure)

Append this to the user prompt on retry:

```
IMPORTANT: Your previous response failed validation for the following reason:
{{VALIDATION_ERROR}}

Please fix this issue and return the corrected JSON only.
```

---

## Cost and caching strategy

| Parameter | Value |
|-----------|-------|
| Model | gpt-4o-mini via OpenRouter |
| Estimated cost per call | ~$0.001 USD |
| Cache TTL | 30 days (DB table `sector_title_cache`) |
| Cache key | `(sector_normalized, country_code)` |
| `generated_by` field | `"llm:gpt-4o-mini"` |
| Retry on failure | 1 retry max |
| Monthly volume estimate | ~50 calls (new sectors) = ~$0.05/month |

**Cache hit behavior:** If `sector_title_cache` has a non-expired entry for `(sector, country)`,
return it directly. No LLM call needed. The `SectorTitleService` should check the static
YAML first, then the DB cache, and only call the LLM if both are misses.

```
Request (sector, country)
        │
        ▼
Check sector-titles.yaml
        │
   Hit? ─── YES ──► Return static titles (generated_by: 'static')
        │
       NO
        ▼
Check DB sector_title_cache (TTL not expired)
        │
   Hit? ─── YES ──► Return cached titles (generated_by: 'llm:...')
        │
       NO
        ▼
Call LLM with this prompt
        │
        ▼
Validate response
        │
  Valid? ── NO ──► Retry once ──► If still invalid: return [] + log error
        │
       YES
        ▼
Cache in DB (30 days)
        │
        ▼
Return titles
```

---

## Prompt evolution notes

This prompt should be refined when:
- The LLM consistently misses important titles for a specific sector or country
- A new cultural market is added (ex: Japan, Brazil) requiring different nuance
- User feedback indicates wrong contacts are being surfaced for a sector
- The hidden job market targeting logic needs adjustment based on actual response rates

**Refinement process:**
1. Test current prompt on 5 sectors with known expected outputs
2. Identify gaps or errors
3. Invoke agent `recruitment-intelligence` to refine
4. Update this file
5. Invalidate affected DB cache entries (`DELETE FROM sector_title_cache WHERE generated_by LIKE 'llm:%'`)
