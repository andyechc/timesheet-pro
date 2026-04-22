"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { TaskCard } from "@/components/task-card";
import { ExportButton } from "@/components/export-button";
import { ThemeToggle } from "@/components/theme-provider";
import { useTimerStore } from "@/store/timer-store";
import { formatDate, formatDuration } from "@/lib/utils";
import { projectService, taskService, timesheetService } from "@/lib/local-storage";
// Status values: PENDING, IN_PROGRESS, COMPLETED

interface Project {
  id: string;
  name: string;
  description: string | null;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    projectId: string;
    timesheets: Array<{
      id: string;
      title: string | null;
      startTime: Date | string;
      endTime: Date | string | null;
      duration: number | null;
      notes: string | null;
    }>;
  }>;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Timer store
  const {
    activeTaskId,
    isRunning,
    startTimer: startTimerStore,
    pauseTimer,
    stopTimer: stopTimerStore,
  } = useTimerStore();

  const fetchProject = useCallback(() => {
    try {
      const data = projectService.findUnique(projectId, { tasks: true });
      if (!data) throw new Error("Project not found");
      setProject(data as any);
    } catch (error) {
      console.error("Error loading project:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Controladores del timer con localStorage
  const handleStartTimer = (taskId: string, projId: string, title?: string) => {
    // 1. Crear timesheet en localStorage
    const timesheet = timesheetService.create({
      taskId,
      title: title || undefined,
      startTime: new Date().toISOString(),
    });
    // 2. Iniciar en el store global
    startTimerStore(taskId, projId, timesheet.id);
  };

  const handleStopTimer = () => {
    const result = stopTimerStore();
    if (result) {
      // Actualizar timesheet en localStorage
      timesheetService.update(result.timesheetId, {
        endTime: new Date().toISOString(),
        duration: result.duration,
      });
      fetchProject(); // Recargar para mostrar el nuevo registro
    }
  };

  // Filtrar tareas
  const filteredTasks =
    filterStatus === "ALL"
      ? project?.tasks
      : project?.tasks.filter((t) => t.status === filterStatus);

  // Calcular estadísticas
  const totalHours =
    project?.tasks.reduce(
      (sum, task) =>
        sum +
        task.timesheets.reduce(
          (tSum, ts) => tSum + (ts.duration || 0),
          0
        ),
      0
    ) || 0;

  const completedTasks =
    project?.tasks.filter((t) => t.status === "COMPLETED").length ||
    0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-soft sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                {project.name}
              </h1>
            </div>
            <ThemeToggle />
            <ExportButton projectId={projectId} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info Card */}
        <div className="card-soft p-6 mb-8">
          <div className="flex flex-wrap gap-6">

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clock className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Horas totales</p>
                <p className="font-semibold text-primary-600">
                  {Math.round((totalHours / 3600) * 100) / 100}h
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tareas completadas</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {completedTasks} / {project.tasks.length}
                </p>
              </div>
            </div>
          </div>

          {project.description && (
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tareas</h2>
            <div className="flex items-center gap-3">
              {/* Filtro por estado */}
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value)
                }
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="COMPLETED">Completada</option>
              </select>

              <button
                onClick={() => setShowNewTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors btn-squircle"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nueva Tarea</span>
              </button>
            </div>
          </div>

          {/* Timer Global Activo */}
          {activeTaskId && (
            <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-squircle p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                </div>
                <span className="text-primary-800 dark:text-primary-200 font-medium">
                  Timer activo en otra tarea
                </span>
              </div>
              <button
                onClick={handleStopTimer}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                Detener
              </button>
            </div>
          )}

          {/* Lista de Tareas */}
          {filteredTasks?.length === 0 ? (
            <div className="card-soft p-8 text-center">
              <p className="text-slate-500">
                {filterStatus === "ALL"
                  ? "No hay tareas en este proyecto"
                  : "No hay tareas con este estado"}
              </p>
              <button
                onClick={() => setShowNewTask(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                Crear primera tarea
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks?.map((task) => (
                <TaskCard
                  key={task.id}
                  task={{
                    ...task,
                    timesheets: task.timesheets.map((ts) => ({
                      ...ts,
                      startTime: new Date(ts.startTime),
                      endTime: ts.endTime ? new Date(ts.endTime) : null,
                    })),
                  }}
                  project={{
                    id: project.id,
                    name: project.name,
                  }}
                  isTimerActive={!!activeTaskId}
                  isTimerRunning={isRunning}
                  activeTaskId={activeTaskId}
                  onStartTimer={handleStartTimer}
                  onPauseTimer={pauseTimer}
                  onStopTimer={handleStopTimer}
                  onUpdate={fetchProject}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nueva Tarea */}
      {showNewTask && (
        <NewTaskModal
          projectId={projectId}
          onClose={() => setShowNewTask(false)}
          onCreated={fetchProject}
        />
      )}
    </div>
  );
}

// Modal para crear tarea
function NewTaskModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      taskService.create({
        title,
        description,
        projectId,
      });
      onCreated();
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-squircle-lg shadow-soft-lg p-6 w-full max-w-md m-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Nueva Tarea
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Implementar autenticación"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la tarea..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !title}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
