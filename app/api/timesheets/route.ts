import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/timesheets - Listar timesheets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    const where = taskId ? { taskId } : {};

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        task: {
          select: {
            title: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(timesheets);
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { error: "Error al obtener timesheets" },
      { status: 500 }
    );
  }
}

// POST /api/timesheets - Crear timesheet (iniciar o entrada manual)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, title, startTime, endTime, duration, notes } = body;

    const timesheet = await prisma.timesheet.create({
      data: {
        taskId,
        title: title || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration || null,
        notes,
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    console.error("Error creating timesheet:", error);
    return NextResponse.json(
      { error: "Error al crear timesheet" },
      { status: 500 }
    );
  }
}
