"use client";

import { useEffect } from "react";
import { useTimerStore } from "@/store/timer-store";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  taskId: string;
  className?: string;
}

export function TimerDisplay({ taskId, className }: TimerDisplayProps) {
  const { elapsedSeconds, isRunning, activeTaskId, tick } = useTimerStore();
  
  const isActive = activeTaskId === taskId;

  // Intervalo para actualizar el timer
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Mostrar tiempo solo si está activo
  if (!isActive) {
    return (
      <span className={cn("text-slate-400 text-sm font-medium", className)}>
        --:--
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "timer-display text-2xl font-bold tracking-tight",
          isRunning ? "text-primary-600" : "text-slate-500"
        )}
      >
        {formatDuration(elapsedSeconds)}
      </span>
      {isRunning && (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
        </span>
      )}
    </div>
  );
}
