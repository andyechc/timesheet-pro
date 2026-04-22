// Cliente SQLite - SOLO PARA SERVIDOR (API Routes)
// Este archivo nunca debe ser importado desde componentes cliente

let db: any = null;
let dbType: 'bun' | 'better-sqlite3' | null = null;

async function getDb() {
  if (db) return db;
  
  // Intentar Bun SQLite primero
  // Usamos concatenación de strings para ocultar el import de Webpack
  try {
    const moduleName = ['bun', 'sqlite'].join(':');
    // @ts-ignore
    const bunModule = await import(/* webpackIgnore: true */ moduleName);
    const Database = bunModule.Database;
    db = new Database('./prisma/dev.db');
    dbType = 'bun';
    console.log('[DB] Using Bun SQLite');
    return db;
  } catch (e) {
    // Fallthrough a better-sqlite3
  }
  
  // Intentar better-sqlite3
  try {
    // @ts-ignore
    const Database = require('better-sqlite3');
    db = new Database('./prisma/dev.db');
    dbType = 'better-sqlite3';
    console.log('[DB] Using better-sqlite3');
    return db;
  } catch (e) {
    console.error('[DB] No SQLite driver available');
    throw new Error('No SQLite driver available');
  }
}

function runQuery(sql: string, params: any[] = []): any {
  const database = db;
  if (!database) throw new Error('Database not initialized');
  
  if (dbType === 'bun') {
    const stmt = database.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return stmt.all(...params);
    } else {
      return stmt.run(...params);
    }
  } else {
    const stmt = database.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return params.length > 0 ? stmt.all(...params) : stmt.all();
    } else {
      return stmt.run(...params);
    }
  }
}

function runGet(sql: string, params: any[] = []): any {
  const database = db;
  if (!database) throw new Error('Database not initialized');
  
  const stmt = database.prepare(sql);
  return stmt.get(...params);
}

// Inicializar DB al cargar el módulo (solo en servidor)
async function initDb() {
  if (typeof window === 'undefined') {
    await getDb();
  }
}

// Solo inicializar si estamos en el servidor
if (typeof window === 'undefined') {
  initDb().catch(console.error);
}

export const prisma = {
  project: {
    findMany: async (opts?: any) => {
      await getDb();
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
      await getDb();
      const project = runGet("SELECT * FROM projects WHERE id = ?", [opts.where.id]);
      if (!project) return null;
      
      project.tasks = runQuery("SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt DESC", [project.id]);
      
      for (const task of project.tasks) {
        task.timesheets = runQuery("SELECT * FROM timesheets WHERE taskId = ? ORDER BY startTime DESC", [task.id]);
      }
      
      return project;
    },
    
    create: async (opts: any) => {
      await getDb();
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
      await getDb();
      const { name, description } = opts.data;
      const now = new Date().toISOString();
      
      runQuery(
        "UPDATE projects SET name = ?, description = ?, updatedAt = ? WHERE id = ?",
        [name, description, now, opts.where.id]
      );
      
      return runGet("SELECT * FROM projects WHERE id = ?", [opts.where.id]);
    },
    
    delete: async (opts: any) => {
      await getDb();
      runQuery("DELETE FROM projects WHERE id = ?", [opts.where.id]);
      return { id: opts.where.id };
    },
  },
  
  task: {
    findMany: async (opts?: any) => {
      await getDb();
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
      await getDb();
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
      await getDb();
      const { title, description, status, projectId } = opts.data;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      runQuery(
        "INSERT INTO tasks (id, title, description, status, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, title, description || null, status || "PENDING", projectId, now, now]
      );
      
      return { id, title, description, status: status || "PENDING", projectId, createdAt: now, updatedAt: now };
    },
    
    update: async (opts: any) => {
      await getDb();
      const updates: string[] = [];
      const values: any[] = [];

      if (opts.data.title !== undefined) {
        updates.push('title = ?');
        values.push(opts.data.title);
      }
      if (opts.data.description !== undefined) {
        updates.push('description = ?');
        values.push(opts.data.description);
      }
      if (opts.data.status !== undefined) {
        updates.push('status = ?');
        values.push(opts.data.status);
      }
      
      values.push(new Date().toISOString());
      values.push(opts.where.id);
      
      runQuery(
        `UPDATE tasks SET ${updates.join(", ")}, updatedAt = ? WHERE id = ?`,
        values
      );
      
      return runGet("SELECT * FROM tasks WHERE id = ?", [opts.where.id]);
    },
    
    delete: async (opts: any) => {
      await getDb();
      runQuery("DELETE FROM tasks WHERE id = ?", [opts.where.id]);
      return { id: opts.where.id };
    },
  },
  
  timesheet: {
    findUnique: async (opts: any) => {
      await getDb();
      const row = runGet(
        `SELECT t.*, task.title as taskTitle, project.name as projectName 
         FROM timesheets t
         JOIN tasks task ON t.taskId = task.id
         JOIN projects project ON task.projectId = project.id
         WHERE t.id = ?`,
        [opts.where.id]
      );
      
      if (!row) return null;
      
      return {
        ...row,
        task: {
          title: row.taskTitle,
          project: {
            name: row.projectName
          }
        }
      };
    },
    
    findMany: async (opts?: any) => {
      await getDb();
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
      await getDb();
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
      await getDb();
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
      await getDb();
      runQuery("DELETE FROM timesheets WHERE id = ?", [opts.where.id]);
      return { id: opts.where.id };
    },
    
    deleteMany: async () => {
      await getDb();
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
