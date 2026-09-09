import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
import { LEVELS, TREASURE_BADGE } from "./game/levels";
import { initAudio, setMuted as setAudioMuted, sfx } from "./game/audio";
import {
  formatTime,
  loadHighScores,
  loadMuted,
  loadUnlockedBadges,
  saveHighScore,
  saveMuted,
  unlockBadges,
  type ScoreEntry,
} from "./game/storage";
import { HUD, LevelBanner, QuestionPanel, type PlayPhase } from "./components/play";
import {
  BadgesScreen,
  LearnModal,
  MateriScreen,
  MenuScreen,
  PauseOverlay,
  ResultModal,
  ScoresScreen,
  TipsScreen,
} from "./components/screens";

type Screen = "menu" | "materi" | "badges" | "scores" | "tips" | "play";

interface ResultData {
  total: number;
  bonus: number;
  stars: number;
  time: number;
  isNewBest: boolean;
  newBadges: { icon: string; name: string }[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [screen, setScreen] = useState<Screen>("menu");
  const [phase, setPhase] = useState<PlayPhase>("question");
  const [levelIdx, setLevelIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [unlockedAll, setUnlockedAll] = useState<string[]>(() => loadUnlockedBadges());
  const [paused, setPaused] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => loadMuted());
  const [banner, setBanner] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [best, setBest] = useState<ScoreEntry | null>(() => loadHighScores()[0] ?? null);
  const [now, setNow] = useState(Date.now());

  const stateRef = useRef({ screen, phase, paused, levelIdx, showResult, muted });
  stateRef.current = { screen, phase, paused, levelIdx, showResult, muted };
  const statsRef = useRef({ score, mistakes, earned });
  statsRef.current = { score, mistakes, earned };

  const startRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(0);
  const savedRef = useRef(false);
  const bannerTimer = useRef(0);

  const badgeInfo = useCallback((id: string) => {
    const lv = LEVELS.find((l) => l.badge.id === id);
    if (lv) return { icon: lv.badge.icon, name: lv.badge.name };
    return { icon: TREASURE_BADGE.icon, name: TREASURE_BADGE.name };
  }, []);

  const finalize = useCallback(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    const { score, mistakes, earned } = statsRef.current;
    const bonus = mistakes === 0 ? 20 : 0;
    const total = score + bonus;
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const time = Math.max(1, (Date.now() - startRef.current - pausedTotalRef.current) / 1000);
    const allIds = [...earned, TREASURE_BADGE.id];
    setUnlockedAll(unlockBadges(allIds));
    const { rank } = saveHighScore({ score: total, stars, mistakes, time, date: Date.now() });
    setBest(loadHighScores()[0] ?? null);
    const newBadges = allIds.map(badgeInfo);
    setResult({ total, bonus, stars, time, isNewBest: rank === 1, newBadges });
    setPhase("final");
    setShowResult(true);
  }, [badgeInfo]);

