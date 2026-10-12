export type Term = 'swarm' | 'worker' | 'schedule' | 'audit' | 'oracle' | 'seat' | 'launch';

export interface Issue {
  no: number;
  date: string;
  week: string;
  lead: { kicker: string; headline: string; standfirst: string; body: string[]; visit: string | null; source: string };
  new: { headline: string; summary: string; more: string; visit: string | null; source: string }[];
  bugs: { severity: 'Serious' | 'Moderate'; headline: string; summary: string; source: string }[];
  answers: { question: string; summary: string; source: string }[];
  numbers: { accepted: number; launches: number; answers: number; online: number };
  meter: { level: number; verdict: string };
  leaders: { seat: number; jobs: number }[];
  /** Issues without leadersScope list all-time totals. */
  leadersScope?: 'this week' | 'all time';
  watch: { headline: string; text: string; visit: string | null };
  glossary: Term[];
}

export interface EditionNote {
  no: number;
  reportedAt: string;
  watchSource: string;
  numbersNote: string;
  leadersNote: string;
  meterNote: string;
  sources: { label: string; url: string }[];
}

export interface ContentBundle {
  issues: Issue[];
  notes: Record<string, EditionNote>;
}
