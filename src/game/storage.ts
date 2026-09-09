const HS_KEY = "mh_highscore_v1";
const BG_KEY = "mh_badges_v1";
const MU_KEY = "mh_muted_v1";

export interface ScoreEntry {
  score: number;
  stars: number;
  mistakes: number;
  time: number; // seconds
  date: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadHighScores(): ScoreEntry[] {
  return read<ScoreEntry[]>(HS_KEY, []).filter(
    (e) => typeof e.score === "number"
  );
}

/** Returns 1-based rank of the entry (best first), or -1 if not in top 5. */
export function saveHighScore(entry: ScoreEntry): { rank: number; isBest: boolean } {
  const list = loadHighScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score || a.time - b.time);
  const top = list.slice(0, 5);
  write(HS_KEY, top);
  const rank = top.indexOf(entry) + 1;
  return { rank, isBest: rank === 1 };
}

export function loadUnlockedBadges(): string[] {
  return read<string[]>(BG_KEY, []);
}

export function unlockBadges(ids: string[]): string[] {
  const set = new Set(loadUnlockedBadges());
  ids.forEach((id) => set.add(id));
  const all = [...set];
  write(BG_KEY, all);
  return all;
}

export function loadMuted(): boolean {
  return read<boolean>(MU_KEY, false);
}
export function saveMuted(m: boolean) {
  write(MU_KEY, m);
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
