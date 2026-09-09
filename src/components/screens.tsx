import { ALL_BADGES, GOALS, TOPICS, type Lesson } from "../game/levels";
import { formatTime, type ScoreEntry } from "../game/storage";
import { cn } from "../utils/cn";
import { GameButton, PlayIcon, ScreenShell, StarRating } from "./ui";

// ---------------- MENU ----------------

export function MenuScreen({
  onStart,
  onNav,
  best,
}: {
  onStart: () => void;
  onNav: (s: "materi" | "badges" | "scores" | "tips") => void;
  best: ScoreEntry | null;
}) {
  return (
    <div className="menu-screen absolute inset-0 z-40 overflow-y-auto no-scrollbar">
      <div className="min-h-full flex flex-col items-center justify-center gap-3 md:gap-4 px-4 py-8">
        <div className="anim-slide">
          <span className="menu-kicker inline-block px-4 py-1 text-[10px] md:text-xs font-black tracking-[0.2em]">
            🎒 IPA · KELAS 4 · GAYA
          </span>
        </div>
        <div className="menu-title-board anim-pop">
          <h1 className="font-display text-[10.5vw] md:text-[76px] leading-[0.95] text-center text-[#fff8e7]">
            MISI HARTA KARUN
          </h1>
          <div className="menu-title-ribbon anim-floaty">
            <div className="font-display text-[5.5vw] md:text-[34px] text-center tracking-wider">
              PETUALANGAN GAYA
            </div>
          </div>
        </div>
        <p className="menu-tagline text-center text-sm md:text-base font-extrabold max-w-md">
          Gunakan pengetahuan tentang gaya untuk melewati setiap rintangan!
        </p>
        <GameButton variant="gold" big onClick={onStart} className="anim-glow mt-1 w-full max-w-xs">
          <PlayIcon /> Mulai Petualangan
        </GameButton>
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-1">
          <GameButton onClick={() => onNav("materi")}>📚 Materi</GameButton>
          <GameButton onClick={() => onNav("badges")}>🏅 Badge</GameButton>
          <GameButton onClick={() => onNav("scores")}>📊 Nilai</GameButton>
          <GameButton onClick={() => onNav("tips")}>ℹ️ Petunjuk</GameButton>
        </div>
        {best && (
          <span className="menu-best rounded-full px-4 py-1 text-xs font-extrabold">
            🏆 Rekor terbaik: {best.score} ⭐
          </span>
        )}
        <p className="menu-controls text-[10px] md:text-[11px] font-bold text-center">
          Keyboard: <b>1–4</b> jawab · <b>Enter</b> lanjut · <b>P</b> jeda
        </p>
      </div>
    </div>
  );
}

// ---------------- MATERI ----------------

