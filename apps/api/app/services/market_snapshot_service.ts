/**
 * MarketSnapshotService — Assembles market data from cache + static knowledge base.
 *
 * Returns: trend, best period, estimated offers, average salary, insights.
 * Cached 7 days per {country}::{sector}::{lang}.
 * To add a new language: add a key to the bilingual data objects below.
 */
import CacheService from './cache_service.js'
import logger from '@adonisjs/core/services/logger'
import { LOCALE_NAMES } from '../constants/locale.js'

export interface MarketSnapshot {
  country: string
  sector: string | null
  trend: string
  bestPeriod: string
  estimatedOffers: number
  averageSalary: string | null
  insights: string[]
  fetchedAt: string
}

type LangData = { trend: string; bestPeriod: string; insights: string[] }

type CountryEntry = {
  offers: number
  salary: string | null
  fr: LangData
  en?: LangData
}

// ─── Bilingual static market data ────────────────────────────────────────────
// Text fields (trend, bestPeriod, insights) are bilingual.
// Numbers (offers, salary) and hrefs are language-independent.
// Add a new language: add a key alongside `fr` and `en`.
// Missing `en` → falls back to `fr` with a warning log.

const COUNTRY_DATA: Record<string, CountryEntry> = {
  NZ: {
    offers: 1200,
    salary: 'NZD 80 000 - 130 000 (IT), NZD 70 000 - 100 000 (others)',
    fr: {
      trend: 'Forte demande en IT, santé et construction — pénurie chronique de profils qualifiés',
      bestPeriod: 'Février - Avril (début d\'année fiscale NZ, budgets ouverts)',
      insights: [
        'Visa principal : AEWV (Accredited Employer Work Visa). L\'employeur doit être accrédité auprès d\'Immigration NZ — vérifiez sur employer.immigration.govt.nz avant de postuler.',
        'CV NZ : max 2 pages, pas de photo, pas de date de naissance. Commencez par un "Profile Summary" de 3 lignes, puis "Key Achievements" chiffrés.',
        'Culture : tutoiement systématique, ton décontracté en entretien. La "culture fit" pèse autant que les compétences techniques.',
        'Négociation : salaires négociables à 10-15%. Demandez aussi KiwiSaver, flexible working et jours de congé supplémentaires.',
      ],
    },
    en: {
      trend: 'Strong demand in IT, health and construction — chronic shortage of skilled professionals',
      bestPeriod: 'February - April (start of NZ fiscal year, open budgets)',
      insights: [
        'Main visa: AEWV (Accredited Employer Work Visa). Employer must be accredited with Immigration NZ — check employer.immigration.govt.nz before applying.',
        'NZ CV: max 2 pages, no photo, no date of birth. Open with a 3-line Profile Summary, then quantified Key Achievements.',
        'Culture: first names from day one, casual interview tone. Cultural fit weighs as much as technical skills.',
        'Negotiation: salaries are negotiable 10-15%. Also ask for KiwiSaver, flexible working and extra leave days.',
      ],
    },
  },
  AU: {
    offers: 3500,
    salary: 'AUD 100 000 - 150 000 (IT), AUD 80 000 - 120 000 (others)',
    fr: {
      trend: 'Marché très dynamique — pénurie de main d\'œuvre qualifiée dans la tech, la santé et les métiers du bâtiment',
      bestPeriod: 'Janvier - Mars (rentrée australienne, nouveaux budgets)',
      insights: [
        'Visa principal : TSS 482 (Temporary Skill Shortage). Votre métier doit figurer sur la "Skilled Occupation List" — consultez immi.homeaffairs.gov.au.',
        'CV AU : format "achievement-based", max 3 pages. Chaque expérience doit lister des résultats chiffrés. Pas de photo ni d\'infos personnelles.',
        'Sydney et Melbourne concentrent 70% des offres tech. Brisbane, Adelaide et Perth offrent moins de concurrence avec des salaires similaires.',
        'Les certifications cloud (AWS, Azure, GCP) et Agile peuvent augmenter votre salaire de 15-20%.',
      ],
    },
    en: {
      trend: 'Very dynamic market — skilled labour shortage in tech, healthcare and construction',
      bestPeriod: 'January - March (Australian New Year, new budgets)',
      insights: [
        'Main visa: TSS 482 (Temporary Skill Shortage). Your occupation must be on the Skilled Occupation List — check immi.homeaffairs.gov.au.',
        'AU CV: achievement-based format, max 3 pages. Each role must list measurable results. No photo or personal details.',
        'Sydney and Melbourne hold 70% of tech roles. Brisbane, Adelaide and Perth offer less competition with similar salaries.',
        'Cloud certifications (AWS, Azure, GCP) and Agile can increase your salary by 15-20%.',
      ],
    },
  },
  CA: {
    offers: 4000,
    salary: 'CAD 80 000 - 130 000 (IT), CAD 65 000 - 100 000 (others)',
    fr: {
      trend: 'Immigration économique active via Express Entry — forte demande en tech, finance et santé',
      bestPeriod: 'Septembre - Novembre (budgets de fin d\'année, tirages Express Entry fréquents)',
      insights: [
        'Express Entry : créez votre profil avec vos points CRS. Score minimum typique : 470-490. Le bilinguisme français-anglais ajoute jusqu\'à 50 points bonus.',
        'CV Canada : format nord-américain, max 2 pages. Pas de photo, pas d\'âge. "Professional Summary" puis expériences anti-chronologiques avec métriques.',
        'Toronto et Vancouver sont très compétitifs. Ottawa, Montréal et Calgary offrent d\'excellentes opportunités avec un coût de vie 30-40% inférieur.',
        'PVT (Permis Vacances-Travail) pour les 18-35 ans : accès libre au marché du travail pendant 2 ans, sans offre préalable.',
      ],
    },
    en: {
      trend: 'Active economic immigration via Express Entry — strong demand in tech, finance and healthcare',
      bestPeriod: 'September - November (year-end budgets, frequent Express Entry draws)',
      insights: [
        'Express Entry: build your CRS profile. Typical minimum score: 470-490. French-English bilingualism adds up to 50 bonus points.',
        'Canadian CV: North American format, max 2 pages. No photo or age. Start with Professional Summary, then reverse-chronological roles with metrics.',
        'Toronto and Vancouver are highly competitive. Ottawa, Montreal and Calgary offer excellent opportunities at 30-40% lower cost of living.',
        'Working Holiday (IEC) for ages 18-35: open work permit for 2 years with no prior job offer required.',
      ],
    },
  },
  UK: {
    offers: 5000,
    salary: 'GBP 45 000 - 85 000 (IT), GBP 35 000 - 60 000 (others)',
    fr: {
      trend: 'Post-Brexit, le Skilled Worker Visa a remplacé la libre circulation — demande forte en tech, finance et NHS',
      bestPeriod: 'Septembre - Novembre (rentrée, nouveaux projets) et Janvier - Mars (budgets annuels)',
      insights: [
        'Visa principal : Skilled Worker Visa. Nécessite un sponsor licencié (vérifiez gov.uk/government/publications/register-of-licensed-sponsors) et un salaire minimum de £26 200/an.',
        'CV UK : max 2 pages, pas de photo. Utilisez un "Personal Statement" percutant. Les recruteurs UK apprécient les verbes d\'action forts : "spearheaded", "delivered", "optimised".',
        'Londres = 60% des offres tech mais coût de vie élevé. Manchester, Bristol, Edinburgh et Leeds ont des scènes tech en essor avec des loyers 40-50% inférieurs.',
        'Le "right to work check" est obligatoire dès le premier jour. Préparez votre BRP et votre share code sur gov.uk/prove-right-to-work.',
      ],
    },
    en: {
      trend: 'Post-Brexit, Skilled Worker Visa replaced free movement — strong demand in tech, finance and NHS',
      bestPeriod: 'September - November (new projects) and January - March (annual budgets)',
      insights: [
        'Main visa: Skilled Worker Visa. Requires a licensed sponsor (check gov.uk/government/publications/register-of-licensed-sponsors) and a minimum salary of £26,200/year.',
        'UK CV: max 2 pages, no photo. Open with a punchy Personal Statement. Recruiters value strong action verbs: "spearheaded", "delivered", "optimised".',
        'London holds 60% of tech roles but costs are high. Manchester, Bristol, Edinburgh and Leeds have booming tech scenes at 40-50% lower rents.',
        'A right-to-work check is mandatory on day one. Prepare your BRP and share code via gov.uk/prove-right-to-work.',
      ],
    },
  },
  US: {
    offers: 15000,
    salary: 'USD 100 000 - 180 000 (IT), USD 70 000 - 120 000 (others)',
    fr: {
      trend: 'Plus grand marché tech mondial — processus visa complexe mais salaires très élevés',
      bestPeriod: 'Janvier - Mars (candidatures H-1B, loterie en mars) et Septembre - Octobre (nouvelles levées de fonds)',
      insights: [
        'Visa H-1B : loterie annuelle en mars, taux de sélection ~25%. Votre employeur dépose la pétition. Alternative : visa L-1 (transfert intra-entreprise) ou O-1.',
        'CV US : "resume" d\'1 page pour <10 ans d\'expérience, 2 pages max. Format très concis, orienté résultats chiffrés. Jamais de photo, d\'âge ou de nationalité.',
        'Négociation : les packages US incluent base salary + stock options/RSUs + signing bonus + 401(k) match. Le "total compensation" peut être 30-50% supérieur au salaire affiché.',
        'Pour les Français : le visa E-2 (investisseur) est accessible via le traité bilatéral. Idéal pour les entrepreneurs avec un investissement à partir de $100K.',
      ],
    },
    en: {
      trend: "World's largest tech market — complex visa process but very high salaries",
      bestPeriod: 'January - March (H-1B applications, lottery in March) and September - October (new funding rounds)',
      insights: [
        'H-1B visa: annual lottery in March, ~25% selection rate. Your employer files the petition. Alternatives: L-1 (intra-company transfer) or O-1 (extraordinary ability).',
        'US resume: 1 page for under 10 years experience, 2 pages max. Very concise, results-focused format. Never include photo, age or nationality.',
        'Negotiation: US packages include base salary + stock options/RSUs + signing bonus + 401(k) match. Total compensation can be 30-50% above the listed salary.',
        'E-2 investor visa available for French nationals via bilateral treaty. Ideal for entrepreneurs with an investment from $100K.',
      ],
    },
  },
  SG: {
    offers: 2000,
    salary: 'SGD 72 000 - 144 000 (IT), SGD 60 000 - 108 000 (others)',
    fr: {
      trend: 'Hub tech et financier d\'Asie du Sud-Est — environnement anglophone, fiscalité attractive',
      bestPeriod: 'Janvier - Mars (nouveaux budgets) et Juillet - Septembre (mi-année fiscale)',
      insights: [
        'Visa principal : Employment Pass (EP). Salaire minimum de SGD 5 000/mois. Le système COMPASS à points évalue diversité, salaire et qualifications.',
        'CV Singapour : format international, max 2 pages. Mettez en avant vos expériences internationales et compétences multilingues.',
        'Singapour n\'a pas d\'impôt sur les plus-values ni sur les dividendes. L\'impôt sur le revenu est plafonné à 22%.',
        'Le marché favorise les profils fintech, blockchain, cybersécurité et data science. Les certifications CISSP, CFA ou AWS sont des accélérateurs de carrière.',
      ],
    },
  },
  MY: {
    offers: 800,
    salary: 'MYR 84 000 - 180 000 (IT), MYR 60 000 - 120 000 (others)',
    fr: {
      trend: 'Économie en croissance, hub régional pour les multinationales — coût de vie très compétitif',
      bestPeriod: 'Janvier - Mars et Juillet - Septembre (cycles budgétaires des multinationales)',
      insights: [
        'Visa principal : Employment Pass (EP) catégorie I (>MYR 10 000/mois) ou II (MYR 5 000-9 999/mois). Traitement : 2-4 semaines.',
        'Kuala Lumpur et Penang sont les hubs tech principaux. Le programme MSC Malaysia Status offre des avantages fiscaux aux entreprises tech.',
        'Coût de vie 60-70% inférieur à la France. Un salaire de MYR 10 000/mois (~€2 000) offre un excellent niveau de vie.',
        'Visa DE Rantau (digital nomad) pour les freelances tech, valable 12 mois renouvelable. Revenu minimum requis : USD 24 000/an.',
      ],
    },
  },
  PH: {
    offers: 600,
    salary: 'PHP 1 200 000 - 3 000 000 (IT/management), PHP 800 000 - 1 500 000 (others)',
    fr: {
      trend: 'Secteur BPO en plein essor, demande croissante en IT et services partagés',
      bestPeriod: 'Janvier - Avril (avant la saison des pluies, nouveaux contrats BPO)',
      insights: [
        'Visa : Alien Employment Permit (AEP) + visa de travail 9(g). PEZA-registered companies ont des procédures accélérées.',
        'Manille (BGC, Makati) concentre les sièges régionaux. Cebu est le 2ᵉ hub tech avec un coût de vie 30% inférieur.',
        'Les expats occupent principalement des postes de management et expertise technique. Les salaires expats sont 3-5x supérieurs aux salaires locaux.',
        'L\'anglais est langue officielle de travail — pas de barrière linguistique.',
      ],
    },
  },
  ID: {
    offers: 700,
    salary: 'IDR 180M - 480M (IT/management), IDR 120M - 240M (others)',
    fr: {
      trend: 'Plus grande économie d\'Asie du Sud-Est — startup scene dynamique à Jakarta et Bali',
      bestPeriod: 'Janvier - Mars (post-Ramadan) et Août - Octobre (2ᵉ semestre)',
      insights: [
        'Visa : ITAS (Izin Tinggal Terbatas) via l\'employeur sponsor. Visa B211A "digital nomad" pour freelances (6 mois renouvelable).',
        'Jakarta (SCBD, Sudirman) = centre financier et tech. Bali attire les startups et remote workers.',
        'Négociez en package : salaire brut + logement + assurance santé internationale + billet retour annuel.',
        'L\'indonésien (Bahasa) de base est un atout. Les relations professionnelles sont hiérarchiques.',
      ],
    },
  },
  TH: {
    offers: 500,
    salary: 'THB 1 200 000 - 3 600 000 (IT/management), THB 840 000 - 1 800 000 (others)',
    fr: {
      trend: 'Hub régional pour les multinationales, scène startup en croissance — coût de vie attractif',
      bestPeriod: 'Octobre - Février (saison haute business, post-mousson)',
      insights: [
        'Visa : Non-Immigrant B + Work Permit. Quota de 4 employés thaïlandais par expat. Le BOI accorde des dérogations.',
        'Bangkok (Silom, Sukhumvit, Sathorn) concentre 80% des opportunités. L\'Eastern Seaboard (EEC) attire l\'industrie tech.',
        'Nouveau visa LTR (Long-Term Resident) pour les high-skilled professionals : 10 ans, impôt réduit à 17%. Revenu minimum : $80 000/an.',
        'Les Thaïlandais valorisent le "kreng jai" — restez calme, souriez, ne haussez jamais le ton en entretien.',
      ],
    },
  },
  HK: {
    offers: 1800,
    salary: 'HKD 480 000 - 960 000 (IT), HKD 600 000 - 1 500 000 (finance)',
    fr: {
      trend: 'Centre financier mondial, fiscalité basse — demande forte en finance, tech et droit',
      bestPeriod: 'Janvier - Mars (post-Nouvel An chinois) et Septembre - Novembre',
      insights: [
        'Visa principal : Employment Visa via l\'employeur. Top Talent Pass Scheme (TTPS) pour diplômés des 100 meilleures universités mondiales — traitement en 4 semaines.',
        'Impôt sur le revenu plafonné à 15%, pas d\'impôt sur les plus-values ni de TVA.',
        'Central/Admiralty = finance, Cyberport = tech/startups. Un studio à Central coûte HKD 15 000-25 000/mois.',
        'Le mandarin est un plus croissant. La culture business HK est très directe — préparez un elevator pitch en 30 secondes.',
      ],
    },
  },
}

