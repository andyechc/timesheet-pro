"use client";

import { Play, Pause, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerButtonProps {
  isRunning: boolean;
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  size?: "sm" | "md" | "lg";
}

export function TimerButton({
  isRunning,
  isActive,
  onPlay,
  onPause,
  onStop,
  size = "md",
}: TimerButtonProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28,
  };

  // Si no está activo, mostrar solo botón de play
  if (!isActive) {
    return (
      <button
        onClick={onPlay}
        className={cn(
          sizeClasses[size],
          "btn-squircle flex items-center justify-center",
          "bg-primary-500 text-white shadow-soft hover:bg-primary-600 hover:shadow-glow"
        )}
        aria-label="Iniciar timer"
      >
        <Play size={iconSizes[size]} fill="currentColor" className="ml-0.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Botón Pause/Resume */}
      <button
        onClick={isRunning ? onPause : onPlay}
        className={cn(
          sizeClasses[size],
          "btn-squircle flex items-center justify-center",
          isRunning
            ? "bg-amber-500 text-white shadow-soft hover:bg-amber-600 btn-play-active"
            : "bg-emerald-500 text-white shadow-soft hover:bg-emerald-600"
        )}
        aria-label={isRunning ? "Pausar timer" : "Reanudar timer"}
      >
        {isRunning ? (
          <Pause size={iconSizes[size]} fill="currentColor" />
        ) : (
          <Play size={iconSizes[size]} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Botón Stop */}
      <button
        onClick={onStop}
        className={cn(
          sizeClasses[size],
          "btn-squircle flex items-center justify-center",
          "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-600"
        )}
        aria-label="Detener timer"
      >
        <Square size={iconSizes[size]} fill="currentColor" className="scale-75" />
      </button>
    </div>
  );
}
