'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  projectService, 
  taskService, 
  timesheetService, 
  storageUtils,
  Project, 
  Task, 
  Timesheet 
} from '../local-storage';

// Hook para proyectos
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const data = projectService.findMany({ tasks: true });
    setProjects(data as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback((data: { name: string; description?: string }) => {
    const project = projectService.create(data);
    refresh();
    return project;
  }, [refresh]);

  const update = useCallback((id: string, data: { name?: string; description?: string }) => {
    const project = projectService.update(id, data);
    refresh();
    return project;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const result = projectService.delete(id);
    refresh();
    return result;
  }, [refresh]);

  return { projects, loading, create, update, remove, refresh };
}

// Hook para tareas
export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const opts = projectId ? { where: { projectId }, include: { timesheets: true } } : { include: { timesheets: true } };
    const data = taskService.findMany(opts);
    setTasks(data as any);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback((data: { title: string; description?: string; status?: string; projectId: string }) => {
    const task = taskService.create(data);
    refresh();
    return task;
  }, [refresh]);

  const update = useCallback((id: string, data: { title?: string; description?: string; status?: string }) => {
    const task = taskService.update(id, data);
    refresh();
    return task;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const result = taskService.delete(id);
    refresh();
    return result;
  }, [refresh]);

  return { tasks, loading, create, update, remove, refresh };
}

// Hook para timesheets
export function useTimesheets(taskId?: string) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const opts = taskId ? { where: { taskId }, include: { task: true } } : { include: { task: true } };
    const data = timesheetService.findMany(opts);
    setTimesheets(data as any);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback((data: {
    taskId: string;
    title?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    notes?: string;
  }) => {
    const timesheet = timesheetService.create(data);
    refresh();
    return timesheet;
  }, [refresh]);

  const update = useCallback((id: string, data: {
    title?: string;
    startTime?: string;
    endTime?: string | null;
    duration?: number | null;
    notes?: string;
  }) => {
    const timesheet = timesheetService.update(id, data);
    refresh();
    return timesheet;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const result = timesheetService.delete(id);
    refresh();
    return result;
  }, [refresh]);

  return { timesheets, loading, create, update, remove, refresh };
}

// Hook para inicializar datos de ejemplo
export function useSeed() {
  const seed = useCallback(() => {
    storageUtils.seed();
  }, []);

  const clear = useCallback(() => {
    storageUtils.clear();
  }, []);

  return { seed, clear };
}
