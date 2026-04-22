import * as XLSX from "xlsx";
import { formatDate, formatTime, formatDuration } from "./utils";

interface ReportRow {
  project: string;
  task: string;
  timesheetTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  hoursTotal: number;
  durationFormatted: string;
  notes: string;
}

export function exportToExcel(data: ReportRow[], filename: string = "timesheet-report"): void {
  // Ordenar datos por proyecto, tarea y fecha para agrupación
  const sortedData = [...data].sort((a, b) => {
    const projectCompare = a.project.localeCompare(b.project);
    if (projectCompare !== 0) return projectCompare;
    const taskCompare = a.task.localeCompare(b.task);
    if (taskCompare !== 0) return taskCompare;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Preparar datos para Excel con agrupación
  let lastProject = "";
  let lastTask = "";
  const rows = sortedData.map((row) => {
    const showProject = row.project !== lastProject;
    const showTask = row.project !== lastProject || row.task !== lastTask;
    
    if (showProject) lastProject = row.project;
    if (showTask) lastTask = row.task;
    
    return {
      Proyecto: showProject ? row.project : "",
      "Tarea Principal": showTask ? row.task : "",
      "Sesión/Título": row.timesheetTitle || "-",
      Fecha: row.date,
      "Hora Inicio": row.startTime,
      "Hora Fin": row.endTime,
      "Horas Decimales": row.hoursTotal,
      "Duración": row.durationFormatted,
      Notas: row.notes || "-",
    };
  });

  // Calcular totales
  const totalHours = data.reduce((sum, row) => sum + row.hoursTotal, 0);
  const totalSeconds = data.reduce((sum, row) => sum + Math.round(row.hoursTotal * 3600), 0);

  // Agregar fila de Total
  rows.push({
    Proyecto: "",
    "Tarea Principal": "",
    "Sesión/Título": "",
    Fecha: "",
    "Hora Inicio": "",
    "Hora Fin": "",
    "Horas Decimales": "",
    "Duración": "",
    Notas: "",
  });
  rows.push({
    Proyecto: "TOTAL",
    "Tarea Principal": "",
    "Sesión/Título": "",
    Fecha: "",
    "Hora Inicio": "",
    "Hora Fin": "",
    "Horas Decimales": Number(totalHours.toFixed(2)),
    "Duración": formatDuration(totalSeconds),
    Notas: `${data.length} registros`,
  });

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Configurar anchos de columna
  const colWidths = [
    { wch: 25 }, // Proyecto
    { wch: 30 }, // Tarea Principal
    { wch: 30 }, // Sesión/Título
    { wch: 12 }, // Fecha
    { wch: 12 }, // Hora Inicio
    { wch: 12 }, // Hora Fin
    { wch: 15 }, // Horas Decimales
    { wch: 12 }, // Duración
    { wch: 30 }, // Notas
  ];
  ws["!cols"] = colWidths;

  // Usar el rango que ya calculó json_to_sheet
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:I1");
  const totalRowIndex = rows.length - 1; // Última fila (TOTAL)

  // Estilos para la fila de cabecera (azul primary) - fila 0
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[headerAddress]) ws[headerAddress] = { v: "" };
    if (!ws[headerAddress].s) ws[headerAddress].s = {};
    ws[headerAddress].s.font = { bold: true, color: { rgb: "FFFFFF" } };
    ws[headerAddress].s.fill = { fgColor: { rgb: "2563EB" } }; // Primary-600 blue
  }

  // Estilos para la fila de total
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: C });
    if (!ws[cellAddress]) ws[cellAddress] = { v: "" };
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    ws[cellAddress].s.font = { bold: true };
    ws[cellAddress].s.fill = { fgColor: { rgb: "E0E7FF" } }; // Light blue background
  }

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Timesheet Report");

  // Descargar archivo
  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}-${date}.xlsx`);
}

export function generateMonthlyReport(
  timesheets: Array<{
    id: string;
    title: string | null;
    startTime: Date;
    endTime: Date | null;
    duration: number | null;
    notes: string | null;
    task: {
      title: string;
      project: {
        name: string;
      };
    };
  }>
): ReportRow[] {
  return timesheets
    .filter((t) => t.endTime && t.duration) // Solo completados
    .map((t) => {
      const hoursTotal = (t.duration || 0) / 3600;
      return {
        project: t.task.project.name,
        task: t.task.title,
        timesheetTitle: t.title || "",
        date: formatDate(t.startTime),
        startTime: formatTime(t.startTime),
        endTime: formatTime(t.endTime!),
        hoursTotal: Number(hoursTotal.toFixed(2)),
        durationFormatted: formatDuration(t.duration || 0),
        notes: t.notes || "",
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
