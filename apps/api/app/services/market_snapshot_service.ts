/**
 * MarketSnapshotService — Assembles market data from cache + web search.
 *
 * Returns: trend, best period, estimated offers, average salary.
 * Cached for 7 days (market TTL).
 */
import CacheService from './cache_service.js'
import logger from '@adonisjs/core/services/logger'

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

export default class MarketSnapshotService {
  private cacheService: CacheService

  constructor(cacheService?: CacheService) {
    this.cacheService = cacheService ?? new CacheService()
  }

  /**
   * Get market snapshot for a country/sector, using cache-first approach.
   */
  async getSnapshot(country: string, sector?: string): Promise<MarketSnapshot> {
    const cacheKey = `${country}::${sector ?? 'all'}`.toLowerCase()

    const result = await this.cacheService.getOrFetch(
      'market_snapshot',
      'market',
      cacheKey,
      async () => this.fetchMarketData(country, sector)
    )

    return result.data as unknown as MarketSnapshot
  }

  /**
   * Fetch market data. In production, this would call an external API
   * (e.g., Perplexity, web search). For now, returns structured defaults
   * based on country knowledge.
   */
  private async fetchMarketData(
    country: string,
    sector?: string
  ): Promise<Record<string, unknown>> {
    logger.info('Fetching market data for %s / %s', country, sector ?? 'all sectors')

    // Static market data by country — will be replaced by Perplexity API later
    const marketData = this.getStaticMarketData(country, sector)

    return marketData as unknown as Record<string, unknown>
  }

