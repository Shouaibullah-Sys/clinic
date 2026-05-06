import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Doctor access required" },
        { status: 403 }
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: user.id,
        status: { notIn: ["cancelled", "no-show"] },
      },
      select: {
        patientId: true,
      },
    });

    const patientIds = [...new Set(appointments.map((a) => a.patientId))];

    if (patientIds.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    const patients = await prisma.patient.findMany({
      where: {
        id: { in: patientIds },
        active: true,
      },
      select: {
        id: true,
        patientId: true,
        name: true,
        phone: true,
        guardian: true,
        dateOfBirth: true,
        gender: true,
        bloodGroup: true,
        allergies: true,
        emergencyContact: true,
        address: true,
      },
    });

    const patientsWithDetails = await Promise.all(
      patients.map(async (patient) => {
        const lastAppointment = await prisma.appointment.findFirst({
          where: {
            doctorId: user.id,
            patientId: patient.id,
            status: { notIn: ["cancelled", "no-show"] },
          },
          orderBy: { startTime: "desc" },
          select: { startTime: true },
        });

        const totalVisits = await prisma.appointment.count({
          where: {
            doctorId: user.id,
            patientId: patient.id,
            status: { notIn: ["cancelled", "no-show"] },
          },
        });

        return {
          _id: patient.id,
          patientId: patient.patientId,
          name: patient.name,
          phone: patient.phone,
          guardian: patient.guardian,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          allergies: patient.allergies,
          emergencyContact: patient.emergencyContact,
          address: patient.address,
          lastVisit: lastAppointment?.startTime || null,
          totalVisits,
        };
      })
    );

    patientsWithDetails.sort((a, b) => {
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
    });

    return NextResponse.json({
      success: true,
      data: patientsWithDetails,
      count: patientsWithDetails.length,
    });
  } catch (error: any) {
    console.error("Error fetching doctor patients:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}