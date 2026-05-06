import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

const canAccessLaboratory = (role: string | undefined) => {
  return ["admin", "doctor", "lab_technician", "receptionist"].includes(role || "");
};

const calculateAge = (dateOfBirth: Date | null): number => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;

    console.log(`Fetching lab test info for ID: ${testId}`);

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: true,
        orderedBy: true,
        doctor: true,
        appointment: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    let doctorInfo = { name: "Doctor Not Assigned" };
    
    if (test.doctor?.name) {
      doctorInfo = { name: test.doctor.name };
    } else if (test.orderedBy?.role === "doctor") {
      doctorInfo = { name: test.orderedBy.name };
    } else if (test.appointment?.id) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: test.appointmentId! },
        include: { doctor: true },
      });
      if (appointment?.doctor?.name) {
        doctorInfo = { name: appointment.doctor.name };
      }
    }

    let patientAge = null;
    if (test.patient?.dateOfBirth) {
      patientAge = calculateAge(test.patient.dateOfBirth);
    }

    const charges = JSON.parse(test.charges || "{}");

    const responseData = {
      ...test,
      id: test.id,
      doctor: doctorInfo,
      patient: {
        id: test.patient?.id,
        name: test.patient?.name || "Unknown Patient",
        patientId: test.patient?.patientId || "N/A",
        phone: test.patient?.phone,
        dateOfBirth: test.patient?.dateOfBirth || null,
        age: patientAge,
        gender: test.patient?.gender,
      },
      collectionStatus: test.collectionStatus || "pending",
      charges: charges || {
        paymentStatus: "pending",
        paid: 0,
        due: 0,
      },
      priority: test.priority || "routine",
      status: test.status || "pending",
    };

    console.log("Final response data:", {
      doctor: responseData.doctor,
      patient: {
        name: responseData.patient.name,
        age: responseData.patient.age,
        patientId: responseData.patient.patientId
      }
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("Error fetching test info for collection:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch test information"
      },
      { status: 500 }
    );
  }
}