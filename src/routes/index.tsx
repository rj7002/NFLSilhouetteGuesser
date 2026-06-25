import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SilhouetteVideo } from "@/components/SilhouetteVideo";
import type { RandomClipResponse } from "./api/public/random-clip";
import type { Player as QBInfo, Position } from "@/lib/nfl-roster";
import { fmtHeight } from "@/lib/nfl-qbs";
import { type Difficulty, DIFFICULTY_CONFIG } from "@/lib/difficulty";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QB Silhouette — Guess the NFL Quarterback" },
      {
        name: "description",
        content: "Watch silhouette clips of NFL quarterbacks throwing and guess who it is.",
      },
    ],
  }),
  component: Game,
});

type Round = RandomClipResponse & { key: number };

type CellResult =
  | { match: true }
  | { match: false; hint?: "higher" | "lower" };

type GuessRow = {
  qb: QBInfo;
  team: CellResult;
  conf: CellResult;
  div: CellResult;
  height: CellResult;
  age: CellResult;
  jersey: CellResult;
  exp: CellResult;
  correct: boolean;
};

type RoundResult = {
  qbName: string;
  correct: boolean;
  guesses: number;
  seconds: number;
};

function compare(guessVal: number, answerVal: number): CellResult {
  if (guessVal === answerVal) return { match: true };
  return { match: false, hint: guessVal < answerVal ? "higher" : "lower" };
}

function buildRow(guess: QBInfo, answer: QBInfo): GuessRow {
  return {
    qb: guess,
    team: guess.team === answer.team ? { match: true } : { match: false },
    conf: guess.conference === answer.conference ? { match: true } : { match: false },
    div: guess.division === answer.division ? { match: true } : { match: false },
    height: compare(guess.heightIn, answer.heightIn),
    age: compare(guess.age, answer.age),
    jersey: compare(guess.jersey, answer.jersey),
    exp: compare(guess.yearsExp, answer.yearsExp),
    correct: guess.id === answer.id,
  };
}

async function fetchRound(difficulty: Difficulty, position: Position): Promise<RandomClipResponse> {
  const res = await fetch(`/api/public/random-clip?difficulty=${difficulty}&position=${position}`);
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as RandomClipResponse;
}

// ── Cell component ─────────────────────────────────────────────────
function Cell({ result, children }: { result: CellResult; children: React.ReactNode }) {
  const base =
    "flex items-center justify-center gap-0.5 rounded px-1.5 py-1 text-xs font-semibold text-center leading-tight";
  if (result.match)
    return (
      <div className={`${base} bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/60`}>
        {children}
      </div>
    );
  return (
    <div className={`${base} bg-red-500/15 text-red-400 ring-1 ring-red-500/40`}>
      {children}
      {"hint" in result && result.hint === "higher" && <span className="ml-0.5">↑</span>}
      {"hint" in result && result.hint === "lower" && <span className="ml-0.5">↓</span>}
    </div>
  );
}

// ── Hint column config ──────────────────────────────────────────────
type HintCol = {
  key: keyof Omit<GuessRow, "qb" | "correct">;
  label: string;
  value: (row: GuessRow) => string;
  answerValue: (qb: QBInfo) => string;
};

const HINT_COLS: HintCol[] = [
  {
    key: "team",
    label: "Team",
    value: (r) => r.qb.teamAbbr,
    answerValue: (qb) => qb.teamAbbr,
  },
  {
    key: "conf",
    label: "Conf",
    value: (r) => r.qb.conference,
    answerValue: (qb) => qb.conference,
  },
  {
    key: "div",
    label: "Division",
    value: (r) => r.qb.division.replace(" ", " "),
    answerValue: (qb) => qb.division.replace(" ", " "),
  },
  {
    key: "height",
    label: "Height",
    value: (r) => fmtHeight(r.qb.heightIn),
    answerValue: (qb) => fmtHeight(qb.heightIn),
  },
  {
    key: "age",
    label: "Age",
    value: (r) => String(r.qb.age),
    answerValue: (qb) => String(qb.age),
  },
  {
    key: "jersey",
    label: "Jersey #",
    value: (r) => String(r.qb.jersey),
    answerValue: (qb) => String(qb.jersey),
  },
  {
    key: "exp",
    label: "Exp (yrs)",
    value: (r) => String(r.qb.yearsExp),
    answerValue: (qb) => String(qb.yearsExp),
  },
];

