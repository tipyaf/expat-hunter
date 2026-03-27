import { useAuth } from '@/contexts/auth-context'

export function usePlan() {
  const { user } = useAuth()
  const plan = user?.plan ?? 'free'
  const isPremium = plan === 'premium'
  const isFree = plan === 'free'

  return { plan, isPremium, isFree }
}
