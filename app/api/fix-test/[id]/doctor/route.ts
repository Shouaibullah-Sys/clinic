import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;

    console.log(`Fixing doctor for test: ${testId}`);

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    let doctorToAssign = test.orderedById;

    if (doctorToAssign) {
      const orderedByUser = await prisma.user.findUnique({
        where: { id: doctorToAssign },
      });
      if (!orderedByUser || orderedByUser.role !== "doctor") {
        doctorToAssign = null;
      }
    }

    if (!doctorToAssign) {
      const anyDoctor = await prisma.user.findFirst({
        where: { role: "doctor", active: true },
      });
      if (anyDoctor) {
        doctorToAssign = anyDoctor.id;
        console.log("Found random doctor:", anyDoctor.name);
      }
    }

    if (!doctorToAssign) {
      return NextResponse.json({ 
        error: "No doctor found. Please create a doctor user first." 
      }, { status: 400 });
    }

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: { doctorId: doctorToAssign },
      include: {
        doctor: { select: { name: true } },
        patient: { select: { name: true, patientId: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Test doctor fixed successfully",
      data: {
        testId: updatedTest.testId,
        doctor: updatedTest.doctor,
        patient: updatedTest.patient,
      },
    });

  } catch (error: any) {
    console.error("Error fixing test:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}