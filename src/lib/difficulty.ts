export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;
  desc: string;
  maxGuesses: number | null;
  clipPenalty: number;
  clipsAllowed: boolean;
}> = {
  easy:   { label: "Easy",   desc: "Star QBs only · Unlimited guesses · Hints auto-reveal",   maxGuesses: null, clipPenalty: 0,   clipsAllowed: true  },
  medium: { label: "Medium", desc: "All starters · 7 guesses · 1 hint per wrong guess",        maxGuesses: 7,    clipPenalty: 50,  clipsAllowed: true  },
  hard:   { label: "Hard",   desc: "Any QB · 4 guesses · No extra hints",                       maxGuesses: 4,    clipPenalty: 100, clipsAllowed: false },
};
