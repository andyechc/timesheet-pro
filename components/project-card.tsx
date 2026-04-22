"use client";

import { useState } from "react";
import { FolderKanban, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { EditProjectModal } from "./edit-project-modal";
import { DeleteModal } from "./delete-modal";
import { projectService } from "@/lib/local-storage";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    _count?: {
      tasks: number;
    };
    tasks?: Array<{
      timesheets: Array<{
        duration: number | null;
      }>;
    }>;
  };
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const totalHours =
    project.tasks?.reduce(
      (sum, task) =>
        sum +
        task.timesheets.reduce((tSum, ts) => tSum + (ts.duration || 0), 0),
      0
    ) || 0;

  const hoursDecimal = Math.round((totalHours / 3600) * 100) / 100;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDelete = () => {
    projectService.delete(project.id);
    onUpdate?.();
  };

  return (
    <>
      <div className="card-soft-hover p-5 group relative">
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleteModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <Link href={`/projects/${project.id}`} className="block">
          <div className="flex items-start justify-between pr-16">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban size={16} className="text-primary-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Proyecto</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            <ChevronRight
              size={20}
              className="text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transition-colors flex-shrink-0"
            />
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Tareas:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {project._count?.tasks || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm ml-auto">
              <span className="text-slate-500 dark:text-slate-400">Horas:</span>
              <span
                className={cn(
                  "font-semibold",
                  hoursDecimal > 0 ? "text-primary-600" : "text-slate-400"
                )}
              >
                {hoursDecimal}h
              </span>
            </div>
          </div>
        </Link>
      </div>

      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            onUpdate?.();
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          title="Eliminar proyecto"
          description={`¿Estás seguro de que quieres eliminar "${project.name}"? Esto también eliminará todas las tareas y sesiones asociadas.`}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
