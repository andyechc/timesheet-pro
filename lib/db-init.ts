// Script para inicializar la base de datos SQLite
// Crear tablas si no existen

async function initDb() {
  // @ts-ignore
  const { Database } = await import('bun:sqlite');
  const db = new Database('./prisma/dev.db');
  
  console.log('[DB Init] Creating tables...');
  
  // Create projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  
  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      projectId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  // Create timesheets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      title TEXT,
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
  
  // Insert sample data if empty
  const projectCount = db.query("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  
  if (projectCount.count === 0) {
    console.log('[DB Init] Inserting sample data...');
    
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();
    const taskId = crypto.randomUUID();
    const timesheetId = crypto.randomUUID();
    
    db.prepare("INSERT INTO projects (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)")
      .run(projectId, 'Proyecto de Ejemplo', 'Un proyecto de prueba', now, now);
    
    db.prepare("INSERT INTO tasks (id, title, description, status, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(taskId, 'Tarea Principal', 'Descripción de la tarea', 'PENDING', projectId, now, now);
    
    db.prepare("INSERT INTO timesheets (id, taskId, title, startTime, endTime, duration, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(timesheetId, taskId, 'Sesión de trabajo', now, now, 3600, 'Notas de la sesión', now, now);
    
    console.log('[DB Init] Sample data inserted');
  }
  
  db.close();
  console.log('[DB Init] Done!');
}

// Run if executed directly
if (require.main === module) {
  initDb().catch(console.error);
}

export { initDb };