const DEFAULT_DATA: CountryEntry = {
  offers: 500,
  salary: null,
  fr: {
    trend: 'Marché ouvert aux profils internationaux — vérifiez les accords bilatéraux avec la France',
    bestPeriod: 'Janvier - Mars et Septembre - Novembre (cycles budgétaires internationaux)',
    insights: [
      'Consultez le site de l\'ambassade de France pour les accords de mobilité et les types de visas de travail disponibles.',
      'Format CV international : max 2 pages, en anglais, pas de photo. Structurez avec un "Summary" puis expériences avec résultats chiffrés.',
      'Contactez la Chambre de Commerce Franco-locale — elle publie des offres et organise des événements networking pour les expatriés.',
    ],
  },
  en: {
    trend: 'Market open to international profiles — check bilateral agreements with your home country',
    bestPeriod: 'January - March and September - November (international budget cycles)',
    insights: [
      'Check the French embassy website for mobility agreements and available work visa types.',
      'International CV format: max 2 pages, in English, no photo. Structure with a Summary then roles with quantified results.',
      'Contact the local Franco-local Chamber of Commerce — they post job listings and host networking events for expats.',
    ],
  },
}

// ─── Service ─────────────────────────────────────────────────────────────────

export default class MarketSnapshotService {
  private cacheService: CacheService

