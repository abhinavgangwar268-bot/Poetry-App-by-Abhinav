export interface Shayari {
  text: string;
  poet: string;
  mood: string;
  meanings: Record<string, string>;
  musicSuggestion: string;
  videoConcept: string;
  styleInspiration?: string;
  tags: string[];
}

export type AppState = 'IDLE' | 'LOADING' | 'RESULTS';
