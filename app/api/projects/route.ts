import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projects - Listar proyectos
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          include: { timesheets: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error al obtener proyectos" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Crear nuevo proyecto
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
      },
      include: {
        tasks: {
          include: { timesheets: true },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error al crear proyecto" },
      { status: 500 }
    );
  }
}
