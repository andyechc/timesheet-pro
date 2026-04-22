"use client";

import { useState } from "react";
import { Plus, FolderKanban } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { ExportButton } from "@/components/export-button";
import { ThemeToggle } from "@/components/theme-provider";
import { useProjects } from "@/lib/hooks/use-storage";

export default function HomePage() {
  const { projects, loading, create, refresh } = useProjects();
  const [showNewProject, setShowNewProject] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-soft sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <FolderKanban className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Timesheet Pro
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gestión de proyectos y tiempo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <ExportButton />
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors btn-squircle"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nuevo Proyecto</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-soft p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Proyectos Activos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {projects.length}
            </p>
          </div>
          <div className="card-soft p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Tareas</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {projects.reduce(
                (sum, p) => sum + (p._count?.tasks || 0),
                0
              )}
            </p>
          </div>
          <div className="card-soft p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Horas Registradas</p>
            <p className="text-2xl font-bold text-primary-600">
              {Math.round(
                projects.reduce(
                  (sum, p) =>
                    sum +
                    (p.tasks?.reduce(
                      (tSum, t) =>
                        tSum +
                        t.timesheets.reduce(
                          (tsSum, ts) => tsSum + (ts.duration || 0),
                          0
                        ),
                      0
                    ) || 0),
                  0
                ) / 36
              ) / 100}
              h
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Tus Proyectos
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="card-soft p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="text-slate-400" size={28} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No hay proyectos aún
              </h3>
              <p className="text-slate-500 mb-4">
                Crea tu primer proyecto para empezar a rastrear el tiempo
              </p>
              <button
                onClick={() => setShowNewProject(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                Crear Proyecto
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onUpdate={refresh} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nuevo Proyecto */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => {
            refresh();
            setShowNewProject(false);
          }}
          onCreate={create}
        />
      )}
    </div>
  );
}

// Modal para crear proyecto
function NewProjectModal({
  onClose,
  onCreated,
  onCreate,
}: {
  onClose: () => void;
  onCreated: () => void;
  onCreate: (data: { name: string; description?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      onCreate({ name, description });
      onCreated();
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-squircle-lg shadow-soft-lg p-6 w-full max-w-md m-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Nuevo Proyecto
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Desarrollo Web E-commerce"
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
              placeholder="Descripción del proyecto..."
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
              disabled={submitting || !name}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear Proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
