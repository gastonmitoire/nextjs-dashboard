import prisma from "@/app/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { ErrorProps } from "next/error";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await prisma.revenue.findMany();

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error:", error);
    const errorResponse: ErrorProps = {
      statusCode: 500,
      title: "Error getting the revenues",
    };

    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
