import CandidateProfile from '#models/candidate_profile'
import FollowUpSequence from '#models/follow_up_sequence'
import type User from '#models/user'

interface UpdateProfileData {
  skills?: string[]
  experienceYears?: number
  targetCountries?: string[]
  targetSectors?: string[]
  targetRoles?: string[]
  preferences?: Record<string, unknown> | null
  cvText?: string | null
  cvFilePath?: string | null
  followUps?: Array<{ delay: number; unit: 'days' | 'weeks' | 'months' }> | null
  sendingSchedule?: {
    allowedDays: string[]
    startHour: number
    endHour: number
    timezone: string
  } | null
}

export default class ProfileService {
  async getOrCreateProfile(user: User): Promise<CandidateProfile> {
    let profile = await CandidateProfile.findBy('userId', user.id)
    if (!profile) {
      profile = await CandidateProfile.create({
        userId: user.id,
        skills: [],
        experienceYears: 0,
        targetCountries: [],
        targetSectors: [],
        targetRoles: [],
        onboardingCompleted: false,
      })
    }
    return profile
  }

  async updateProfile(user: User, data: UpdateProfileData): Promise<CandidateProfile> {
    const profile = await this.getOrCreateProfile(user)

    if (data.skills !== undefined) {
      profile.skills = data.skills
    }
    if (data.experienceYears !== undefined) {
      profile.experienceYears = data.experienceYears
    }
    if (data.targetCountries !== undefined) {
      profile.targetCountries = data.targetCountries
    }
    if (data.targetSectors !== undefined) {
      profile.targetSectors = data.targetSectors
    }
    if (data.targetRoles !== undefined) {
      profile.targetRoles = data.targetRoles
    }
    if (data.preferences !== undefined) {
      profile.preferences = data.preferences
    }
    if (data.cvText !== undefined) {
      profile.cvText = data.cvText
    }
    if (data.cvFilePath !== undefined) {
      profile.cvFilePath = data.cvFilePath
    }
    if (data.followUps !== undefined) {
      profile.followUps = data.followUps
    }
    if (data.sendingSchedule !== undefined) {
      profile.sendingSchedule = data.sendingSchedule
    }

    await profile.save()
    return profile
  }

  async completeOnboarding(user: User): Promise<CandidateProfile> {
    const profile = await CandidateProfile.findByOrFail('userId', user.id)

    if (profile.skills.length === 0 && !profile.cvText) {
      throw new Error('Profile must have skills or a CV before completing onboarding')
    }
    if (profile.targetCountries.length === 0) {
      throw new Error('Profile must have at least one target country')
    }

    profile.onboardingCompleted = true
    await profile.save()

    // Create default follow-up sequence if none exists
    const existingSequence = await FollowUpSequence.findBy('userId', user.id)
    if (!existingSequence) {
      await FollowUpSequence.create({
        userId: user.id,
        delayDays1: 3,
        delayDays2: 7,
        delayDays3: 14,
      })
    }

    return profile
  }

  async getProfile(userId: string): Promise<CandidateProfile | null> {
    return CandidateProfile.findBy('userId', userId)
  }
}
