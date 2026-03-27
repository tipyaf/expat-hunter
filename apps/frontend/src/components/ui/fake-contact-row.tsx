'use client'

const FAKE_NAMES = [
  'Sarah M.', 'James K.', 'Emily R.', 'Michael B.', 'Laura T.',
  'David W.', 'Anna C.', 'Robert H.', 'Claire F.', 'Thomas L.',
  'Sophie G.', 'Daniel P.', 'Marie S.', 'Andrew D.', 'Julie N.',
]

const FAKE_ROLES = [
  'Engineering Manager', 'VP of Engineering', 'Head of Product',
  'CTO', 'Director of Operations', 'Tech Lead', 'Head of Growth',
  'VP of People', 'Head of Engineering', 'Director of Technology',
]

const FAKE_COMPANIES = [
  'TechCo Ltd', 'GlobalSoft Inc', 'InnovateTech', 'DataDriven NZ',
  'CloudFirst', 'NextGen Solutions', 'DigiVentures', 'ScaleUp HQ',
  'FutureStack', 'DevOps Pro', 'SmartBuild', 'CodeCraft',
]

const FAKE_LOCATIONS = [
  'Auckland, NZ', 'Wellington, NZ', 'Sydney, AU', 'Melbourne, AU',
  'London, UK', 'Toronto, CA', 'Vancouver, CA', 'Brisbane, AU',
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function pickFromArray<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)]
}

interface FakeContactRowProps {
  index: number
  userId: string
}

export function FakeContactRow({ index, userId }: FakeContactRowProps) {
  const seed = index * 31 + userId.charCodeAt(0) * 17
  const name = pickFromArray(FAKE_NAMES, seed)
  const role = pickFromArray(FAKE_ROLES, seed + 1)
  const company = pickFromArray(FAKE_COMPANIES, seed + 2)
  const location = pickFromArray(FAKE_LOCATIONS, seed + 3)
  const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium truncate blur-[4px]">{name}</h3>
          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 blur-[4px]">
            identified
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--color-text-main)] blur-[4px]">{role}</p>
        <p className="text-sm text-[var(--color-text-muted)] blur-[4px]">
          {company} · {location}
        </p>
        <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
          <span className="blur-[4px]">{email}</span>
        </div>
      </div>
    </div>
  )
}
