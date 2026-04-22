# Timesheet Pro

Aplicación de gestión de proyectos centrada en el rastreo preciso de horas mediante Timesheets dinámicos. Permite medir exactamente cuánto tiempo se invierte en cada tarea y exportar la data para facturación o reportes mensuales.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes (Serverless) |
| **Base de Datos** | PostgreSQL + Prisma ORM |
| **Estado Global** | Zustand (Timer) |
| **Exportación** | SheetJS (XLSX) |
| **Iconos** | Lucide React |

## Esquema de Base de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                      HIERARCHY                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │  PROJECTS   │──────│    TASKS    │──────│ TIMESHEETS  │ │
│  │             │ 1:M  │             │ 1:M  │             │ │
│  │ • id (PK)    │──────│ • id (PK)    │──────│ • id (PK)    │ │
│  │ • name       │      │ • title      │      │ • taskId(FK)│ │
│  │ • description│      │ • status     │      │ • startTime │ │
│  │ • client     │      │ • dueDate    │      │ • endTime   │ │
│  │ • deadline   │      │ • projectId  │      │ • duration  │ │
│  │ • createdAt  │      │ • createdAt  │      │ • notes     │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Enum: TaskStatus
- `PENDING` - Pendiente
- `IN_PROGRESS` - En Proceso
- `COMPLETED` - Completada

## Características Principales

### 1. Sistema de Tracking (Core)
- **Single Source of Truth**: Solo un cronómetro puede estar activo globalmente
- Botón Play/Stop por tarea con contador en tiempo real
- Si se inicia un timer en otra tarea, el anterior se pausa automáticamente
- Cada sesión grabada genera una entrada con: Fecha, Hora inicio, Hora fin, Duración

### 2. Gestión de Fechas y Calendario
- Visualización de tareas por fechas de entrega
- Capacidad de editar manualmente registros de tiempo (por si se olvidó darle Play)

### 3. Exportación a Excel
- Reporte mensual filtrable por proyecto
- Formato: Proyecto | Tarea | Fecha | Horas Totales | Notas
- **Gran Total** al final del reporte para facilitar facturación

### 4. UI/UX
- Diseño minimalista con "squircles" en botones
- Sombras suaves para diferenciar tarjetas
- No flat design tradicional
- Optimizado para flujo de trabajo rápido

## Instalación

```bash
# 1. Clonar o crear proyecto
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL de PostgreSQL

# 3. Generar cliente Prisma y migrar DB
npx prisma generate
npx prisma db push

# 4. (Opcional) Cargar datos de ejemplo
npm run db:seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

```env
DATABASE_URL="postgresql://user:password@localhost:5432/timesheet_pro?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Construir para producción |
| `npm run db:generate` | Generar cliente Prisma |
| `npm run db:push` | Sincronizar esquema con base de datos |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:seed` | Cargar datos de ejemplo |

## Estructura del Proyecto

```
├── app/
│   ├── api/               # API Routes
│   │   ├── projects/      # CRUD Proyectos
│   │   ├── tasks/         # CRUD Tareas
│   │   ├── timesheets/    # CRUD Timesheets
│   │   └── reports/       # Exportación
│   ├── projects/[id]/     # Página de proyecto
│   ├── page.tsx           # Dashboard
│   ├── layout.tsx         # Layout raíz
│   └── globals.css        # Estilos globales + Tailwind
├── components/            # Componentes React
│   ├── timer-button.tsx   # Botón Play/Pause/Stop
│   ├── timer-display.tsx  # Visualización del timer
│   ├── task-card.tsx      # Tarjeta de tarea
│   ├── project-card.tsx   # Tarjeta de proyecto
│   ├── timesheet-list.tsx # Lista de registros
│   ├── manual-entry-modal.tsx
│   └── export-button.tsx
├── lib/
│   ├── prisma.ts          # Cliente Prisma
│   ├── utils.ts           # Utilidades
│   └── export-excel.ts    # Lógica de exportación
├── store/
│   └── timer-store.ts     # Estado global del timer (Zustand)
├── prisma/
│   └── schema.prisma      # Esquema de base de datos
└── public/                # Assets estáticos
```

## Flujo del Timer (Single Source of Truth)

```typescript
// Ejemplo de la lógica que garantiza un solo timer activo
startTimer: (taskId, projectId, timesheetId) => {
  const state = get();
  
  // Si hay un timer activo en otra tarea, detenerlo primero
  if (state.activeTaskId && state.activeTaskId !== taskId && state.isRunning) {
    const previousTask = {
      taskId: state.activeTaskId,
      timesheetId: state.timesheetId!,
      duration: state.elapsedSeconds,
    };
    // Iniciar nuevo timer
    set({ activeTaskId: taskId, projectId, timesheetId, ... });
    return previousTask; // Para que el llamador maneje la tarea anterior
  }
  
  // Iniciar nuevo timer limpio
  set({ activeTaskId: taskId, ... });
  return null;
}
```

## Exportación Excel

```typescript
// La función generateMonthlyReport crea filas con:
// - Proyecto, Cliente, Tarea, Fecha, Hora Inicio, Hora Fin
// - Horas Decimales (para cálculos)
// - Duración Formateada (legible)
// - Fila de Gran Total al final
```

## Diseño UI

- **Squircle buttons**: `rounded-squircle (1.5rem)` con animación de pulso cuando está activo
- **Sombras suaves**: `shadow-soft` y `shadow-soft-lg` para profundidad
- **Colores**: Paleta primary (azul) para acciones, emerald para éxito, amber para advertencias
- **Tipografía**: Tabular nums en displays de tiempo para evitar saltos

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/projects` | Listar proyectos |
| POST | `/api/projects` | Crear proyecto |
| GET | `/api/projects/[id]` | Obtener proyecto |
| PATCH | `/api/projects/[id]` | Actualizar proyecto |
| DELETE | `/api/projects/[id]` | Eliminar proyecto |
| GET | `/api/tasks` | Listar tareas |
| POST | `/api/tasks` | Crear tarea |
| GET | `/api/tasks/[id]` | Obtener tarea |
| PATCH | `/api/tasks/[id]` | Actualizar tarea |
| DELETE | `/api/tasks/[id]` | Eliminar tarea |
| GET | `/api/timesheets` | Listar timesheets |
| POST | `/api/timesheets` | Crear timesheet |
| PATCH | `/api/timesheets/[id]` | Actualizar timesheet (detener) |
| DELETE | `/api/timesheets/[id]` | Eliminar timesheet |
| GET | `/api/reports?month=YYYY-MM` | Obtener datos para reporte |

## Licencia

MIT
