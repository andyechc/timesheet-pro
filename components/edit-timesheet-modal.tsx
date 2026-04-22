"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { timesheetService } from "@/lib/local-storage";

interface Timesheet {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  notes: string | null;
}

interface EditTimesheetModalProps {
  timesheet: Timesheet;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditTimesheetModal({ timesheet, onClose, onSuccess }: EditTimesheetModalProps) {
  const [title, setTitle] = useState(timesheet.title || "");
  const [notes, setNotes] = useState(timesheet.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDate = new Date(timesheet.startTime);
  const [date, setDate] = useState(startDate.toISOString().split("T")[0]);
  const [startTimeStr, setStartTimeStr] = useState(
    startDate.toTimeString().slice(0, 5)
  );
  const [endTimeStr, setEndTimeStr] = useState(
    timesheet.endTime 
      ? new Date(timesheet.endTime).toTimeString().slice(0, 5)
      : ""
  );

  // Calcular duración en tiempo real
  const durationSeconds = (() => {
    if (!endTimeStr) return 0;
    const start = new Date(`${date}T${startTimeStr}`);
    const end = new Date(`${date}T${endTimeStr}`);
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    return diff > 0 ? diff : 0;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    const startDateTime = new Date(`${date}T${startTimeStr}`);
    const endDateTime = endTimeStr ? new Date(`${date}T${endTimeStr}`) : null;
    const finalDuration = endDateTime ? durationSeconds : null;

    try {
      timesheetService.update(timesheet.id, {
        title: title || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString() || null,
        duration: finalDuration,
        notes: notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating timesheet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-squircle-lg shadow-soft-lg p-6 w-full max-w-md m-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Editar sesión</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Título de la sesión
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Reunión, Desarrollo..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Hora inicio
              </label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Hora fin
              </label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Preview de duración */}
          {endTimeStr && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <span className="text-sm text-slate-600 dark:text-slate-400">Duración: </span>
              <span
                className={cn(
                  "font-semibold",
                  durationSeconds > 0 ? "text-primary-600" : "text-red-500"
                )}
              >
                {durationSeconds > 0
                  ? formatDuration(durationSeconds)
                  : "Tiempo inválido"}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre esta sesión..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!!endTimeStr && durationSeconds <= 0)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
