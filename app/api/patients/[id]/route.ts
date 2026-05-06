import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";

const calculateAge = (dateOfBirth: Date): number => {
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const userId = auth.userId as string;
    const userRole = auth.userRole as string;
    const userName = auth.userName as string;
    const allowedRoles = ["admin", "doctor", "nurse", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access patient data.",
        },
        { status: 403 },
      );
    }

    const { id: patientId } = await params;

    console.log(
      `Fetching patient data for ID: ${patientId} by user: ${auth.userRole} ${auth.userName}`,
    );

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        patientId: true,
        name: true,
        phone: true,
        email: true,
        guardian: true,
        refPerson: true,
        passTskNo: true,
        registrationNo: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        emergencyContact: true,
        bloodGroup: true,
        allergies: true,
        medicalHistory: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

    if (auth.userRole === "doctor") {
      console.log(
        `Doctor access check: userRole=${auth.userRole}, userId=${auth.userId}, patientId=${patientId}`,
      );
      const hasAccess = await prisma.appointment.findFirst({
        where: {
          patientId: patientId,
          doctorId: auth.userId,
          status: { notIn: ["cancelled", "no-show"] },
        },
      });
      console.log(`Doctor access check result: hasAccess=${hasAccess}`);

      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden. You can only access patients you have treated.",
          },
          { status: 403 },
        );
      }
    }

    const [appointments, medicalRecords, prescriptions, labTests] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId: patientId,
          ...(auth.userRole === "doctor" ? { doctorId: auth.userId } : {}),
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 20,
      }),
      prisma.medicalRecord.findMany({
        where: { patientId: patientId },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.prescription.findMany({
        where: { patientId: patientId },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.labTest.findMany({
        where: { patientId: patientId, status: { not: "cancelled" } },
        orderBy: { sampleCollected: "desc" },
        take: 10,
      }),
    ]);

    const [totalAppointments, completedAppointments, upcomingAppointments, totalPrescriptions, totalLabTests] = await Promise.all([
      prisma.appointment.count({
        where: { patientId: patientId, status: { notIn: ["cancelled", "no-show"] } },
      }),
      prisma.appointment.count({
        where: { patientId: patientId, status: "completed" },
      }),
      prisma.appointment.count({
        where: {
          patientId: patientId,
          status: { in: ["scheduled", "confirmed"] },
          date: { gte: new Date() },
        },
      }),
      prisma.prescription.count({ where: { patientId: patientId } }),
      prisma.labTest.count({ where: { patientId: patientId, status: { not: "cancelled" } } }),
    ]);

    const responseData = {
      patient: {
        ...patient,
        age,
        fullAddress: patient.address || null,
      },
      statistics: {
        totalAppointments,
        completedAppointments,
        upcomingAppointments,
        totalPrescriptions,
        totalLabTests,
        lastVisit: appointments.length > 0 ? appointments[0].date : null,
      },
      appointments: appointments.map((apt) => ({
        id: apt.id,
        appointmentId: apt.appointmentId,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        duration: apt.duration,
        status: apt.status,
        reason: apt.reason,
        priority: apt.priority,
        doctorId: apt.doctorId,
        notes: apt.notes,
        checkInTime: apt.checkInTime,
        checkOutTime: apt.checkOutTime,
      })),
      medicalRecords: medicalRecords.map((record) => ({
        id: record.id,
        recordId: record.recordId,
        visitDate: record.date,
        doctorId: record.doctorId,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        notes: record.notes,
        vitalSigns: record.vitals,
        followUpDate: record.nextVisit,
        createdBy: record.createdById,
      })),
      prescriptions: prescriptions.map((pres) => ({
        id: pres.id,
        prescriptionId: pres.prescriptionId,
        prescribedDate: pres.date,
        doctorId: pres.doctorId,
        medications: pres.medications,
        instructions: pres.instructions,
        status: pres.status,
        expiryDate: pres.expiryDate,
      })),
      labTests: labTests.map((test) => ({
        id: test.id,
        testId: test.testId,
        testName: test.tests,
        category: test.category,
        orderedAt: test.sampleCollected ? test.sampleDate : test.createdAt,
        status: test.status,
        collectionStatus: test.sampleCollected ? "collected" : "pending",
        doctorId: test.createdById,
        orderedBy: test.createdById,
        results: test.results,
        priority: test.priority,
      })),
      vitalSignsHistory: [],
      permissions: {
        canEdit: auth.userRole === "admin" || auth.userRole === "receptionist",
        canAddMedicalRecord:
          auth.userRole === "admin" ||
          auth.userRole === "doctor" ||
          auth.userRole === "nurse",
        canWritePrescription:
          auth.userRole === "admin" || auth.userRole === "doctor",
        canOrderLabTest:
          auth.userRole === "admin" || auth.userRole === "doctor",
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching patient data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch patient data",
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = ["admin", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only admin and receptionist can update patient information.",
        },
        { status: 403 },
      );
    }

    const { id: patientId } = await params;
    const body = await request.json();

    console.log(
      `Updating patient ${patientId} by ${auth.userRole} ${auth.userName}`,
    );

    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!existingPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const allowedFields = [
      "name",
      "phone",
      "email",
      "dateOfBirth",
      "gender",
      "maritalStatus",
      "occupation",
      "emergencyContact",
      "address",
      "bloodGroup",
      "allergies",
      "chronicConditions",
      "currentMedications",
      "familyHistory",
      "lifestyle",
      "insurance",
      "primaryPhysician",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.phone !== undefined) {
      const cleanPhone =
        typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
      updateData.phone = cleanPhone || undefined;
    }

    if (body.address !== undefined) {
      updateData.address = body.address;
    }

    if (body.emergencyContact !== undefined) {
      updateData.emergencyContact = body.emergencyContact;
    }

    if (body.insurance !== undefined) {
      updateData.insurance = body.insurance;
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        patientId: true,
        name: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        emergencyContact: true,
        bloodGroup: true,
        allergies: true,
        medicalHistory: true,
        active: true,
      },
    });

    await createAuditLog({
      action: "UPDATE_PATIENT",
      entityType: "Patient",
      entityId: patientId,
      userId: auth.userId,
      userRole: auth.userRole,
      userName: auth.userName,
      changes: updateData,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: "Patient information updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (auth.userRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only administrators can delete patients.",
        },
        { status: 403 },
      );
    }

    const { id: patientId } = await params;

    console.log(`Deleting patient ${patientId} by admin ${auth.userName}`);

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const activeAppointments = await prisma.appointment.count({
      where: {
        patientId: patientId,
        status: { in: ["scheduled", "confirmed", "checked-in"] },
      },
    });

    if (activeAppointments > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete patient with active appointments. Please cancel all appointments first.",
        },
        { status: 400 },
      );
    }

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        active: false,
      },
    });

    await createAuditLog({
      action: "DELETE_PATIENT",
      entityType: "Patient",
      entityId: patientId,
      userId: auth.userId,
      userRole: auth.userRole,
      userName: auth.userName,
      changes: { active: false },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      message: "Patient marked as inactive successfully",
    });
  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete patient" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = ["admin", "receptionist", "doctor"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update patient information.",
        },
        { status: 403 },
      );
    }

    const { id: patientId } = await params;
    const body = await request.json();

    console.log(
      `Partial update for patient ${patientId} by ${auth.userRole} ${auth.userName}`,
    );

    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!existingPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    let allowedFields: string[] = [];

    if (auth.userRole === "admin" || auth.userRole === "receptionist") {
      allowedFields = [
        "phone",
        "email",
        "emergencyContact",
        "address",
        "insurance",
      ];
    } else if (auth.userRole === "doctor") {
      allowedFields = [
        "allergies",
        "chronicConditions",
        "currentMedications",
        "familyHistory",
      ];
    }

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.phone !== undefined) {
      const cleanPhone =
        typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
      updateData.phone = cleanPhone || undefined;
    }

    if (body.allergies && Array.isArray(body.allergies)) {
      updateData.allergies = body.allergies;
    }

    if (body.chronicConditions && Array.isArray(body.chronicConditions)) {
      updateData.chronicConditions = body.chronicConditions;
    }

    if (body.currentMedications && Array.isArray(body.currentMedications)) {
      updateData.currentMedications = body.currentMedications;
    }

    if (body.familyHistory && Array.isArray(body.familyHistory)) {
      updateData.familyHistory = body.familyHistory;
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        patientId: true,
        name: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        emergencyContact: true,
        bloodGroup: true,
        allergies: true,
        medicalHistory: true,
        active: true,
      },
    });

    await createAuditLog({
      action: "UPDATE_PATIENT_PARTIAL",
      entityType: "Patient",
      entityId: patientId,
      userId: auth.userId,
      userRole: auth.userRole,
      userName: auth.userName,
      changes: updateData,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: "Patient information updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 },
    );
  }
}