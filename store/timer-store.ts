import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
  // Estado del timer activo
  activeTaskId: string | null;
  activeProjectId: string | null;
  startTime: Date | null;
  elapsedSeconds: number;
  isRunning: boolean;
  timesheetId: string | null;
  
  // Acciones
  startTimer: (taskId: string, projectId: string, timesheetId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => { taskId: string; timesheetId: string; duration: number } | null;
  tick: () => void;
  reset: () => void;
  
  // Para sincronización con servidor
  syncWithServer: (serverStartTime: Date, serverElapsed: number) => void;
}

// SINGLE SOURCE OF TRUTH: Solo un timer puede estar activo globalmente
export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTaskId: null,
      activeProjectId: null,
      startTime: null,
      elapsedSeconds: 0,
      isRunning: false,
      timesheetId: null,

      startTimer: (taskId: string, projectId: string, timesheetId: string) => {
        const state = get();
        
        // Si hay un timer activo en otra tarea, detenerlo primero
        if (state.activeTaskId && state.activeTaskId !== taskId && state.isRunning) {
          // Retornar información para que el llamador maneje la tarea anterior
          const previousTask = {
            taskId: state.activeTaskId,
            timesheetId: state.timesheetId!,
            duration: state.elapsedSeconds,
          };
          
          // Iniciar nuevo timer
          set({
            activeTaskId: taskId,
            activeProjectId: projectId,
            startTime: new Date(),
            elapsedSeconds: 0,
            isRunning: true,
            timesheetId: timesheetId,
          });
          
          return previousTask;
        }
        
        // Si es la misma tarea y está pausada, reanudar
        if (state.activeTaskId === taskId && !state.isRunning) {
          set({
            isRunning: true,
            startTime: new Date(),
          });
          return null;
        }
        
        // Iniciar nuevo timer limpio
        set({
          activeTaskId: taskId,
          activeProjectId: projectId,
          startTime: new Date(),
          elapsedSeconds: 0,
          isRunning: true,
          timesheetId: timesheetId,
        });
        
        return null;
      },

      pauseTimer: () => {
        const state = get();
        if (state.isRunning && state.startTime) {
          const now = new Date();
          const additionalSeconds = Math.floor(
            (now.getTime() - state.startTime.getTime()) / 1000
          );
          set({
            isRunning: false,
            elapsedSeconds: state.elapsedSeconds + additionalSeconds,
            startTime: null,
          });
        }
      },

      resumeTimer: () => {
        set({
          isRunning: true,
          startTime: new Date(),
        });
      },

      stopTimer: () => {
        const state = get();
        if (!state.activeTaskId || !state.timesheetId) return null;

        let totalDuration = state.elapsedSeconds;
        if (state.isRunning && state.startTime) {
          const now = new Date();
          totalDuration += Math.floor(
            (now.getTime() - state.startTime.getTime()) / 1000
          );
        }

        const result = {
          taskId: state.activeTaskId,
          timesheetId: state.timesheetId,
          duration: totalDuration,
        };

        // Resetear estado
        set({
          activeTaskId: null,
          activeProjectId: null,
          startTime: null,
          elapsedSeconds: 0,
          isRunning: false,
          timesheetId: null,
        });

        return result;
      },

      tick: () => {
        const state = get();
        if (state.isRunning && state.startTime) {
          const now = new Date();
          const additionalSeconds = Math.floor(
            (now.getTime() - state.startTime.getTime()) / 1000
          );
          set({
            elapsedSeconds: state.elapsedSeconds + additionalSeconds,
            startTime: now,
          });
        }
      },

      reset: () => {
        set({
          activeTaskId: null,
          activeProjectId: null,
          startTime: null,
          elapsedSeconds: 0,
          isRunning: false,
          timesheetId: null,
        });
      },

      syncWithServer: (serverStartTime: Date, serverElapsed: number) => {
        set({
          startTime: serverStartTime,
          elapsedSeconds: serverElapsed,
        });
      },
    }),
    {
      name: "timer-storage",
      partialize: (state) => ({
        activeTaskId: state.activeTaskId,
        activeProjectId: state.activeProjectId,
        elapsedSeconds: state.elapsedSeconds,
        isRunning: false, // No persistir como running
        timesheetId: state.timesheetId,
        // No persistir startTime
      }),
    }
  )
);

// Hook para el intervalo del timer
export function useTimerTick() {
  const tick = useTimerStore((state) => state.tick);
  const isRunning = useTimerStore((state) => state.isRunning);

  if (typeof window !== "undefined") {
    setInterval(() => {
      if (isRunning) {
        tick();
      }
    }, 1000);
  }
}
