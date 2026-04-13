export interface CustomPlatform {
  id: string
  userId: string
  name: string
  url: string
  country: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomPlatformPayload {
  name: string
  url: string
  country?: string
}

export interface PlatformSuggestion {
  name: string
  url: string
  description: string
}