export function MateriScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell title="PELAJARI MATERI" onBack={onBack}>
      <p className="text-sm font-bold text-white/70 mb-3">
        Semua gaya yang akan kamu temui dalam petualangan:
      </p>
      <div className="space-y-3 pb-6">
        {TOPICS.map((t) => (
          <div key={t.title} className="rounded-2xl border-2 border-[#2c5c46] bg-[#0b2018] p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-[#16382a] border border-[#3ddc84]/30 text-xl">
                {t.icon}
              </span>
              <h3 className="font-display text-lg md:text-xl text-[#ffd23e] tracking-wide">{t.title.toUpperCase()}</h3>
            </div>
            <p className="text-sm font-semibold text-white/80 mt-2 leading-relaxed">{t.body}</p>
            <p className="text-xs font-bold text-white/50 mt-2">
              Contoh: <span className="text-[#8fe6b8]">{t.examples.join(" · ")}</span>
            </p>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

// ---------------- BADGES ----------------

export function BadgesScreen({ unlocked, onBack }: { unlocked: string[]; onBack: () => void }) {
  return (
    <ScreenShell title="KOLEKSI BADGE" onBack={onBack}>
      <p className="text-sm font-bold text-white/70 mb-3">
        {unlocked.length}/{ALL_BADGES.length} badge terkumpul
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-6">
        {ALL_BADGES.map((b) => {
          const got = unlocked.includes(b.id);
          return (
            <div
              key={b.id}
              className={cn(
                "rounded-2xl border-2 p-3 text-center transition-all",
                got
                  ? "border-[#ffd23e]/60 bg-[#2a2109] shadow-[0_0_18px_rgba(255,210,62,0.15)]"
                  : "border-white/10 bg-[#0b2018] opacity-50"
              )}
            >
              <div className={cn("text-3xl md:text-4xl", got ? "anim-floaty" : "grayscale")}>
                {got ? b.icon : "🔒"}
              </div>
              <div className={cn("font-display text-xs md:text-sm mt-1.5 tracking-wide", got ? "text-[#ffd23e]" : "text-white/60")}>
                {got ? b.name.toUpperCase() : "RAHASIA"}
              </div>
              <div className="text-[10px] md:text-[11px] font-bold text-white/50 mt-0.5 leading-snug">
                {got ? b.desc : b.level === 9 ? "Selesaikan seluruh petualangan!" : `Selesaikan tantangan ${b.level}`}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

// ---------------- SCORES ----------------

export function ScoresScreen({ scores, onBack }: { scores: ScoreEntry[]; onBack: () => void }) {
  return (
    <ScreenShell title="NILAI SAYA" onBack={onBack}>
      <p className="text-sm font-bold text-white/70 mb-3">5 nilai terbaik petualanganmu:</p>
      {scores.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/15 p-8 text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="font-bold text-white/60">Belum ada nilai. Selesaikan petualanganmu pertama!</p>
        </div>
      ) : (
        <div className="space-y-2 pb-6">
          {scores.map((s, i) => (
            <div
              key={s.date + "-" + i}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 px-4 py-3",
                i === 0 ? "border-[#ffd23e]/60 bg-[#2a2109]" : "border-[#2c5c46] bg-[#0b2018]"
              )}
            >
              <span className={cn("font-display text-2xl w-9 text-center", i === 0 ? "text-[#ffd23e]" : "text-white/40")}>
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-black text-lg text-[#ffd23e]">{s.score} ⭐</div>
                <div className="text-[11px] font-bold text-white/50">
                  {new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                  {s.mistakes === 0 ? "tanpa kesalahan" : `${s.mistakes} kesalahan`}
                </div>
              </div>
              <StarRating stars={s.stars} size="text-xl" />
              <span className="text-sm font-black text-white/70 w-12 text-right">⏱ {formatTime(s.time)}</span>
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  );
}

// ---------------- TIPS ----------------

export function TipsScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell title="PETUNJUK" onBack={onBack}>
      <div className="space-y-3 pb-6">
        <div className="rounded-2xl border-2 border-[#2c5c46] bg-[#0b2018] p-4">
          <h3 className="font-display text-lg text-[#ffd23e] tracking-wide">CARA MAIN</h3>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-white/80">
            <li>🎯 Baca situasi rintangan, pilih gaya yang tepat (4 pilihan).</li>
            <li>✅ Benar: karakter melewati rintangan dan mendapat ⭐ + badge.</li>
            <li>❌ Salah: buka <b className="text-[#ffb35c]">Misi Belajar</b>, baca materinya, lalu coba lagi. Salah bukan game over!</li>
            <li>🏆 Lalui 8 tantangan untuk menemukan harta karun sejati.</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-[#2c5c46] bg-[#0b2018] p-4">
          <h3 className="font-display text-lg text-[#ffd23e] tracking-wide">KONTROL</h3>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-white/80">
            <li>
              🖱️ Ketuk / klik pilihan jawaban <b className="text-white">A B C D</b>
            </li>
            <li>
              ⌨️ Tekan <Kbd>1</Kbd>–<Kbd>4</Kbd> untuk menjawab, <Kbd>Enter</Kbd> untuk melanjutkan
            </li>
            <li>
              ⏸️ Tekan <Kbd>P</Kbd> atau <Kbd>Esc</Kbd> untuk jeda
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-[#2c5c46] bg-[#0b2018] p-4">
          <h3 className="font-display text-lg text-[#ffd23e] tracking-wide">TUJUAN PEMBELAJARAN</h3>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-white/80 list-disc list-inside marker:text-[#3ddc84]">
            {GOALS.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded bg-white/10 border border-white/25 px-1.5 py-0.5 text-[11px] font-black">{children}</kbd>
  );
}

// ---------------- LEARN MISSION ----------------

export function LearnModal({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-3">
      <div className="learning-scroll anim-pop w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="learning-scroll-header sticky top-0 px-4 pt-3 pb-2">
          <span className="text-[10px] font-black tracking-[0.25em] text-[#7b381d]">📖 MISI BELAJAR</span>
          <h3 className="font-display text-2xl text-[#713418] mt-0.5 flex items-center gap-2">
            <span className="anim-wiggle inline-block">{lesson.icon}</span> {lesson.title}
          </h3>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-sm font-bold text-[#4d301d] leading-relaxed">{lesson.body}</p>
          <div className="mt-3 rounded-xl bg-[#fff8e2]/70 border-2 border-[#c68b4e] p-3">
            <p className="text-[11px] font-black tracking-widest text-[#713418]">CONTOH DALAM KEHIDUPAN</p>
            <ul className="mt-1.5 space-y-1 text-[13px] font-bold text-[#5a3a24] list-disc list-inside marker:text-[#bd5b26]">
              {lesson.examples.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-xl bg-[#ffd466]/35 border-2 border-[#c9852c] p-3 flex gap-2.5">
            <span className="text-lg">💡</span>
            <p className="text-[13px] font-extrabold text-[#5b351d] leading-snug">
              <span className="text-[#a74c1d] tracking-wider">INGAT! </span>
              {lesson.tip}
            </p>
          </div>
          <GameButton variant="gold" onClick={onDone} className="w-full mt-4 anim-glow">
            ✅ Saya Sudah Membaca — Coba Lagi
          </GameButton>
        </div>
      </div>
    </div>
  );
}

// ---------------- PAUSE ----------------

export function PauseOverlay({
  onResume,
  onRestart,
  onMenu,
  muted,
  onMute,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="pause-board anim-pop w-full max-w-xs p-5 text-center">
        <div className="font-display text-4xl text-[#fff5d7] title-outline">JEDA</div>
        <p className="text-xs font-bold text-[#ffe0a5] mt-1">Petualangan ditahan sejenak</p>
        <div className="mt-4 space-y-2">
          <GameButton variant="gold" onClick={onResume} className="w-full">
            <PlayIcon /> Lanjutkan
          </GameButton>
          <GameButton onClick={onRestart} className="w-full">
            🔄 Ulangi dari Awal
          </GameButton>
          <GameButton onClick={onMenu} className="w-full">
            🏠 Ke Menu
          </GameButton>
          <GameButton onClick={onMute} className="w-full">
            {muted ? "🔇 Suara: Mati" : "🔊 Suara: Nyala"}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

// ---------------- RESULT / TREASURE ----------------

export const FINAL_MESSAGES = [
  "Untuk meraih cita-cita, kita harus belajar, berdoa, dan berusaha dengan sungguh-sungguh.",
  "Seperti kamu melewati setiap rintangan dalam perjalanan ini, jangan menyerah ketika menghadapi kesulitan dalam kehidupan. Teruslah belajar, berdoa, dan berusaha.",
];

export function ResultModal({
  total,
  bonus,
  mistakes,
  stars,
  time,
  isNewBest,
  newBadges,
  onMenu,
  onRestart,
  onMateri,
}: {
  total: number;
  bonus: number;
  mistakes: number;
  stars: number;
  time: number;
  isNewBest: boolean;
  newBadges: { icon: string; name: string }[];
  onMenu: () => void;
  onRestart: () => void;
  onMateri: () => void;
}) {
  return (
    <div className="result-overlay absolute inset-0 z-50 p-3">
      <div className="treasure-result anim-pop w-full max-w-md max-h-[94vh] overflow-y-auto no-scrollbar">
        <div className="text-center px-5 pt-5">
          <div className="text-4xl anim-floaty inline-block">✨</div>
          <h2 className="font-display text-3xl md:text-4xl text-[#ffd23e] title-outline leading-none mt-1">
            HARTA KARUN DITEMUKAN!
          </h2>
          <p className="text-[11px] font-black tracking-[0.22em] text-[#8fe6b8] mt-1.5">
            🏆 HARTA KARUN SEJATI
          </p>
          {isNewBest && (
            <span className="inline-block mt-2 rounded-full bg-[#ffd23e] text-[#4a2b00] px-3 py-0.5 text-[11px] font-black anim-glow">
              🎉 REKOR BARU!
            </span>
          )}
        </div>
        <div className="px-5 mt-3">
          <div className="rounded-xl bg-[#fff6e0] text-[#3a2b0d] p-4 border-2 border-[#c9a25e] shadow-inner">
            {FINAL_MESSAGES.map((m) => (
              <p key={m} className="text-[13px] font-bold italic leading-relaxed mb-2 last:mb-0">
                “{m}”
              </p>
            ))}
          </div>
        </div>
        <div className="px-5 mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="ENERGI" value={`${total} ⭐`} />
          <Stat label="WAKTU" value={formatTime(time)} />
          <Stat label="BELAJAR" value={`${mistakes}×`} />
        </div>
        <div className="text-center mt-2.5">
          <StarRating stars={stars} />
          {bonus > 0 && (
            <p className="text-[11px] font-black text-[#5cffab] mt-1">
              Bonus tanpa kesalahan +{bonus} ⭐
            </p>
          )}
        </div>
        {newBadges.length > 0 && (
          <div className="px-5 mt-3">
            <p className="text-[10px] font-black tracking-[0.22em] text-[#8fe6b8]">BADGE BARU</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {newBadges.map((b) => (
                <span
                  key={b.name}
                  className="anim-pop rounded-full border border-[#ffd23e]/50 bg-[#ffd23e]/10 px-2.5 py-1 text-[11px] font-extrabold text-[#ffe9b3]"
                >
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="px-5 py-5 grid grid-cols-1 gap-2">
          <GameButton variant="gold" big onClick={onRestart}>
            🔄 Main Lagi
          </GameButton>
          <div className="grid grid-cols-2 gap-2">
            <GameButton onClick={onMenu}>🏠 Menu</GameButton>
            <GameButton onClick={onMateri}>📚 Materi</GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/30 py-2 px-1">
      <div className="text-[9px] font-black tracking-[0.18em] text-white/50">{label}</div>
      <div className="font-display text-lg text-[#ffd23e] mt-0.5">{value}</div>
    </div>
  );
}
