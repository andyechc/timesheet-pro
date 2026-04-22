import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/timesheets/[id] - Obtener timesheet específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
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
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(timesheet);
  } catch (error) {
    console.error("Error fetching timesheet:", error);
    return NextResponse.json(
      { error: "Error al obtener timesheet" },
      { status: 500 }
    );
  }
}

// PATCH /api/timesheets/[id] - Actualizar timesheet (detener timer)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, endTime, duration, notes } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (endTime) data.endTime = new Date(endTime);
    if (duration !== undefined) data.duration = duration;
    if (notes !== undefined) data.notes = notes;

    const timesheet = await prisma.timesheet.update({
      where: { id: params.id },
      data,
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
    });

    return NextResponse.json(timesheet);
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return NextResponse.json(
      { error: "Error al actualizar timesheet" },
      { status: 500 }
    );
  }
}

// DELETE /api/timesheets/[id] - Eliminar timesheet
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.timesheet.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Timesheet eliminado" });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return NextResponse.json(
      { error: "Error al eliminar timesheet" },
      { status: 500 }
    );
  }
}
