import prisma from "@/app/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ErrorProps } from "next/error";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Crear un objeto vacío que seguirá la estructura de Prisma.InvoiceFindManyArgs
    const queryOptions: Prisma.InvoiceFindManyArgs = {};

    // Iterar sobre los parámetros de búsqueda y mapearlos a las opciones de Prisma
    searchParams.forEach((value, key) => {
      if (key in queryOptions) {
        // Si la clave ya existe en el objeto (por ejemplo, `where`), lo combinamos
        queryOptions[key as keyof Prisma.InvoiceFindManyArgs] =
          JSON.parse(value);
      } else {
        // Agregar el nuevo valor parseado
        queryOptions[key as keyof Prisma.InvoiceFindManyArgs] =
          JSON.parse(value);
      }
    });

    const data = await prisma.invoice.findMany(queryOptions);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error:", error);
    const errorResponse: ErrorProps = {
      statusCode: 500,
      title: "Error getting the invoices",
    };

    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
