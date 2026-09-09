import { LEVELS, type LevelDef } from "../game/levels";
import { cn } from "../utils/cn";
import { GameButton } from "./ui";

export type PlayPhase = "question" | "correct" | "wrong" | "learn" | "cleared" | "treasure" | "final";

const LETTERS = ["A", "B", "C", "D"];

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1.5" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" />
    </svg>
  );
}

export function HUD({
  levelIdx,
  score,
  badges,
  time,
  muted,
  onPause,
  onMute,
}: {
  levelIdx: number;
  score: number;
  badges: number;
  time: string;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
}) {
  const level = LEVELS[levelIdx];

  return (
    <header className="adventure-hud pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="level-sign pointer-events-auto">
        <div className="map-pin" aria-hidden="true">●</div>
        <div className="min-w-0 flex-1">
          <div className="level-sign-title">Tantangan {levelIdx + 1}</div>
          <div className="level-sign-subtitle">{level.name}</div>
        </div>
      </div>

      <div className="energy-plaque pointer-events-auto">
        <div className="energy-star" aria-hidden="true">★</div>
        <div>
          <div className="energy-title">Energi Petualangan</div>
          <div className="flex items-center gap-1">
            <div className="energy-hearts" aria-label="Energi 5 dari 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>♥</span>
              ))}
            </div>
            <span className="score-chip">{score} ★</span>
          </div>
        </div>
      </div>

      <div className="objective-plaque pointer-events-auto">
        <span className="objective-chest" aria-hidden="true">🧰</span>
        <div className="min-w-0">
          <div className="objective-label">Tujuan:</div>
          <div className="objective-text">Temukan harta karun!</div>
          <div className="objective-meta">🏅 {badges} &nbsp;·&nbsp; ⏱ {time}</div>
        </div>
      </div>

      <button
        onClick={onMute}
        aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
        className="sound-medallion pointer-events-auto"
      >
        {muted ? "×" : "♪"}
      </button>
      <button onClick={onPause} aria-label="Jeda" className="pause-medallion pointer-events-auto">
        <PauseIcon />
      </button>
    </header>
  );
}

export function LevelBanner({ levelIdx }: { levelIdx: number }) {
  const level = LEVELS[levelIdx];
  return (
    <div className="level-reveal pointer-events-none absolute z-30">
      <div className="anim-banner text-center">
        <div className="level-reveal-icon">{level.emoji}</div>
        <div className="level-reveal-kicker">TANTANGAN {level.id}</div>
        <div className="level-reveal-name">{level.name.toUpperCase()}</div>
      </div>
    </div>
  );
}

export function QuestionPanel({
  level,
  levelIdx,
  phase,
  selected,
  onAnswer,
  onOpenLearn,
  onNext,
  ref,
}: {
  level: LevelDef;
  levelIdx: number;
  phase: PlayPhase;
  selected: number | null;
  onAnswer: (i: number) => void;
  onOpenLearn: () => void;
  onNext: () => void;
  ref?: (el: HTMLDivElement | null) => void;
}) {
  const answered = phase !== "question";
  const lastLevel = levelIdx === LEVELS.length - 1;

  return (
    <div ref={ref} className="question-shell absolute z-30">
      <div className="question-panel anim-slide">
        <div className="question-scenario">
          <span>{level.emoji}</span>
          <span>{level.scenario}</span>
        </div>

        <div className="question-prompt">
          <div className="question-prompt-label">PILIH JAWABAN YANG TEPAT</div>
          <h2>{level.question}</h2>
        </div>

        <div className="answers-list">
          {level.options.map((option, i) => {
            const isCorrect = i === level.correct;
            const isChosenWrong = answered && selected === i && !isCorrect;
            const revealCorrect = answered && isCorrect;

            return (
              <button
                key={option}
                onClick={(event) => {
                  event.currentTarget.blur();
                  onAnswer(i);
                }}
                disabled={answered}
                className={cn(
                  "answer-button",
                  !answered && "answer-idle",
                  revealCorrect && "answer-correct anim-pop",
                  isChosenWrong && "answer-wrong anim-shake",
                  answered && !revealCorrect && !isChosenWrong && "answer-muted"
                )}
              >
                <span className="answer-letter">{LETTERS[i]}</span>
                <span className="answer-text">{option}</span>
                {revealCorrect && <span className="answer-mark">✓</span>}
                {isChosenWrong && <span className="answer-mark">×</span>}
              </button>
            );
          })}
        </div>

        <div className="question-feedback">
          {phase === "question" && (
            <p className="answer-hint">
              Ketuk pilihanmu atau tekan <kbd>1</kbd>–<kbd>4</kbd>
            </p>
          )}
          {phase === "correct" && (
            <div className="anim-pop feedback-success">
              <strong>Hebat! Jawabanmu benar.</strong>
              <span>{level.successText}</span>
              <small className="anim-dots">Karakter sedang melewati rintangan...</small>
            </div>
          )}
          {phase === "cleared" && (
            <div className="anim-pop feedback-cleared">
              <div>
                <strong>Rintangan berhasil dilewati!</strong>
                <span>Badge {level.badge.icon} {level.badge.name} didapat.</span>
              </div>
              <GameButton variant="gold" onClick={onNext} className="next-level-button anim-glow">
                {lastLevel ? "Buka Harta" : "Lanjut"} →
              </GameButton>
            </div>
          )}
          {phase === "wrong" && (
            <div className="anim-pop feedback-wrong">
              <div>
                <strong>Rintangan belum teratasi</strong>
                <span>Tidak apa-apa. Setiap kesalahan adalah kesempatan untuk belajar.</span>
              </div>
              <GameButton variant="red" onClick={onOpenLearn} className="learn-button">
                📖 Misi Belajar
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}