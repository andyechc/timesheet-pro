"use client";

import { useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
import { formatDate, formatTime, formatDuration, cn } from "@/lib/utils";
import { EditTimesheetModal } from "./edit-timesheet-modal";
import { DeleteModal } from "./delete-modal";
import { timesheetService } from "@/lib/local-storage";

interface TimesheetListProps {
  timesheets: Array<{
    id: string;
    title: string | null;
    startTime: Date;
    endTime: Date | null;
    duration: number | null;
    notes: string | null;
  }>;
  taskId: string;
  onUpdate?: () => void;
}

export function TimesheetList({ timesheets, taskId, onUpdate }: TimesheetListProps) {
  const [editingTimesheet, setEditingTimesheet] = useState<typeof timesheets[0] | null>(null);
  const [deletingTimesheet, setDeletingTimesheet] = useState<typeof timesheets[0] | null>(null);

  const handleDelete = (timesheet: typeof timesheets[0]) => {
    timesheetService.delete(timesheet.id);
    onUpdate?.();
    setDeletingTimesheet(null);
  };
  const completedTimesheets = timesheets
    .filter((t) => t.endTime && t.duration)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  if (completedTimesheets.length === 0) {
    return (
      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-squircle text-center text-sm text-slate-500 dark:text-slate-400">
        No hay registros de tiempo completados
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
        Historial de sesiones
      </h4>
      {completedTimesheets.map((timesheet) => (
        <div
          key={timesheet.id}
          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm"
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              {timesheet.title && (
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {timesheet.title}
                </span>
              )}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(timesheet.startTime)}
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              {formatTime(timesheet.startTime)} - {formatTime(timesheet.endTime!)}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              )}
            >
              {formatDuration(timesheet.duration!)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingTimesheet(timesheet)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => setDeletingTimesheet(timesheet)}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              aria-label="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingTimesheet && (
        <EditTimesheetModal
          timesheet={{
            id: editingTimesheet.id,
            title: editingTimesheet.title,
            startTime: editingTimesheet.startTime.toISOString(),
            endTime: editingTimesheet.endTime?.toISOString() || null,
            duration: editingTimesheet.duration,
            notes: editingTimesheet.notes,
          }}
          onClose={() => setEditingTimesheet(null)}
          onSuccess={() => {
            onUpdate?.();
            setEditingTimesheet(null);
          }}
        />
      )}

      {/* Delete Modal */}
      {deletingTimesheet && (
        <DeleteModal
          title="Eliminar sesión"
          description={`¿Eliminar esta sesión de ${formatDuration(deletingTimesheet.duration || 0)}?`}
          onClose={() => setDeletingTimesheet(null)}
          onConfirm={() => handleDelete(deletingTimesheet)}
        />
      )}
    </div>
  );
}
