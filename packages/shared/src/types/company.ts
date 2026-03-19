export interface Company {
  id: string; // uuid
  name: string;
  website?: string;
  sector?: string;
  size?: string;
  city?: string;
  country: string;
  linkedinUrl?: string;
  signals?: Record<string, unknown>;
  source: string;
}
