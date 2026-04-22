"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { exportToExcel, generateMonthlyReport } from "@/lib/export-excel";
import { cn } from "@/lib/utils";
import { timesheetService, taskService, projectService } from "@/lib/local-storage";

interface ExportButtonProps {
  projectId?: string;
  variant?: "primary" | "secondary";
}

export function ExportButton({
  projectId,
  variant = "secondary",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showModal, setShowModal] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Obtener datos de localStorage
      const [year, monthNum] = month.split('-').map(Number);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

      let allTimesheets = timesheetService.findMany({ include: { task: true } });

      // Filtrar por mes
      allTimesheets = allTimesheets.filter(ts => {
        const tsDate = new Date(ts.startTime);
        return tsDate >= startOfMonth && tsDate <= endOfMonth && ts.endTime && ts.duration;
      });

      // Filtrar por proyecto si se especifica
      if (projectId) {
        const projectTasks = taskService.findMany({ where: { projectId } });
        const taskIds = projectTasks.map(t => t.id);
        allTimesheets = allTimesheets.filter(ts => taskIds.includes(ts.taskId));
      }

      // Obtener todos los datos necesarios
      const allTasks = taskService.findMany();
      const allProjects = projectService.findMany();
      
      // Crear mapas para acceso rápido
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      const projectMap = new Map(allProjects.map(p => [p.id, p]));
      
      // Enriquecer datos con información de proyecto
      const enrichedTimesheets = allTimesheets.map(ts => {
        const task = taskMap.get(ts.taskId);
        const project = task ? projectMap.get(task.projectId) : undefined;
        return {
          ...ts,
          task: {
            title: task?.title || '',
            project: {
              name: project?.name || ''
            }
          }
        };
      });

      if (enrichedTimesheets && enrichedTimesheets.length > 0) {
        const report = generateMonthlyReport(enrichedTimesheets as any);
        const filename = projectId
          ? `reporte-proyecto-${month}`
          : `reporte-mensual-${month}`;
        exportToExcel(report, filename);
      } else {
        alert("No hay datos para exportar en el período seleccionado");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error al exportar. Inténtalo de nuevo.");
    } finally {
      setIsExporting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all btn-squircle",
          variant === "primary"
            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft"
            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
        )}
      >
        <FileSpreadsheet size={18} />
        <span>Exportar Excel</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-squircle-lg shadow-soft-lg p-6 w-full max-w-sm m-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Exportar reporte
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Mes
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    "Exportando..."
                  ) : (
                    <>
                      <Download size={16} />
                      Exportar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
