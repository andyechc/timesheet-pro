import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Limpiar datos existentes
  await prisma.timesheet.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();

  // Crear proyectos de ejemplo
  const project1 = await prisma.project.create({
    data: {
      name: "E-commerce Platform",
      description: "Desarrollo de plataforma de comercio electrónico con integración de pagos",
      tasks: {
        create: [
          {
            title: "Setup del proyecto y configuración inicial",
            description: "Configurar repositorio, CI/CD y ambiente de desarrollo",
            status: "COMPLETED",
          },
          {
            title: "Diseño de base de datos",
            description: "Modelar esquema de productos, usuarios, órdenes y pagos",
            status: "COMPLETED",
          },
          {
            title: "Implementar autenticación",
            description: "Login, registro, recuperación de contraseña con JWT",
            status: "IN_PROGRESS",
          },
          {
            title: "Catálogo de productos",
            description: "Listado, filtros, búsqueda y detalle de productos",
            status: "PENDING",
          },
          {
            title: "Carrito de compras",
            description: "Agregar/quitar productos, calcular totales, persistencia",
            status: "PENDING",
          },
        ],
      },
    },
    include: { tasks: true },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App - Delivery",
      description: "Aplicación móvil para servicio de delivery de comida",
      tasks: {
        create: [
          {
            title: "Wireframes y prototipos",
            description: "Diseño de UX/UI en Figma",
            status: "COMPLETED",
          },
          {
            title: "Setup React Native",
            description: "Configurar proyecto con Expo y TypeScript",
            status: "IN_PROGRESS",
          },
          {
            title: "Integración con mapas",
            description: "Mostrar restaurantes cercanos y seguimiento de pedidos",
            status: "PENDING",
          },
        ],
      },
    },
    include: { tasks: true },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Dashboard Analytics",
      description: "Panel de administración con métricas y reportes",
      tasks: {
        create: [
          {
            title: "Análisis de requerimientos",
            description: "Entrevistas con stakeholders y documentación",
            status: "COMPLETED",
          },
          {
            title: "Diseño de componentes",
            description: "Sistema de diseño con Storybook",
            status: "IN_PROGRESS",
          },
        ],
      },
    },
    include: { tasks: true },
  });

  // Crear timesheets de ejemplo para algunas tareas completadas
  const completedTasks = [
    ...project1.tasks.filter((t) => t.status === "COMPLETED"),
    ...project2.tasks.filter((t) => t.status === "COMPLETED"),
  ];

  for (const task of completedTasks) {
    // Crear 2-3 sesiones de trabajo por tarea completada
    const sessions = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < sessions; i++) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - i * 2);
      startTime.setHours(9 + Math.floor(Math.random() * 4), 0, 0);

      const duration = (Math.floor(Math.random() * 4) + 2) * 3600; // 2-6 horas en segundos
      const endTime = new Date(startTime.getTime() + duration * 1000);

      await prisma.timesheet.create({
        data: {
          taskId: task.id,
          title: `Sesión ${i + 1} - ${task.title.substring(0, 30)}`,
          startTime,
          endTime,
          duration,
          notes: `Trabajo completado en sesión ${i + 1}`,
        },
      });
    }
  }

  // Crear un timesheet activo (sin endTime) para demostración
  const inProgressTask = project1.tasks.find(
    (t) => t.status === "IN_PROGRESS"
  );
  if (inProgressTask) {
    await prisma.timesheet.create({
      data: {
        taskId: inProgressTask.id,
        title: `En progreso - ${inProgressTask.title.substring(0, 30)}`,
        startTime: new Date(Date.now() - 45 * 60 * 1000), // Iniciado hace 45 minutos
        notes: "Trabajando en implementación",
      },
    });
  }

  console.log("✅ Seed completed!");
  console.log(`   Projects: 3`);
  console.log(`   Tasks: ${project1.tasks.length + project2.tasks.length + project3.tasks.length}`);
  console.log(`   Timesheets: ${await prisma.timesheet.count()}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
