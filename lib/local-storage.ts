// Servicio de almacenamiento local - Reemplaza Prisma/SQLite
const STORAGE_KEY = 'timesheet-data';

// Tipos de datos
export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  taskId: string;
  title: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: string;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  timesheets: Timesheet[];
}

// Obtener datos del localStorage
function getData(): AppData {
  if (typeof window === 'undefined') {
    return { projects: [], tasks: [], timesheets: [] };
  }
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { projects: [], tasks: [], timesheets: [] };
  }
  return JSON.parse(data);
}

// Guardar datos en localStorage
function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Generar UUID
function generateId(): string {
  return crypto.randomUUID();
}

// ============ PROJECTS ============
export const projectService = {
  findMany: (include?: { tasks?: boolean }): Project[] => {
    const { projects, tasks, timesheets } = getData();
    
    if (include?.tasks) {
      return projects.map(p => ({
        ...p,
        tasks: tasks.filter(t => t.projectId === p.id).map(t => ({
          ...t,
          timesheets: timesheets.filter(ts => ts.taskId === t.id).sort((a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
        }))
      })) as any;
    }
    
    return projects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  findUnique: (id: string, include?: { tasks?: boolean }): Project | null => {
    const { projects, tasks, timesheets } = getData();
    const project = projects.find(p => p.id === id);
    if (!project) return null;
    
    if (include?.tasks) {
      return {
        ...project,
        tasks: tasks.filter(t => t.projectId === id).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).map(t => ({
          ...t,
          timesheets: timesheets.filter(ts => ts.taskId === t.id).sort((a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
        }))
      } as any;
    }
    
    return project;
  },

  create: (data: { name: string; description?: string }): Project => {
    const appData = getData();
    const now = new Date().toISOString();
    
    const project: Project = {
      id: generateId(),
      name: data.name,
      description: data.description || null,
      createdAt: now,
      updatedAt: now,
    };
    
    appData.projects.push(project);
    saveData(appData);
    return project;
  },

  update: (id: string, data: { name?: string; description?: string }): Project | null => {
    const appData = getData();
    const index = appData.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    appData.projects[index] = {
      ...appData.projects[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    saveData(appData);
    return appData.projects[index];
  },

  delete: (id: string): boolean => {
    const appData = getData();
    const initialLength = appData.projects.length;
    
    // Eliminar proyecto
    appData.projects = appData.projects.filter(p => p.id !== id);
    
    // Eliminar tareas asociadas
    const tasksToDelete = appData.tasks.filter(t => t.projectId === id);
    appData.tasks = appData.tasks.filter(t => t.projectId !== id);
    
    // Eliminar timesheets asociados
    const taskIds = tasksToDelete.map(t => t.id);
    appData.timesheets = appData.timesheets.filter(t => !taskIds.includes(t.taskId));
    
    saveData(appData);
    return appData.projects.length < initialLength;
  },
};

// ============ TASKS ============
export const taskService = {
  findMany: (opts?: { where?: { projectId?: string }; include?: { timesheets?: boolean } }): Task[] => {
    const { tasks, timesheets } = getData();
    let result = tasks;
    
    if (opts?.where?.projectId) {
      result = result.filter(t => t.projectId === opts.where!.projectId);
    }
    
    result = result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    if (opts?.include?.timesheets) {
      return result.map(t => ({
        ...t,
        timesheets: timesheets.filter(ts => ts.taskId === t.id).sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      })) as any;
    }
    
    return result;
  },

  findUnique: (id: string, include?: { timesheets?: boolean; project?: boolean }): Task | null => {
    const { tasks, timesheets, projects } = getData();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    
    const result: any = { ...task };
    
    if (include?.timesheets) {
      result.timesheets = timesheets.filter(ts => ts.taskId === id).sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    }
    
    if (include?.project) {
      result.project = projects.find(p => p.id === task.projectId);
    }
    
    return result;
  },

  create: (data: { title: string; description?: string; status?: string; projectId: string }): Task => {
    const appData = getData();
    const now = new Date().toISOString();
    
    const task: Task = {
      id: generateId(),
      title: data.title,
      description: data.description || null,
      status: (data.status as Task['status']) || 'PENDING',
      projectId: data.projectId,
      createdAt: now,
      updatedAt: now,
    };
    
    appData.tasks.push(task);
    saveData(appData);
    return task;
  },

  update: (id: string, data: { title?: string; description?: string; status?: string }): Task | null => {
    const appData = getData();
    const index = appData.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    appData.tasks[index] = {
      ...appData.tasks[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    saveData(appData);
    return appData.tasks[index];
  },

  delete: (id: string): boolean => {
    const appData = getData();
    const initialLength = appData.tasks.length;
    
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    appData.timesheets = appData.timesheets.filter(t => t.taskId !== id);
    
    saveData(appData);
    return appData.tasks.length < initialLength;
  },
};

// ============ TIMESHEETS ============
export const timesheetService = {
  findMany: (opts?: { where?: { taskId?: string }; include?: { task?: boolean } }): Timesheet[] => {
    const { timesheets, tasks } = getData();
    let result = timesheets;
    
    if (opts?.where?.taskId) {
      result = result.filter(t => t.taskId === opts.where!.taskId);
    }
    
    result = result.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    if (opts?.include?.task) {
      return result.map(ts => ({
        ...ts,
        task: tasks.find(t => t.id === ts.taskId)
      })) as any;
    }
    
    return result;
  },

  findUnique: (id: string): Timesheet | null => {
    const { timesheets } = getData();
    return timesheets.find(t => t.id === id) || null;
  },

  create: (data: {
    taskId: string;
    title?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    notes?: string;
  }): Timesheet => {
    const appData = getData();
    const now = new Date().toISOString();
    
    const timesheet: Timesheet = {
      id: generateId(),
      taskId: data.taskId,
      title: data.title || null,
      startTime: data.startTime,
      endTime: data.endTime || null,
      duration: data.duration || null,
      notes: data.notes || null,
      createdAt: now,
    };
    
    appData.timesheets.push(timesheet);
    saveData(appData);
    return timesheet;
  },

  update: (id: string, data: {
    title?: string;
    startTime?: string;
    endTime?: string | null;
    duration?: number | null;
    notes?: string;
  }): Timesheet | null => {
    const appData = getData();
    const index = appData.timesheets.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    appData.timesheets[index] = {
      ...appData.timesheets[index],
      ...data,
    };
    
    saveData(appData);
    return appData.timesheets[index];
  },

  delete: (id: string): boolean => {
    const appData = getData();
    const initialLength = appData.timesheets.length;
    appData.timesheets = appData.timesheets.filter(t => t.id !== id);
    saveData(appData);
    return appData.timesheets.length < initialLength;
  },
};

// ============ UTILIDADES ============
export const storageUtils = {
  // Exportar todos los datos
  export: (): AppData => getData(),
  
  // Importar datos (sobrescribe todo)
  import: (data: AppData): void => saveData(data),
  
  // Limpiar todos los datos
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
  
  // Seed con datos de ejemplo
  seed: (): void => {
    const now = new Date();
    
    const projects: Project[] = [
      {
        id: generateId(),
        name: 'Proyecto Demo',
        description: 'Proyecto de ejemplo para probar la app',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
    ];
    
    const tasks: Task[] = [
      {
        id: generateId(),
        title: 'Tarea de ejemplo',
        description: 'Descripción de la tarea',
        status: 'PENDING',
        projectId: projects[0].id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
    ];
    
    saveData({ projects, tasks, timesheets: [] });
  },
};