  constructor(cacheService?: CacheService) {
    this.cacheService = cacheService ?? new CacheService()
  }

  async getSnapshot(country: string, sector?: string, lang: string = 'fr'): Promise<MarketSnapshot> {
    const safeLang = lang in LOCALE_NAMES ? lang : 'fr'
    const cacheKey = `${country}::${sector ?? 'all'}::${safeLang}`.toLowerCase()

    const result = await this.cacheService.getOrFetch(
      'market_snapshot',
      'market',
      cacheKey,
      async () => this.fetchMarketData(country, sector, safeLang)
    )

    return result.data as unknown as MarketSnapshot
  }

  private async fetchMarketData(
    country: string,
    sector?: string,
    lang: string = 'fr'
  ): Promise<Record<string, unknown>> {
    logger.info('Fetching market data for %s / %s / %s', country, sector ?? 'all sectors', lang)
    return this.getStaticMarketData(country, sector, lang) as unknown as Record<string, unknown>
  }

  private getStaticMarketData(country: string, sector?: string, lang: string = 'fr'): MarketSnapshot {
    const code = country.toUpperCase()
    const entry = COUNTRY_DATA[code] ?? DEFAULT_DATA
    const langData = entry[lang as keyof CountryEntry] as LangData | undefined
    const data: LangData = langData ?? (() => {
      logger.warn({ country, lang }, 'No market data for requested lang — falling back to fr')
      return entry.fr
    })()

    return {
      country,
      sector: sector ?? null,
      trend: data.trend,
      bestPeriod: data.bestPeriod,
      estimatedOffers: entry.offers,
      averageSalary: entry.salary,
      insights: data.insights,
      fetchedAt: new Date().toISOString(),
    }
  }
}