// ── Guess table ────────────────────────────────────────────────────
function GuessTable({ rows, revealedCols }: { rows: GuessRow[]; revealedCols: number }) {
  const cols = HINT_COLS.slice(0, revealedCols);
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-2 py-2 text-center font-display tracking-wider text-muted-foreground uppercase text-[10px]">
              QB
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2 py-2 text-center font-display tracking-wider text-muted-foreground uppercase text-[10px]"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0">
              <td className="px-2 py-2 text-center font-medium text-foreground whitespace-nowrap">
                {row.qb.name}
              </td>
              {cols.map((c) => (
                <td key={c.key} className="px-1.5 py-2">
                  <Cell result={row[c.key] as CellResult}>{c.value(row)}</Cell>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Hint reveal strip ──────────────────────────────────────────────
function HintStrip({
  answer,
  revealedCols,
  done,
}: {
  answer: QBInfo;
  revealedCols: number;
  done: boolean;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {HINT_COLS.map((col, i) => {
        const revealed = done || i < revealedCols;
        return (
          <div
            key={col.key}
            className={`flex-1 min-w-[5rem] rounded-lg border px-3 py-2.5 text-center transition ${
              revealed
                ? "border-border/60 bg-card"
                : "border-border/40 bg-card/50 opacity-50"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
              {col.label}
            </p>
            {revealed ? (
              <p className="text-sm font-semibold text-foreground">{col.answerValue(answer)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">?</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Autocomplete input ─────────────────────────────────────────────
function QBSearch({
  pool,
  onGuess,
  disabled,
  usedIds,
}: {
  pool: Array<{ id: string; name: string }>;
  onGuess: (id: string) => void;
  disabled: boolean;
  usedIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matches =
    query.length >= 2
      ? pool
          .filter(
            (p) =>
              !usedIds.has(p.id) && p.name.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(p: { id: string; name: string }) {
    onGuess(p.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) select(matches[0]);
        }}
        placeholder="Search for a quarterback…"
        disabled={disabled}
        className="w-full rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border/60 bg-card shadow-xl">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 text-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(p);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Timer ──────────────────────────────────────────────────────────
function Timer({ running, onTick }: { running: boolean; onTick?: (s: number) => void }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    setSecs(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs((s) => {
        const next = s + 1;
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onTick]);

  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return (
    <div className="font-display text-sm tracking-widest text-muted-foreground tabular-nums">
      {m}:{s}
    </div>
  );
}

// ── Round progress dots ────────────────────────────────────────────
function RoundProgress({
  results,
  total,
  current,
}: {
  results: RoundResult[];
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const res = results[i];
        const isCurrent = i === current;
        if (res) {
          return (
            <div
              key={i}
              title={res.qbName}
              className={`h-2.5 w-2.5 rounded-full transition-all ${res.correct ? "bg-emerald-500" : "bg-red-500"}`}
            />
          );
        }
        return (
          <div
            key={i}
            className={`rounded-full transition-all ${
              isCurrent
                ? "h-2.5 w-2.5 bg-primary ring-2 ring-primary/40"
                : "h-2 w-2 bg-border"
            }`}
          />
        );
      })}
    </div>
  );
}

// ── Setup screen ───────────────────────────────────────────────────
function SetupScreen({
  onStart,
}: {
  onStart: (rounds: number, diff: Difficulty, pos: Position) => void;
}) {
  const [rounds, setRounds] = useState<number>(5);
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [pos, setPos] = useState<Position>("QB");
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const positions: { value: Position; label: string; desc: string }[] = [
    { value: "QB", label: "QB", desc: "Quarterback throwing clips" },
    { value: "RB", label: "RB", desc: "Running back rushing clips" },
    { value: "WR", label: "WR", desc: "Wide receiver catch clips" },
  ];

  return (
    <div className="grid place-items-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-10 text-center">

        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-2xl tracking-wider text-foreground">Position</h2>
          <div className="flex gap-3">
            {positions.map((p) => (
              <button
                key={p.value}
                onClick={() => setPos(p.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-8 py-5 transition ${
                  pos === p.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span className="font-display text-lg tracking-wider">{p.label}</span>
                <span className="text-[10px] leading-snug max-w-[9rem]">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-2xl tracking-wider text-foreground">Difficulty</h2>
          <div className="flex gap-3">
            {difficulties.map((d) => {
              const cfg = DIFFICULTY_CONFIG[d];
              const active = diff === d;
              return (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-8 py-5 transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="font-display text-lg tracking-wider">{cfg.label}</span>
                  <span className="text-[10px] leading-snug max-w-[9rem]">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-2xl tracking-wider text-foreground">Players per game</h2>
          <div className="flex gap-4">
            {[5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setRounds(n)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-10 py-6 transition ${
                  rounds === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span className="font-display text-4xl tracking-wider">{n}</span>
                <span className="text-xs uppercase tracking-[0.15em]">players</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(rounds, diff, pos)}
          className="rounded-xl bg-primary px-16 py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 transition"
        >
          START
        </button>
      </div>
    </div>
  );
}

// ── Results screen ─────────────────────────────────────────────────
function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ResultsScreen({
  results,
  difficulty,
  onPlayAgain,
}: {
  results: RoundResult[];
  difficulty: Difficulty;
  onPlayAgain: () => void;
}) {
  const correct = results.filter((r) => r.correct);
  const accuracy = Math.round((correct.length / results.length) * 100);
  const avgTime = Math.round(results.reduce((a, r) => a + r.seconds, 0) / results.length);
  const avgGuesses = (results.reduce((a, r) => a + r.guesses, 0) / results.length).toFixed(1);

  const hardest = [...results].sort((a, b) => b.guesses - a.guesses)[0];
  const easiest = correct.length
    ? [...correct].sort((a, b) => a.guesses - b.guesses)[0]
    : null;

  const shareText = [
    `QB Silhouette — ${results.length}-QB game (${DIFFICULTY_CONFIG[difficulty].label})`,
    ``,
    `Accuracy: ${accuracy}% (${correct.length}/${results.length})`,
    `Avg time: ${fmtTime(avgTime)}`,
    `Avg guesses: ${avgGuesses}`,
    easiest ? `Easiest: ${easiest.qbName}` : null,
    `Hardest: ${hardest.qbName}`,
    ``,
    `Play at qbsilhouette.com`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  function copyShare() {
    navigator.clipboard.writeText(shareText).catch(() => {});
  }

  const statTile = (label: string, value: string) => (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-card px-6 py-4">
      <span className="font-display text-2xl tracking-wider text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-8 py-4">
      <div className="text-center">
        <h2 className="font-display text-3xl tracking-wider text-foreground">Game Over</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {results.length} QBs · {correct.length} correct
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statTile("Accuracy", `${accuracy}%`)}
        {statTile("Avg Time", fmtTime(avgTime))}
        {statTile("Avg Guesses", avgGuesses)}
      </div>

      {(easiest || hardest) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {easiest && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-1">
                Easiest
              </p>
              <p className="font-display text-lg tracking-wide text-foreground">
                {easiest.qbName}
              </p>
              <p className="text-xs text-muted-foreground">
                {easiest.guesses} guess{easiest.guesses !== 1 ? "es" : ""} ·{" "}
                {fmtTime(easiest.seconds)}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-red-400 mb-1">Hardest</p>
            <p className="font-display text-lg tracking-wide text-foreground">
              {hardest.qbName}
            </p>
            <p className="text-xs text-muted-foreground">
              {hardest.guesses} guess{hardest.guesses !== 1 ? "es" : ""} ·{" "}
              {fmtTime(hardest.seconds)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60">
              {["QB", "Result", "Guesses", "Time"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="px-3 py-2 font-medium text-foreground text-center whitespace-nowrap">
                  {r.qbName}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.correct ? (
                    <span className="text-emerald-400 font-semibold">✓</span>
                  ) : (
                    <span className="text-red-400 font-semibold">✗</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-muted-foreground">{r.guesses}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">
                  {fmtTime(r.seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyShare}
          className="flex-1 rounded-lg border border-border/60 px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
        >
          Copy results
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-display tracking-wider text-primary-foreground hover:bg-primary/90 transition"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

// ── Main Game ──────────────────────────────────────────────────────
function Game() {
  const [phase, setPhase] = useState<"setup" | "playing" | "results">("setup");
  const [roundsTarget, setRoundsTarget] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [position, setPosition] = useState<Position>("QB");

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [won, setWon] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [clipUrl, setClipUrl] = useState<string>("");
  const [usedSlugs, setUsedSlugs] = useState<string[]>([]);
  const [clipLoading, setClipLoading] = useState(false);

  // How many hint columns are visible (grows by 1 per wrong guess)
  const [revealedCols, setRevealedCols] = useState(0);

  const [results, setResults] = useState<RoundResult[]>([]);
  const roundsCompletedRef = useRef(0);
  const roundKeyRef = useRef(0);
  const timerSecsRef = useRef(0);
  const prefetchedRound = useRef<RandomClipResponse | null>(null);

  const diffCfg = DIFFICULTY_CONFIG[difficulty];
  const maxGuessesHit = diffCfg.maxGuesses !== null && guesses.length >= diffCfg.maxGuesses;
  const done = won || gaveUp || maxGuessesHit;

  const loadNextRound = useCallback(
    async (overrideDiff?: Difficulty, overridePos?: Position) => {
      setLoading(true);
      setLoadError(null);
      setGuesses([]);
      setWon(false);
      setGaveUp(false);
      setRevealedCols(0);
      timerSecsRef.current = 0;

      try {
        const cached = prefetchedRound.current;
        prefetchedRound.current = null;
        const data = cached ?? await fetchRound(overrideDiff ?? difficulty, overridePos ?? position);
        roundKeyRef.current += 1;
        setRound({ ...data, key: roundKeyRef.current });
        setClipUrl(data.clipUrl);
        setUsedSlugs([]);
        // prefetch next round in background
        fetchRound(overrideDiff ?? difficulty, overridePos ?? position)
          .then((d) => { prefetchedRound.current = d; })
          .catch(() => {});
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [difficulty, position],
  );

  function startGame(rounds: number, diff: Difficulty, pos: Position) {
    setRoundsTarget(rounds);
    setDifficulty(diff);
    setPosition(pos);
    setScore(0);
    setStreak(0);
    setResults([]);
    roundsCompletedRef.current = 0;
    prefetchedRound.current = null;
    setPhase("playing");
    loadNextRound(diff, pos);
  }

  function recordResult(correct: boolean, guessCount: number) {
    if (!round) return;
    const result: RoundResult = {
      qbName: round.answer.name,
      correct,
      guesses: guessCount,
      seconds: timerSecsRef.current,
    };
    const next = [...results, result];
    setResults(next);
    roundsCompletedRef.current += 1;
    if (roundsCompletedRef.current >= roundsTarget) {
      setTimeout(() => setPhase("results"), 1200);
    }
  }

  // Build set of already-guessed QB ids for filtering autocomplete
  const usedIds = new Set(guesses.map((g) => g.qb.id));

  function handleGuess(qbId: string) {
    if (!round || done || guessing) return;
    const fullQB = round?.playerPool?.find((q: { id: string; name: string }) => q.id === qbId) ?? { id: qbId, name: qbId };
    if (!fullQB) return;
    processGuess(fullQB);
  }

  function processGuess(guessQB: QBInfo) {
    if (!round || done) return;
    setGuessing(true);

    const row = buildRow(guessQB, round.answer);
    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);

    // Reveal next hint column on wrong guess
    if (!row.correct) {
      setRevealedCols((c) => Math.min(c + 1, HINT_COLS.length));
    }

    if (row.correct) {
      const earned = Math.max(50, 500 - guesses.length * 75);
      setScore((s) => s + earned);
      setStreak((s) => s + 1);
      setWon(true);
      recordResult(true, newGuesses.length);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#22c55e", "#ffffff", "#f59e0b"],
      });
    } else if (diffCfg.maxGuesses !== null && newGuesses.length >= diffCfg.maxGuesses) {
      setStreak(0);
      recordResult(false, newGuesses.length);
    }

    setGuessing(false);
  }

  function handleGiveUp() {
    setStreak(0);
    setGaveUp(true);
    setRevealedCols(HINT_COLS.length);
    recordResult(false, guesses.length);
  }

  async function handleNewClip() {
    if (!round || done || clipLoading) return;
    setClipLoading(true);
    try {
      const params = new URLSearchParams({
        qbId: round.answer.id,
        used: usedSlugs.join(","),
        position: round.answer.position,
      });
      const res = await fetch(`/api/public/next-clip?${params}`);
      const data = await res.json();
      if (data.clipUrl) {
        setClipUrl(data.clipUrl);
        if (data.slug) setUsedSlugs((prev) => [...prev, data.slug]);
        roundKeyRef.current += 1;
        setRound((r) => r ? { ...r, key: roundKeyRef.current } : r);
      }
    } catch {
      // silently fail — old clip keeps playing
    } finally {
      setClipLoading(false);
    }
  }

  const roundLabel = round ? `${roundsCompletedRef.current + 1} / ${roundsTarget}` : "";

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader score={score} streak={streak} />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <SetupScreen onStart={(r, d, p) => startGame(r, d, p)} />
        </main>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader score={score} streak={streak} />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <ResultsScreen
            results={results}
            difficulty={difficulty}
            onPlayAgain={() => setPhase("setup")}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader score={score} streak={streak} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && !round && (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            Fetching a live NFL clip… (this may take ~15s the first time)
          </div>
        )}

        {loadError && (
          <div className="grid h-64 place-items-center gap-4 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <button
              onClick={() => loadNextRound()}
              className="rounded-md bg-primary px-4 py-2 font-display tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              RETRY
            </button>
          </div>
        )}

        {round && (
          <div className="flex flex-col gap-6">
            <RoundProgress
              results={results}
              total={roundsTarget}
              current={roundsCompletedRef.current}
            />

            {/* Video */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="relative">
                <SilhouetteVideo
                  key={round.key}
                  src={clipUrl || round.clipUrl}
                  startTime={round.answer.position === "WR" ? 2 : 0}
                  endTime={round.answer.position === "WR" ? 12 : 10}
                />
                <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {diffCfg.label} mode
                </div>
              </div>
            </div>

            {/* Game panel */}
            <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
              {/* Timer + guess count + round */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {guesses.length}
                  {diffCfg.maxGuesses ? `/${diffCfg.maxGuesses}` : ""} guess
                  {guesses.length !== 1 ? "es" : ""} · Round {roundLabel}
                </span>
                <Timer
                  key={round.key}
                  running={!done}
                  onTick={(s) => {
                    timerSecsRef.current = s;
                  }}
                />
              </div>

              {/* Hint strip — reveals one column per wrong guess */}
              <HintStrip answer={round.answer} revealedCols={revealedCols} done={done} />

              {/* Search input */}
              {!done && (
                <QBSearch
                  pool={round.playerPool}
                  onGuess={handleGuess}
                  disabled={guessing}
                  usedIds={usedIds}
                />
              )}

              {/* Result banner */}
              {won && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-center">
                  <p className="font-display text-2xl tracking-wider text-emerald-400">
                    CORRECT!
                  </p>
                  <p className="mt-1 font-semibold text-foreground">{round.answer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {round.answer.team} · #{round.answer.jersey}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fmtHeight(round.answer.heightIn)} · {round.answer.yearsExp} yrs exp
                  </p>
                </div>
              )}
              {(gaveUp || maxGuessesHit) && !won && (
                <div className="rounded-lg border border-border/60 bg-card px-4 py-4 text-center">
                  {maxGuessesHit && (
                    <p className="font-display text-sm tracking-wider text-red-400">
                      Out of guesses
                    </p>
                  )}
                  <p className="mt-1 font-display text-lg tracking-wider text-muted-foreground">
                    The answer was
                  </p>
                  <p className="font-display text-xl tracking-wider text-foreground">
                    {round.answer.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {round.answer.team} · #{round.answer.jersey}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fmtHeight(round.answer.heightIn)} · {round.answer.yearsExp} yrs exp
                  </p>
                </div>
              )}

              {/* Guess history */}
              {guesses.length > 0 && (
                <GuessTable rows={[...guesses].reverse()} revealedCols={revealedCols} />
              )}

              {/* Controls */}
              <div className="flex gap-3">
                {!done && (
                  <>
                    <button
                      onClick={handleNewClip}
                      disabled={clipLoading}
                      className="rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50 transition"
                    >
                      {clipLoading ? "Loading…" : "New clip ↺"}
                    </button>
                    <button
                      onClick={handleGiveUp}
                      className="flex-1 rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
                    >
                      Give up
                    </button>
                  </>
                )}
                {done && roundsCompletedRef.current < roundsTarget && (
                  <button
                    onClick={() => loadNextRound()}
                    disabled={loading}
                    className="flex-1 rounded-md bg-primary px-3 py-2 font-display tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                  >
                    {loading ? "Loading…" : "NEXT QB →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AppHeader({ score, streak }: { score: number; streak: number }) {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-foreground">
            QB <span className="text-primary">SILHOUETTE</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Guess the player from their on-field motion
          </p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <Stat label="Score" value={score} />
          <Stat label="Streak" value={streak} accent />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div
        className={`font-display text-2xl tracking-wider ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
