import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reports - Obtener datos para reportes Excel
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // Formato: "2024-01"
    const projectId = searchParams.get("projectId");

    // Construir filtro de fecha
    let dateFilter = {};
    if (month) {
      const [year, monthNum] = month.split("-");
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      dateFilter = {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Construir filtro de proyecto
    let projectFilter = {};
    if (projectId) {
      projectFilter = {
        task: {
          projectId,
        },
      };
    }

    const timesheets = await prisma.timesheet.findMany({
      where: {
        endTime: { not: null }, // Solo completados
        ...dateFilter,
        ...projectFilter,
      },
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
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ timesheets });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
