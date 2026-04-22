"use client";

import { useState } from "react";
// Status: PENDING, IN_PROGRESS, COMPLETED
import { Clock, ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { TimerButton } from "./timer-button";
import { TimerDisplay } from "./timer-display";
import { TimesheetList } from "./timesheet-list";
import { ManualEntryModal } from "./manual-entry-modal";
import { EditTaskModal } from "./edit-task-modal";
import { DeleteModal } from "./delete-modal";
import { taskService } from "@/lib/local-storage";

const statuses = [
  { value: "PENDING", label: "Pendiente", icon: Circle, color: "bg-slate-100 text-slate-600" },
  { value: "IN_PROGRESS", label: "En progreso", icon: Clock, color: "bg-amber-100 text-amber-600" },
  { value: "COMPLETED", label: "Completada", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
];

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    projectId: string;
    timesheets: Array<{
      id: string;
      title: string | null;
      startTime: Date;
      endTime: Date | null;
      duration: number | null;
      notes: string | null;
    }>;
  };
  project: {
    id: string;
    name: string;
  };
  isTimerActive: boolean;
  isTimerRunning: boolean;
  activeTaskId: string | null;
  onStartTimer: (taskId: string, projectId: string, title?: string) => void;
  onPauseTimer: () => void;
  onStopTimer: () => void;
  onUpdate?: () => void | Promise<void>;
}

export function TaskCard({
  task,
  project,
  isTimerActive,
  isTimerRunning,
  activeTaskId,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onUpdate,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTitle, setTimerTitle] = useState("");

  const isActive = activeTaskId === task.id;
  const totalTracked = task.timesheets.reduce(
    (sum, t) => sum + (t.duration || 0),
    0
  );

  const statusColors: Record<string, string> = {
    PENDING: "bg-slate-100 text-slate-600",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En Proceso",
    COMPLETED: "Completada",
  };

  const handleStatusChange = (newStatus: string) => {
    try {
      taskService.update(task.id, { status: newStatus });
      onUpdate?.();
    } catch (error) {
      console.error("Error updating status:", error);
    }
    setShowStatusMenu(false);
  };

  const handleDelete = () => {
    taskService.delete(task.id);
    onUpdate?.();
  };

  const currentStatus = statuses.find(s => s.value === task.status) || statuses[0];

  return (
    <div className="card-soft-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Status selector */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity",
                  statusColors[task.status]
                )}
              >
                {statusLabels[task.status]}
                <ChevronDown size={12} />
              </button>
              
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700 py-1 z-20 min-w-[140px]">
                  {statuses.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.value}
                        onClick={() => handleStatusChange(s.value)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                          task.status === s.value && "bg-slate-50 dark:bg-slate-700 font-medium"
                        )}
                      >
                        <Icon size={14} className={s.color.split(" ")[1]} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit/Delete buttons */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <TimerDisplay taskId={task.id} />
          <TimerButton
            isRunning={isTimerRunning && isActive}
            isActive={isActive}
            onPlay={() => setShowTimerModal(true)}
            onPause={onPauseTimer}
            onStop={onStopTimer}
          />
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Resumen de tiempo total */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Clock size={16} className="text-slate-400 dark:text-slate-500" />
          <span className="font-medium">
            Total: {Math.round(totalTracked / 36) / 100}h
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            ({task.timesheets.filter((t) => t.endTime).length} sesiones)
          </span>
        </div>

        <button
          onClick={() => setShowManualEntry(true)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium ml-auto"
        >
          + Añadir entrada manual
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          {expanded ? (
            <>
              Ocultar historial <ChevronUp size={16} />
            </>
          ) : (
            <>
              Ver historial <ChevronDown size={16} />
            </>
          )}
        </button>
      </div>

      {/* Historial expandible */}
      {expanded && <TimesheetList timesheets={task.timesheets} taskId={task.id} onUpdate={onUpdate || (() => {})} />}

      {/* Modal para entrada manual */}
      {showManualEntry && (
        <ManualEntryModal
          taskId={task.id}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {/* Modal para iniciar timer */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-squircle-lg shadow-soft-lg p-6 w-full max-w-sm m-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Iniciar sesión
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {task.title}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la sesión (opcional)
                </label>
                <input
                  type="text"
                  value={timerTitle}
                  onChange={(e) => setTimerTitle(e.target.value)}
                  placeholder="Ej: Desarrollo, Reunión, Testing..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowTimerModal(false);
                    setTimerTitle("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onStartTimer(task.id, project.id, timerTitle);
                    setShowTimerModal(false);
                    setTimerTitle("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
                >
                  Iniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar tarea */}
      {isEditModalOpen && (
        <EditTaskModal
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
          }}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            onUpdate?.();
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Modal para eliminar tarea */}
      {isDeleteModalOpen && (
        <DeleteModal
          title="Eliminar tarea"
          description={`¿Estás seguro de que quieres eliminar "${task.title}"? Esto también eliminará todas las sesiones registradas.`}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
