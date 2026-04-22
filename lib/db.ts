// Cliente SQLite usando solo APIs nativas de Node.js/Bun
// Compatible con Next.js API routes

// Usamos eval para evitar que el bundler de Next.js procese el import
let sqlite3: any;

try {
  // Intentar cargar sqlite3 dinámicamente
  sqlite3 = require('sqlite3');
} catch (e) {
  // Fallback: usar SQLite de Bun si está disponible
  try {
    const { Database } = require('bun:sqlite');
    sqlite3 = { Database };
  } catch (e2) {
    console.error('No SQLite driver available');
  }
}

let db: any = null;

function getDb() {
  if (!db && sqlite3) {
    if (sqlite3.Database) {
      // Bun SQLite
      db = new sqlite3.Database('./prisma/dev.db');
    }
  }
  return db;
}

// Helper para ejecutar queries
function runQuery(sql: string, params: any[] = []): any {
  const database = getDb();
  if (!database) throw new Error('Database not available');
  
  const stmt = database.prepare(sql);
  if (sql.trim().toLowerCase().startsWith('select')) {
    return stmt.all(...params);
  } else {
    return stmt.run(...params);
  }
}

function runGet(sql: string, params: any[] = []): any {
  const database = getDb();
  if (!database) throw new Error('Database not available');
  
  const stmt = database.prepare(sql);
  return stmt.get(...params);
}

export const prisma = {
  project: {
    findMany: async (opts?: any) => {
      const projects = runQuery("SELECT * FROM projects ORDER BY createdAt DESC");
      
      if (opts?.include?.tasks) {
        for (const project of projects) {
          project.tasks = runQuery("SELECT * FROM tasks WHERE projectId = ?", [project.id]);
          
          if (opts.include.tasks.include?.timesheets) {
            for (const task of project.tasks) {
              task.timesheets = runQuery("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC", [task.id]);
            }
          }
        }
      }
      
      return projects;
    },
    
    findUnique: async (opts: any) => {
      const project = runGet("SELECT * FROM projects WHERE id = ?", [opts.where.id]);
      if (!project) return null;
      
      project.tasks = runQuery("SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt DESC", [project.id]);
      
      for (const task of project.tasks) {
        task.timesheets = runQuery("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC", [task.id]);
      }
      
      return project;
    },
    
    create: async (opts: any) => {
      const { name, description } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      runQuery(
        "INSERT INTO projects (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        [id, name, description || null, now, now]
      );
      
      return { id, name, description, createdAt: now, updatedAt: now, tasks: [] };
    },
    
    update: async (opts: any) => {
      const { name, description } = opts.data;
      const now = new Date().toISOString();
      
      runQuery(
        "UPDATE projects SET name = ?, description = ?, updatedAt = ? WHERE id = ?",
        [name, description, now, opts.where.id]
      );
      
      return runGet("SELECT * FROM projects WHERE id = ?", [opts.where.id]);
    },
    
    delete: async (opts: any) => {
      runQuery("DELETE FROM projects WHERE id = ?", [opts.where.id]);
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
      
      const tasks = runQuery(sql, params);
      
      if (opts?.include?.timesheets) {
        for (const task of tasks) {
          task.timesheets = runQuery("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC", [task.id]);
        }
      }
      
      return tasks;
    },
    
    findUnique: async (opts: any) => {
      const task = runGet("SELECT * FROM tasks WHERE id = ?", [opts.where.id]);
      if (!task) return null;
      
      if (opts?.include?.timesheets) {
        task.timesheets = runQuery("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC", [task.id]);
      }
      
      if (opts?.include?.project) {
        task.project = runGet("SELECT * FROM projects WHERE id = ?", [task.projectId]);
      }
      
      return task;
    },
    
    create: async (opts: any) => {
      const { title, description, status, dueDate, projectId } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      runQuery(
        "INSERT INTO tasks (id, title, description, status, dueDate, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, title, description || null, status || "PENDING", dueDate || null, projectId, now, now]
      );
      
      return { id, title, description, status: status || "PENDING", dueDate, projectId, createdAt: now, updatedAt: now };
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
      
      runQuery(
        `UPDATE tasks SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`,
        params
      );
      
      return runGet("SELECT * FROM tasks WHERE id = ?", [opts.where.id]);
    },
    
    delete: async (opts: any) => {
      runQuery("DELETE FROM tasks WHERE id = ?", [opts.where.id]);
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
      
      const rows = runQuery(sql, params);
      
      return rows.map((row: any) => ({
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
      
      runQuery(
        "INSERT INTO timesheets (id, taskId, title, startTime, endTime, duration, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, taskId, title || null, startTime.toISOString(), endTime?.toISOString() || null, duration || null, notes || null, now, now]
      );
      
      return { id, taskId, title, startTime, endTime, duration, notes, createdAt: now, updatedAt: now };
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
      
      runQuery(
        `UPDATE timesheets SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`,
        params
      );
      
      return runGet("SELECT * FROM timesheets WHERE id = ?", [opts.where.id]);
    },
    
    delete: async (opts: any) => {
      runQuery("DELETE FROM timesheets WHERE id = ?", [opts.where.id]);
      return { id: opts.where.id };
    },
    
    deleteMany: async () => {
      runQuery("DELETE FROM timesheets");
      return { count: 0 };
    },
  },
  
  $disconnect: async () => {
    if (db) {
      db.close();
      db = null;
    }
  },
};
