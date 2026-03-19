export interface RelevanceLevel {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

export const RELEVANCE_LEVELS: RelevanceLevel[] = [
  {
    id: 'very_relevant',
    label: 'Très pertinent',
    min: 75,
    max: 100,
    color: '#22c55e', // green
  },
  {
    id: 'relevant',
    label: 'Pertinent',
    min: 50,
    max: 74,
    color: '#3b82f6', // blue
  },
  {
    id: 'to_review',
    label: 'À examiner',
    min: 25,
    max: 49,
    color: '#f59e0b', // amber
  },
  {
    id: 'not_relevant',
    label: 'Non pertinent',
    min: 0,
    max: 24,
    color: '#ef4444', // red
  },
];

export function getRelevanceLevel(score: number): RelevanceLevel {
  const level = RELEVANCE_LEVELS.find(
    (l) => score >= l.min && score <= l.max,
  );
  return level ?? RELEVANCE_LEVELS[RELEVANCE_LEVELS.length - 1];
}
