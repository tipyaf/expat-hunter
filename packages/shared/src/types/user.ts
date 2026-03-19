export interface User {
  id: string; // uuid
  email: string;
  fullName: string;
  locale: string;
  createdAt: Date;
}

export interface CandidateProfile {
  id: string; // uuid
  userId: string;
  cvText?: string;
  cvFilePath?: string;
  skills: string[];
  experienceYears: number;
  targetCountries: string[];
  targetSectors: string[];
  targetRoles: string[];
  preferences?: Record<string, unknown>;
  onboardingCompleted: boolean;
}