  /**
   * Static market data as fallback / initial implementation.
   * Will be replaced by AI-powered web search in a future iteration.
   *
   * Content must be ACTIONABLE and EXPERT-LEVEL — no generic advice.
   * Each insight should tell the user exactly what to do, not what to research.
   */
  private getStaticMarketData(country: string, sector?: string): MarketSnapshot {
    const code = country.toUpperCase()
    const now = new Date().toISOString()

    const countryData: Record<
      string,
      { trend: string; bestPeriod: string; offers: number; salary: string; insights: string[] }
    > = {
      NZ: {
        trend: 'Forte demande en IT, santé et construction — pénurie chronique de profils qualifiés',
        bestPeriod: 'Février - Avril (début d\'année fiscale NZ, budgets ouverts)',
        offers: 1200,
        salary: 'NZD 80 000 - 130 000 (IT), NZD 70 000 - 100 000 (autres)',
        insights: [
          'Visa principal : AEWV (Accredited Employer Work Visa). L\'employeur doit être accrédité auprès d\'Immigration NZ — vérifiez sur employer.immigration.govt.nz avant de postuler.',
          'CV NZ : max 2 pages, pas de photo, pas de date de naissance. Commencez par un "Profile Summary" de 3 lignes, puis "Key Achievements" chiffrés. Les Kiwis lisent en diagonale.',
          'Culture : tutoiement systématique, ton décontracté en entretien. Préparez des exemples concrets de travail en équipe — la "culture fit" pèse autant que les compétences techniques.',
          'Négociation : les salaires sont négociables à hauteur de 10-15%. Demandez aussi les "benefits" : KiwiSaver (retraite, 3% employeur), flexible working, et jours de congé supplémentaires.',
        ],
      },
      AU: {
        trend: 'Marché très dynamique — pénurie de main d\'œuvre qualifiée dans la tech, la santé et les métiers du bâtiment',
        bestPeriod: 'Janvier - Mars (rentrée australienne, nouveaux budgets)',
        offers: 3500,
        salary: 'AUD 100 000 - 150 000 (IT), AUD 80 000 - 120 000 (autres)',
        insights: [
          'Visa principal : TSS 482 (Temporary Skill Shortage). Votre métier doit figurer sur la "Skilled Occupation List" — consultez immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list.',
          'CV AU : format "achievement-based", max 3 pages. Chaque expérience doit lister des résultats chiffrés (ex: "Increased conversion by 25%"). Pas de photo ni d\'infos personnelles.',
          'Sydney et Melbourne concentrent 70% des offres tech. Pour un meilleur ratio coût/qualité de vie, visez Brisbane, Adelaide ou Perth où la concurrence est moindre et les salaires proches.',
          'Les certifications cloud (AWS, Azure, GCP) et Agile (SAFe, Scrum Master) sont très valorisées et peuvent augmenter votre salaire de 15-20%.',
        ],
      },
      CA: {
        trend: 'Immigration économique active via Express Entry — forte demande en tech, finance et santé',
        bestPeriod: 'Septembre - Novembre (budgets de fin d\'année, tirages Express Entry fréquents)',
        offers: 4000,
        salary: 'CAD 80 000 - 130 000 (IT), CAD 65 000 - 100 000 (autres)',
        insights: [
          'Express Entry : créez votre profil dans le bassin avec vos points CRS. Score minimum typique : 470-490. Le bilinguisme français-anglais ajoute jusqu\'à 50 points bonus — passez le TEF/TCF.',
          'CV Canada : format nord-américain, max 2 pages. Pas de photo, pas d\'âge, pas de statut marital. Commencez par "Professional Summary", puis expériences en ordre anti-chronologique avec métriques.',
          'Toronto et Vancouver sont les hubs tech majeurs mais très compétitifs. Ottawa, Montréal et Calgary offrent d\'excellentes opportunités avec un coût de vie 30-40% inférieur.',
          'Programme pilote PVT (Permis Vacances-Travail) pour les 18-35 ans : accès libre au marché du travail pendant 2 ans, sans offre d\'emploi préalable.',
        ],
      },
      UK: {
        trend: 'Post-Brexit, le Skilled Worker Visa a remplacé la libre circulation — demande forte en tech, finance et NHS',
        bestPeriod: 'Septembre - Novembre (rentrée, nouveaux projets) et Janvier - Mars (budgets annuels)',
        offers: 5000,
        salary: 'GBP 45 000 - 85 000 (IT), GBP 35 000 - 60 000 (autres)',
        insights: [
          'Visa principal : Skilled Worker Visa. Nécessite un sponsor licencié (vérifiez sur gov.uk/government/publications/register-of-licensed-sponsors) et un salaire minimum de £26 200/an ou le taux du poste.',
          'CV UK : max 2 pages, pas de photo. Utilisez un "Personal Statement" percutant en ouverture. Les recruteurs UK apprécient les verbes d\'action forts : "spearheaded", "delivered", "optimised".',
          'Londres = 60% des offres tech mais coût de vie élevé. Manchester, Bristol, Edinburgh et Leeds sont des alternatives avec des scènes tech en plein essor et des loyers 40-50% inférieurs.',
          'Le "right to work check" est obligatoire dès le premier jour. Préparez votre BRP (Biometric Residence Permit) et votre share code sur gov.uk/prove-right-to-work.',
        ],
      },
      US: {
        trend: 'Plus grand marché tech mondial — processus visa complexe mais salaires très élevés',
        bestPeriod: 'Janvier - Mars (candidatures H-1B, loterie en mars) et Septembre - Octobre (nouvelles levées de fonds)',
        offers: 15000,
        salary: 'USD 100 000 - 180 000 (IT), USD 70 000 - 120 000 (autres)',
        insights: [
          'Visa H-1B : loterie annuelle en mars, taux de sélection ~25%. Votre employeur doit déposer la pétition. Alternative : visa L-1 (transfert intra-entreprise) ou O-1 (compétences extraordinaires).',
          'CV US : "resume" d\'1 page pour <10 ans d\'expérience, 2 pages max au-delà. Format très concis, orienté résultats chiffrés. Jamais de photo, d\'âge ou de nationalité.',
          'Négociation : les packages US incluent base salary + stock options/RSUs + signing bonus + 401(k) match. Le "total compensation" peut être 30-50% supérieur au salaire de base affiché.',
          'Pour les Français : le visa E-2 (investisseur) est accessible grâce au traité bilatéral. Idéal pour les entrepreneurs/freelances avec un investissement à partir de $100K.',
        ],
      },
      SG: {
        trend: 'Hub tech et financier d\'Asie du Sud-Est — environnement anglophone, fiscalité attractive',
        bestPeriod: 'Janvier - Mars (nouveaux budgets) et Juillet - Septembre (mi-année fiscale)',
        offers: 2000,
        salary: 'SGD 72 000 - 144 000 (IT), SGD 60 000 - 108 000 (autres)',
        insights: [
          'Visa principal : Employment Pass (EP). Salaire minimum de SGD 5 000/mois (SGD 5 500 pour le secteur financier). Le système COMPASS à points évalue diversité, salaire et qualifications.',
          'CV Singapour : format international, max 2 pages. Mettez en avant vos expériences internationales et compétences multilingues — très valorisées dans ce hub multiculturel.',
          'Singapour n\'a pas d\'impôt sur les plus-values ni sur les dividendes. L\'impôt sur le revenu est plafonné à 22% (vs 45% en France). Facteur clé dans la négociation du package.',
          'Le marché favorise les profils avec expérience en fintech, blockchain, cybersécurité et data science. Les certifications CISSP, CFA ou AWS sont des accélérateurs de carrière.',
        ],
      },
      MY: {
        trend: 'Économie en croissance, hub régional pour les multinationales — coût de vie très compétitif',
        bestPeriod: 'Janvier - Mars et Juillet - Septembre (cycles budgétaires des multinationales)',
        offers: 800,
        salary: 'MYR 84 000 - 180 000 (IT), MYR 60 000 - 120 000 (autres)',
        insights: [
          'Visa principal : Employment Pass (EP) catégorie I (>MYR 10 000/mois) ou II (MYR 5 000-9 999/mois). Demande via l\'employeur auprès d\'Immigration Malaysia. Traitement : 2-4 semaines.',
          'Kuala Lumpur et Penang sont les hubs tech principaux. Le programme MSC Malaysia Status offre des avantages fiscaux aux entreprises tech — ciblez ces employeurs en priorité.',
          'Coût de vie 60-70% inférieur à la France. Un salaire de MYR 10 000/mois (~€2 000) offre un excellent niveau de vie. Négociez aussi logement, assurance santé et billets retour annuels.',
          'Visa alternatif : DE Rantau (digital nomad) pour les freelances tech, valable 12 mois renouvelable. Revenu minimum requis : USD 24 000/an.',
        ],
      },
      PH: {
        trend: 'Secteur BPO en plein essor, demande croissante en IT et services partagés',
        bestPeriod: 'Janvier - Avril (avant la saison des pluies, nouveaux contrats BPO)',
        offers: 600,
        salary: 'PHP 1 200 000 - 3 000 000 (IT/management), PHP 800 000 - 1 500 000 (autres)',
        insights: [
          'Visa : Alien Employment Permit (AEP) + visa de travail 9(g). L\'employeur gère la demande. PEZA-registered companies (zones économiques) ont des procédures accélérées.',
          'Manille (BGC, Makati) concentre les sièges régionaux. Cebu est le 2ᵉ hub tech avec un coût de vie 30% inférieur. Clark et Iloilo émergent comme alternatives.',
          'Les expats occupent principalement des postes de management, expertise technique et formation. Les salaires expats sont 3-5x supérieurs aux salaires locaux — justifiez votre valeur ajoutée unique.',
          'L\'anglais est langue officielle et de travail — pas de barrière linguistique. Les Philippins apprécient un management bienveillant et des feedbacks positifs avant les critiques constructives.',
        ],
      },
      ID: {
        trend: 'Plus grande économie d\'Asie du Sud-Est — startup scene dynamique à Jakarta et Bali',
        bestPeriod: 'Janvier - Mars (post-Ramadan) et Août - Octobre (2ᵉ semestre)',
        offers: 700,
        salary: 'IDR 180M - 480M (IT/management), IDR 120M - 240M (autres)',
        insights: [
          'Visa : ITAS (Izin Tinggal Terbatas) via l\'employeur sponsor. Nouveau : visa B211A "digital nomad" pour freelances (6 mois renouvelable). Plan de compétences (RPTKA) requis pour l\'employeur.',
          'Jakarta (SCBD, Sudirman) = centre financier et tech. Bali attire les startups et remote workers. Bandung et Surabaya offrent des opportunités avec un coût de vie très bas.',
          'Négociez en package : salaire brut + logement (souvent fourni) + assurance santé internationale + billet retour annuel + allocation transport. L\'impôt sur le revenu est de 5-30% progressif.',
          'L\'indonésien (Bahasa) de base est un atout majeur pour l\'intégration. Les relations professionnelles sont hiérarchiques — utilisez les titres (Pak/Bu) et évitez la confrontation directe.',
        ],
      },
      TH: {
        trend: 'Hub régional pour les multinationales, scène startup en croissance — coût de vie attractif',
        bestPeriod: 'Octobre - Février (saison haute business, post-mousson)',
        offers: 500,
        salary: 'THB 1 200 000 - 3 600 000 (IT/management), THB 840 000 - 1 800 000 (autres)',
        insights: [
          'Visa : Non-Immigrant B + Work Permit. Quota de 4 employés thaïlandais par expat. Le BOI (Board of Investment) accorde des dérogations aux entreprises promues — ciblez-les.',
          'Bangkok (Silom, Sukhumvit, Sathorn) concentre 80% des opportunités internationales. Le Eastern Seaboard (EEC) attire l\'industrie et la tech avec des incitations fiscales.',
          'Nouveau visa LTR (Long-Term Resident) pour les "high-skilled professionals" : 10 ans, impôt réduit à 17%, exemption du ratio 4:1. Revenu minimum : $80 000/an ou $40 000 avec master.',
          'Les Thaïlandais valorisent le "kreng jai" (considération) — restez calme, souriez, ne haussez jamais le ton. En entretien, montrez votre adaptabilité culturelle avec des exemples concrets.',
        ],
      },
      HK: {
        trend: 'Centre financier mondial, fiscalité basse — demande forte en finance, tech et droit',
        bestPeriod: 'Janvier - Mars (post-Nouvel An chinois, nouveaux budgets) et Septembre - Novembre',
        offers: 1800,
        salary: 'HKD 480 000 - 960 000 (IT), HKD 600 000 - 1 500 000 (finance)',
        insights: [
          'Visa principal : Employment Visa via l\'employeur sponsor. Nouveau : Top Talent Pass Scheme (TTPS) pour diplômés des 100 meilleures universités mondiales — traitement en 4 semaines.',
          'Impôt sur le revenu plafonné à 15% (salaries tax), pas d\'impôt sur les plus-values, pas de TVA. Un salaire brut de HKD 50 000/mois = un net très élevé comparé à l\'Europe.',
          'Central/Admiralty = finance, Cyberport = tech/startups, Kowloon East = médias. Le logement est le poste le plus cher — un studio à Central coûte HKD 15 000-25 000/mois.',
          'Le cantonais n\'est pas requis dans les entreprises internationales mais le mandarin est un plus croissant. Préparez un "elevator pitch" en 30 secondes — la culture business HK est très directe.',
        ],
      },
    }

    const data = countryData[code] ?? {
      trend: `Marché ouvert aux profils internationaux — vérifiez les accords bilatéraux avec la France`,
      bestPeriod: 'Janvier - Mars et Septembre - Novembre (cycles budgétaires internationaux)',
      offers: 500,
      salary: null,
      insights: [
        `Consultez le site de l'ambassade de France en ${country} pour les accords de mobilité et les types de visas de travail disponibles.`,
        'Format CV international : max 2 pages, en anglais, pas de photo. Structurez avec un "Summary", puis expériences avec résultats chiffrés, puis compétences techniques.',
        'Contactez la Chambre de Commerce Franco-locale — elle publie des offres et organise des événements networking pour les expatriés français.',
      ],
    }

    return {
      country,
      sector: sector ?? null,
      trend: data.trend,
      bestPeriod: data.bestPeriod,
      estimatedOffers: data.offers,
      averageSalary: data.salary ?? null,
      insights: data.insights,
      fetchedAt: now,
    }
  }
}
