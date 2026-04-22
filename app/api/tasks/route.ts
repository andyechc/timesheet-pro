import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tasks - Listar tareas (opcionalmente filtradas por proyecto)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where = projectId ? { projectId } : {};

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { name: true, client: true },
        },
        timesheets: {
          orderBy: { startTime: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Error al obtener tareas" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Crear nueva tarea
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, projectId } = body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "PENDING",
        projectId,
      },
      include: {
        project: {
          select: { name: true, client: true },
        },
        timesheets: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Error al crear tarea" },
      { status: 500 }
    );
  }
}
