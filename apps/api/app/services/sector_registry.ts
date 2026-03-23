/**
 * SectorRegistry — Configuration per sector for contact targeting.
 *
 * Holds role whitelists, blacklists, and job board keywords per sector.
 * Same pattern as ScraperRegistry. Adding a sector = 1 entry in SECTOR_CONFIGS.
 */

export interface SectorConfig {
  sectorKey: string
  displayName: string
  aliases: string[]
  roleWhitelist: string[]
  roleBlacklist: string[]
  jobBoardKeywords: string[]
}

const SECTOR_CONFIGS: SectorConfig[] = [
  {
    sectorKey: 'it_software_tech',
    displayName: 'IT / Software / Tech',
    aliases: ['technology', 'software', 'saas', 'tech', 'digital', 'startup', 'it services'],
    roleWhitelist: [
      // C-level tech
      'cto',
      'chief technology officer',
      'vp engineering',
      'vp of engineering',
      'vice president engineering',
      // Engineering managers (direct hiring authority)
      'engineering manager',
      'head of engineering',
      'head of software engineering',
      'head of product engineering',
      'director of engineering',
      'software engineering manager',
      // Product
      'head of product',
      'vp product',
      'director of product',
      // Infrastructure / platform
      'head of infrastructure',
      'head of platform',
      'director of platform engineering',
      'head of devops',
      'head of cloud',
      // Data / ML
      'head of data',
      'head of data engineering',
      'director of data science',
      'vp data',
      'head of machine learning',
      'head of ai',
      // Secondary — leads with influence
      'lead software engineer',
      'principal engineer',
      'staff engineer',
      'principal software engineer',
      'lead developer',
      'technical lead',
      'tech lead',
      'lead backend engineer',
      'lead frontend engineer',
      'lead full stack engineer',
    ],
    roleBlacklist: [
      'recruiter',
      'talent acquisition',
      'talent partner',
      'hr manager',
      'human resources',
      'people operations',
      'people partner',
      'office manager',
      'executive assistant',
      'receptionist',
      'sales',
      'account executive',
      'account manager',
      'marketing manager',
    ],
    jobBoardKeywords: [
      'software engineer',
      'developer',
      'full stack',
      'backend',
      'frontend',
      'devops',
      'data engineer',
      'machine learning',
      'cloud',
      'platform engineer',
    ],
  },
  {
    sectorKey: 'finance_fintech',
    displayName: 'Finance / Fintech / Banking',
    aliases: ['finance', 'fintech', 'banking', 'financial services', 'insurance', 'payments'],
    roleWhitelist: [
      'head of technology',
      'head of engineering',
      'chief technology officer',
      'cto',
      'development manager',
      'head of data',
      'head of analytics',
      'data engineering manager',
      'analytics manager',
      'head of digital',
      'head of platforms',
      'vp technology',
    ],
    roleBlacklist: [
      'recruiter',
      'talent acquisition',
      'hr manager',
      'human resources',
      'financial advisor',
      'financial analyst',
      'relationship manager',
      'branch manager',
    ],
    jobBoardKeywords: [
      'software engineer',
      'developer',
      'data engineer',
      'devops',
      'cloud',
      'fintech',
    ],
  },
  {
    sectorKey: 'healthcare_medtech',
    displayName: 'Healthcare / Medtech',
    aliases: ['healthcare', 'medtech', 'health', 'medical', 'biotech', 'health tech'],
    roleWhitelist: [
      'cto',
      'chief technology officer',
      'head of engineering',
      'it manager',
      'clinical informatics manager',
      'health it manager',
      'director of technology',
      'head of digital health',
      'vp technology',
    ],
    roleBlacklist: [
      'recruiter',
      'hr manager',
      'nurse manager',
      'clinical manager',
      'ward manager',
      'practice manager',
    ],
    jobBoardKeywords: [
      'software engineer',
      'health informatics',
      'clinical systems',
      'developer',
      'data engineer',
    ],
  },
]

export class SectorRegistry {
  private configs: Map<string, SectorConfig> = new Map()

  constructor() {
    for (const config of SECTOR_CONFIGS) {
      this.configs.set(config.sectorKey, config)
      for (const alias of config.aliases) {
        this.configs.set(alias.toLowerCase(), config)
      }
    }
  }

  getConfig(sectorKey: string): SectorConfig | undefined {
    return this.configs.get(sectorKey.toLowerCase())
  }

  getConfigOrDefault(sectorKey: string): SectorConfig {
    return this.configs.get(sectorKey.toLowerCase()) ?? SECTOR_CONFIGS[0]
  }

  isRoleRelevant(role: string, sectorKey: string, includeHr = false): boolean {
    const config = this.getConfigOrDefault(sectorKey)
    const normalized = role.toLowerCase()

    if (config.roleBlacklist.some((b) => normalized.includes(b))) return false
    if (!includeHr && this.isHrRole(normalized)) return false
    return config.roleWhitelist.some((w) => normalized.includes(w))
  }

  isHrRole(role: string): boolean {
    const HR_SIGNALS = ['recruiter', 'talent', 'hr ', 'human resources', 'people ops', 'people partner']
    const normalized = role.toLowerCase()
    return HR_SIGNALS.some((s) => normalized.includes(s))
  }

  getAllKeys(): string[] {
    return SECTOR_CONFIGS.map((c) => c.sectorKey)
  }
}

export const sectorRegistry = new SectorRegistry()
