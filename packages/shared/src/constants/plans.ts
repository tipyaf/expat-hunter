export const PLAN_FREE = 'free' as const
export const PLAN_PREMIUM = 'premium' as const

export type UserPlan = typeof PLAN_FREE | typeof PLAN_PREMIUM

export const FREE_QUOTAS = {
  searches: 2,
  results: 5,
  emails: 5,
  chatQuestions: 15,
  cvGenerations: 1,
  coverLetterGenerations: 1,
} as const

export type QuotaType = keyof typeof FREE_QUOTAS