  // ---- engine lifecycle ----
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const eng = new Engine(cv);
    engineRef.current = eng;
    eng.toMenu();
    eng.onPhase = (p) => {
      const st = stateRef.current;
      if (st.screen !== "play") return;
      if (p === "cleared") {
        const lv = LEVELS[st.levelIdx];
        sfx.clear();
        window.setTimeout(() => sfx.badge(), 350);
        setEarned((prev) => (prev.includes(lv.badge.id) ? prev : [...prev, lv.badge.id]));
        setUnlockedAll(unlockBadges([lv.badge.id]));
        eng.addFloater(`🏅 ${lv.badge.name}`, 0.5, 0.3, "#ffd23e", 20);
        setPhase("cleared");
      } else if (p === "treasure") {
        sfx.treasure();
        window.setTimeout(() => finalize(), 1500);
      }
    };
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
  }, [finalize]);

  // ---- actions ----
  const loadLevel = useCallback((i: number) => {
    const lv = LEVELS[i];
    engineRef.current?.setLevel(lv.scene, lv.theme);
    setSelected(null);
    setPhase("question");
    setBanner(true);
    sfx.whoosh();
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(false), 1600);
  }, []);

  const start = useCallback(() => {
    initAudio();
    sfx.click();
    setLevelIdx(0);
    setScore(0);
    setMistakes(0);
    setEarned([]);
    setSelected(null);
    setPaused(false);
    setShowResult(false);
    setResult(null);
    setBanner(false);
    savedRef.current = false;
    startRef.current = Date.now();
    pausedTotalRef.current = 0;
    pausedAtRef.current = 0;
    setScreen("play");
    setPhase("question");
    loadLevel(0);
  }, [loadLevel]);

  const answer = useCallback(
    (i: number) => {
      const st = stateRef.current;
      if (st.screen !== "play" || st.phase !== "question" || st.paused) return;
      initAudio();
      const lv = LEVELS[st.levelIdx];
      if (i === lv.correct) {
        setSelected(i);
        setPhase("correct");
        setScore((s) => s + 10);
        sfx.correct();
        engineRef.current?.answerCorrect();
        engineRef.current?.addFloater("+10 ⭐", 0.32, 0.48, "#ffe9b3", 24);
      } else {
        setSelected(i);
        setPhase("wrong");
        setMistakes((m) => m + 1);
        sfx.wrong();
        engineRef.current?.answerWrong();
      }
    },
    []
  );

  const openLearn = useCallback(() => {
    initAudio();
    sfx.learn();
    setPhase("learn");
  }, []);

  const retryLearn = useCallback(() => {
    initAudio();
    sfx.click();
    engineRef.current?.forceIdle();
    setSelected(null);
    setPhase("question");
  }, []);

  const next = useCallback(() => {
    const st = stateRef.current;
    if (st.phase !== "cleared" || st.paused || st.showResult) return;
    sfx.click();
    if (st.levelIdx >= LEVELS.length - 1) {
      setPhase("treasure");
      engineRef.current?.toCave();
      sfx.whoosh();
    } else {
      const ni = st.levelIdx + 1;
      setLevelIdx(ni);
      loadLevel(ni);
    }
  }, [loadLevel]);

  const togglePause = useCallback(() => {
    const st = stateRef.current;
    if (st.screen !== "play" || st.showResult) return;
    if (st.paused) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
      setPaused(false);
      setNow(Date.now());
    } else {
      pausedAtRef.current = Date.now();
      setPaused(true);
    }
    sfx.click();
  }, []);

  const toggleMute = useCallback(() => {
    const m = !stateRef.current.muted;
    setMutedState(m);
    saveMuted(m);
    setAudioMuted(m);
    if (!m) {
      initAudio();
      sfx.click();
    }
  }, []);

  const goMenu = useCallback(() => {
    sfx.click();
    setScreen("menu");
    setPaused(false);
    setShowResult(false);
    setBanner(false);
    engineRef.current?.toMenu();
    setBest(loadHighScores()[0] ?? null);
  }, []);

  const actionsRef = useRef({ answer, next, openLearn, togglePause, start, retryLearn, toggleMute, goMenu });
  actionsRef.current = { answer, next, openLearn, togglePause, start, retryLearn, toggleMute, goMenu };

  // ---- auto advance after clear ----
  useEffect(() => {
    if (phase !== "cleared" || paused || screen !== "play") return;
    const t = window.setTimeout(() => actionsRef.current.next(), 3200);
    return () => window.clearTimeout(t);
  }, [phase, paused, screen]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const st = stateRef.current;
      const A = actionsRef.current;
      const k = e.key.toLowerCase();
      initAudio();
      if (k === "m") {
        A.toggleMute();
        return;
      }
      if (k === "p" || k === "escape") {
        if (st.screen === "play" && !st.showResult) A.togglePause();
        else if (st.screen !== "menu") A.goMenu();
        return;
      }
      if (st.screen === "menu") {
        if (k === "enter" || k === " ") {
          e.preventDefault();
          A.start();
        }
        return;
      }
      if (st.screen !== "play") return;
      if (st.paused || st.showResult) return;
      if (st.phase === "question") {
        const num = ["1", "2", "3", "4"].indexOf(k);
        if (num >= 0) A.answer(num);
        else {
          const let_ = ["a", "b", "c", "d"].indexOf(k);
          if (let_ >= 0) A.answer(let_);
        }
      } else if (st.phase === "cleared" && (k === "enter" || k === " ")) {
        e.preventDefault();
        A.next();
      } else if (st.phase === "wrong" && (k === "enter" || k === " ")) {
        A.openLearn();
      } else if (st.phase === "learn" && (k === "enter" || k === " ")) {
        e.preventDefault();
        A.retryLearn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- auto pause when tab hidden ----
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && stateRef.current.screen === "play" && !stateRef.current.paused && !stateRef.current.showResult) {
        togglePause();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [togglePause]);

  // ---- clock ----
  useEffect(() => {
    if (screen !== "play" || paused) return;
    const iv = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(iv);
  }, [screen, paused]);

  const elapsed =
    screen === "play"
      ? Math.max(
          0,
          (paused ? pausedAtRef.current : now) - startRef.current - pausedTotalRef.current
        ) / 1000
      : 0;

  const inQuestionUI =
    phase === "question" || phase === "correct" || phase === "wrong" || phase === "learn" || phase === "cleared";

  // Keep the game scene above the question panel on small screens.
  useLayoutEffect(() => {
    engineRef.current?.setBottomInset(panelRef.current?.offsetHeight ?? 0);
  }, [inQuestionUI, phase, levelIdx, screen]);

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 48% 42%, transparent 58%, rgba(0,0,0,0.24) 100%)" }}
      />

      {screen === "play" && !paused && banner && !showResult && <LevelBanner levelIdx={levelIdx} />}

      {screen === "play" && inQuestionUI && (
        <QuestionPanel
          ref={(el) => {
            panelRef.current = el;
          }}
          level={LEVELS[levelIdx]}
          levelIdx={levelIdx}
          phase={phase === "learn" ? "wrong" : phase}
          selected={selected}
          onAnswer={answer}
          onOpenLearn={openLearn}
          onNext={next}
        />
      )}

      {screen === "play" && !showResult && (
        <HUD
          levelIdx={levelIdx}
          score={score}
          badges={earned.length}
          time={formatTime(elapsed)}
          muted={muted}
          onPause={togglePause}
          onMute={toggleMute}
        />
      )}

      {screen === "menu" && (
        <MenuScreen
          onStart={start}
          best={best}
          onNav={(s) => {
            initAudio();
            sfx.click();
            setScreen(s);
          }}
        />
      )}
      {screen === "materi" && <MateriScreen onBack={goMenu} />}
      {screen === "badges" && <BadgesScreen unlocked={unlockedAll} onBack={goMenu} />}
      {screen === "scores" && <ScoresScreen scores={loadHighScores()} onBack={goMenu} />}
      {screen === "tips" && <TipsScreen onBack={goMenu} />}

      {screen === "play" && phase === "learn" && !paused && (
        <LearnModal lesson={LEVELS[levelIdx].lesson} onDone={retryLearn} />
      )}
      {screen === "play" && paused && (
        <PauseOverlay
          onResume={togglePause}
          onRestart={start}
          onMenu={goMenu}
          muted={muted}
          onMute={toggleMute}
        />
      )}
      {showResult && result && (
        <ResultModal
          total={result.total}
          bonus={result.bonus}
          mistakes={mistakes}
          stars={result.stars}
          time={result.time}
          isNewBest={result.isNewBest}
          newBadges={result.newBadges}
          onMenu={goMenu}
          onRestart={start}
          onMateri={() => {
            sfx.click();
            setScreen("materi");
          }}
        />
      )}
    </div>
  );
}
