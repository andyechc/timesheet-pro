// Cliente SQLite manual para evitar problemas con Prisma + Bun
import Database from "better-sqlite3";

const db = new Database("./prisma/dev.db");

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON");

export const prisma = {
  project: {
    findMany: async (opts?: any) => {
      const stmt = db.prepare("SELECT * FROM projects ORDER BY createdAt DESC");
      const projects = stmt.all() as any[];
      
      // Include tasks if requested
      if (opts?.include?.tasks) {
        for (const project of projects) {
          const taskStmt = db.prepare("SELECT * FROM tasks WHERE projectId = ?");
          project.tasks = taskStmt.all(project.id);
          
          if (opts.include.tasks.include?.timesheets) {
            for (const task of project.tasks) {
              const tsStmt = db.prepare("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC");
              task.timesheets = tsStmt.all(task.id);
            }
          }
        }
      }
      
      return projects;
    },
    
    findUnique: async (opts: any) => {
      const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
      const project = stmt.get(opts.where.id) as any;
      
      if (!project) return null;
      
      // Include tasks
      const taskStmt = db.prepare("SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt DESC");
      project.tasks = taskStmt.all(project.id);
      
      // Include timesheets for each task
      for (const task of project.tasks) {
        const tsStmt = db.prepare("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC");
        task.timesheets = tsStmt.all(task.id);
      }
      
      return project;
    },
    
    create: async (opts: any) => {
      const { name, description } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      db.prepare(
        "INSERT INTO projects (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
      ).run(id, name, description || null, now, now);
      
      return { id, name, description, createdAt: now, updatedAt: now, tasks: [] };
    },
    
    update: async (opts: any) => {
      const { name, description } = opts.data;
      const now = new Date().toISOString();
      
      db.prepare(
        "UPDATE projects SET name = ?, description = ?, updatedAt = ? WHERE id = ?"
      ).run(name, description, now, opts.where.id);
      
      const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
      return stmt.get(opts.where.id);
    },
    
    delete: async (opts: any) => {
      db.prepare("DELETE FROM projects WHERE id = ?").run(opts.where.id);
      return { id: opts.where.id };
    },
  },
  
  task: {
    findMany: async (opts?: any) => {
      let sql = "SELECT * FROM tasks";
      const params: any[] = [];
      
      if (opts?.where?.projectId) {
        sql += " WHERE projectId = ?";
        params.push(opts.where.projectId);
      }
      
      sql += " ORDER BY createdAt DESC";
      
      const stmt = db.prepare(sql);
      return params.length > 0 ? stmt.all(...params) : stmt.all();
    },
    
    create: async (opts: any) => {
      const { title, description, status, dueDate, projectId } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      db.prepare(
        "INSERT INTO tasks (id, title, description, status, dueDate, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, title, description || null, status || "PENDING", dueDate || null, projectId, now, now);
      
      return { 
        id, 
        title, 
        description, 
        status: status || "PENDING", 
        dueDate, 
        projectId, 
        createdAt: now, 
        updatedAt: now 
      };
    },
    
    update: async (opts: any) => {
      const updates: string[] = [];
      const params: any[] = [];
      
      for (const [key, value] of Object.entries(opts.data)) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
      
      params.push(new Date().toISOString());
      params.push(opts.where.id);
      
      db.prepare(
        `UPDATE tasks SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`
      ).run(...params);
      
      const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
      return stmt.get(opts.where.id);
    },
    
    delete: async (opts: any) => {
      db.prepare("DELETE FROM tasks WHERE id = ?").run(opts.where.id);
      return { id: opts.where.id };
    },
  },
  
  timesheet: {
    findMany: async (opts?: any) => {
      let sql = `SELECT t.*, task.title as taskTitle, project.name as projectName 
                 FROM timesheets t
                 JOIN tasks task ON t.taskId = task.id
                 JOIN projects project ON task.projectId = project.id`;
      const params: any[] = [];
      
      const conditions: string[] = [];
      
      if (opts?.where?.taskId) {
        conditions.push("t.taskId = ?");
        params.push(opts.where.taskId);
      }
      
      if (opts?.where?.endTime?.not === null) {
        conditions.push("t.endTime IS NOT NULL");
      }
      
      if (opts?.where?.startTime?.gte) {
        conditions.push("t.startTime >= ?");
        params.push(opts.where.startTime.gte.toISOString());
      }
      
      if (opts?.where?.startTime?.lte) {
        conditions.push("t.startTime <= ?");
        params.push(opts.where.startTime.lte.toISOString());
      }
      
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      
      sql += " ORDER BY t.startTime DESC";
      
      const stmt = db.prepare(sql);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all() as any[];
      
      // Format the results
      return rows.map(row => ({
        ...row,
        task: {
          title: row.taskTitle,
          project: {
            name: row.projectName
          }
        }
      }));
    },
    
    create: async (opts: any) => {
      const { taskId, title, startTime, endTime, duration, notes } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      db.prepare(
        "INSERT INTO timesheets (id, taskId, title, startTime, endTime, duration, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, taskId, title || null, startTime.toISOString(), endTime?.toISOString() || null, duration || null, notes || null, now, now);
      
      return { 
        id, 
        taskId, 
        title,
        startTime, 
        endTime, 
        duration, 
        notes, 
        createdAt: now, 
        updatedAt: now 
      };
    },
    
    update: async (opts: any) => {
      const updates: string[] = [];
      const params: any[] = [];
      
      for (const [key, value] of Object.entries(opts.data)) {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value instanceof Date ? value.toISOString() : value);
        }
      }
      
      params.push(new Date().toISOString());
      params.push(opts.where.id);
      
      db.prepare(
        `UPDATE timesheets SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`
      ).run(...params);
      
      const stmt = db.prepare("SELECT * FROM timesheets WHERE id = ?");
      return stmt.get(opts.where.id);
    },
    
    delete: async (opts: any) => {
      db.prepare("DELETE FROM timesheets WHERE id = ?").run(opts.where.id);
      return { id: opts.where.id };
    },
    
    deleteMany: async () => {
      db.prepare("DELETE FROM timesheets").run();
      return { count: 0 };
    },
  },
  
  $disconnect: async () => {
    db.close();
  },
};

// Helper for raw query if needed
export async function queryRaw(sql: string, params?: any[]) {
  const stmt = db.prepare(sql);
  return params ? stmt.all(...params) : stmt.all();
}
