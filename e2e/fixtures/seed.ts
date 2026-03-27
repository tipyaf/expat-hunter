const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'e2e-test@expathunter.test',
  password: process.env.E2E_USER_PASSWORD ?? 'E2eTestPassword123!',
  fullName: 'E2E Test User',
  locale: 'fr',
}

interface AuthResult {
  token: string
  user: { id: string; email: string; fullName: string }
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

export async function getOrCreateTestUser(): Promise<AuthResult> {
  try {
    return await apiRequest<AuthResult>('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
  } catch {
    return await apiRequest<AuthResult>('POST', '/api/auth/register', TEST_USER)
  }
}

export async function seedCandidateProfile(token: string): Promise<void> {
  try {
    await apiRequest('PUT', '/api/profile', {
      skills: ['TypeScript', 'Node.js', 'React'],
      experienceYears: 8,
      targetCountries: ['NZ', 'AU'],
      targetSectors: ['technology', 'digital'],
      targetRoles: ['CTO', 'Tech Lead', 'Senior Developer'],
    }, token)
  } catch {
    // Profile may already exist
  }
}

export async function seedTestContact(
  token: string,
  overrides?: Partial<{
    fullName: string
    role: string
    email: string
    status: string
    aiRecommendation: string
  }>,
): Promise<string> {
  // We need to create via direct DB since there's no "create contact" API
  // For now, we'll use the sourcing flow or check if contacts already exist
  // This is a placeholder — real seeding requires DB access or a seed endpoint
  const res = await apiRequest<{ data: Array<{ id: string }> }>(
    'GET',
    '/api/contacts',
    undefined,
    token,
  )

  if (res.data.length > 0) {
    return res.data[0].id
  }

  throw new Error('No contacts available. Run sourcing first or seed DB manually.')
}

export async function ensureTestData(token: string): Promise<void> {
  await seedCandidateProfile(token)
}
