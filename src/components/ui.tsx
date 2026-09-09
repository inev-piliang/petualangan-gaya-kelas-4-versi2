import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function GameButton({
  children,
  onClick,
  variant = "dark",
  big = false,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "gold" | "green" | "dark" | "red";
  big?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border-b-[5px] font-extrabold uppercase tracking-wide transition-all duration-100 select-none",
        "active:translate-y-[3px] active:border-b-2 disabled:opacity-40 disabled:pointer-events-none",
        big ? "px-6 py-4 text-lg md:text-2xl font-display tracking-wider" : "px-4 py-2.5 text-xs md:text-sm",
        variant === "gold" &&
          "bg-[#ffc53d] border-[#a06a00] text-[#4a2b00] hover:bg-[#ffd36a] shadow-[0_0_24px_rgba(255,197,61,0.35)]",
        variant === "green" &&
          "bg-[#3ddc84] border-[#1e8f53] text-[#053b1e] hover:bg-[#5ce69a]",
        variant === "dark" &&
          "bg-[#16382a] border-[#0b2018] text-[#eafff2] hover:bg-[#1d4a38] border border-[#2c5c46]",
        variant === "red" && "bg-[#7a1f2b] border-[#4a1019] text-[#ffd9de] hover:bg-[#93283a]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs md:text-sm font-extrabold backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ScreenShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#07130d]/95 backdrop-blur-sm">
      <header className="flex items-center gap-3 px-4 py-3 border-b-2 border-[#16382a] shrink-0">
        <GameButton onClick={onBack} className="!px-3 !py-2">
          ← Menu
        </GameButton>
        <h2 className="font-display text-xl md:text-3xl text-[#ffd23e] title-outline tracking-wide">
          {title}
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="max-w-2xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

export function StarRating({ stars, size = "text-4xl" }: { stars: number; size?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1", size)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "transition-all",
            i < stars ? "text-[#ffd23e] drop-shadow-[0_0_8px_rgba(255,210,62,0.8)]" : "text-white/20"
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 inline-block -mt-0.5 mr-1" fill="currentColor">
      <path d="M7 4.5v15c0 .83.9 1.35 1.62.93l12.1-7.5a1.1 1.1 0 0 0 0-1.86L8.62 3.57A1.1 1.1 0 0 0 7 4.5Z" />
    </svg>
  );
}
