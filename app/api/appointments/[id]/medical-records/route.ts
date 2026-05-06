// app/api/appointments/[id]/medical-records/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    const user = await getTokenPayload(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userRole = user.role;

    if (!["receptionist", "doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Insufficient permissions." },
        { status: 403 },
      );
    }

    const buildQuery = async (module: string, baseQuery: any) => {
      const { query: finalQuery } = await buildMarkedOnlyQuery({
        userId: user.id,
        module,
        baseQuery,
      });
      return finalQuery;
    };

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientId: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            bloodGroup: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            department: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    const patientId = appointment.patientId;
    const appointmentDate = new Date(appointment.date);

    const appointmentLabTestsQuery = await buildQuery("lab", {
      appointmentId,
    });
    const appointmentLabTests = await prisma.labTest.findMany({
      where: appointmentLabTestsQuery,
      select: {
        id: true,
        testId: true,
        tests: true,
        category: true,
        price: true,
        discountedPrice: true,
        status: true,
        priority: true,
        charges: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let patientLabTests = [];
    let labTestsSource: "appointment" | "patient" | "mixed" = "appointment";

    if (appointmentLabTests.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientLabTestsQuery = await buildQuery("lab", {
        patientId,
        createdAt: { gte: thirtyDaysAgo },
        status: { not: "cancelled" },
      });
      patientLabTests = await prisma.labTest.findMany({
        where: patientLabTestsQuery,
        select: {
          id: true,
          testId: true,
          tests: true,
          category: true,
          price: true,
          discountedPrice: true,
          status: true,
          priority: true,
          charges: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      if (patientLabTests.length > 0) {
        labTestsSource = "patient";
      }
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientLabTestsQuery = await buildQuery("lab", {
        patientId,
        appointmentId: { not: appointmentId },
        createdAt: { gte: thirtyDaysAgo },
        status: { not: "cancelled" },
      });
      patientLabTests = await prisma.labTest.findMany({
        where: patientLabTestsQuery,
        select: {
          id: true,
          testId: true,
          tests: true,
          category: true,
          price: true,
          discountedPrice: true,
          status: true,
          priority: true,
          charges: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (patientLabTests.length > 0) {
        labTestsSource = "mixed";
      }
    }

    const appointmentPrescriptionsQuery = await buildQuery("prescription", {
      appointmentId,
    });
    const appointmentPrescriptions = await prisma.prescription.findMany({
      where: appointmentPrescriptionsQuery,
      include: {
        patient: { select: { id: true, name: true, patientId: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
      orderBy: { date: "desc" },
    });

    let patientPrescriptions = [];
    let prescriptionsSource: "appointment" | "patient" | "mixed" = "appointment";

    if (appointmentPrescriptions.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientPrescriptionsQuery = await buildQuery("prescription", {
        patientId,
        date: { gte: thirtyDaysAgo },
        status: "active",
        expiryDate: { gt: new Date() },
      });
      patientPrescriptions = await prisma.prescription.findMany({
        where: patientPrescriptionsQuery,
        include: {
          patient: { select: { id: true, name: true, patientId: true } },
          doctor: { select: { id: true, name: true, specialization: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      });

      if (patientPrescriptions.length > 0) {
        prescriptionsSource = "patient";
      }
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientPrescriptionsQuery = await buildQuery("prescription", {
        patientId,
        appointmentId: { not: appointmentId },
        date: { gte: thirtyDaysAgo },
        status: "active",
        expiryDate: { gt: new Date() },
      });
      patientPrescriptions = await prisma.prescription.findMany({
        where: patientPrescriptionsQuery,
        include: {
          patient: { select: { id: true, name: true, patientId: true } },
          doctor: { select: { id: true, name: true, specialization: true } },
        },
        orderBy: { date: "desc" },
        take: 5,
      });

      if (patientPrescriptions.length > 0) {
        prescriptionsSource = "mixed";
      }
    }

    const appointmentImagingQuery = await buildQuery("radiology", {
      appointmentId,
    });
    const appointmentImagingServices = await prisma.radiologyRequest.findMany({
      where: appointmentImagingQuery,
      include: {
        referringDoctor: { select: { name: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
      },
      orderBy: { requestDate: "desc" },
    });

    const allPatientImagingQuery = await buildQuery("radiology", {
      patientId,
      requestDate: { gte: appointmentDate },
    });
    const allPatientImagingServices = await prisma.radiologyRequest.findMany({
      where: allPatientImagingQuery,
      select: {
        id: true,
        serviceId: true,
        appointmentId: true,
      },
      orderBy: { requestDate: "desc" },
    });

    let patientImagingServices = [];
    let imagingSource: "appointment" | "patient" | "mixed" = "appointment";

    if (appointmentImagingServices.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientImagingQuery = await buildQuery("radiology", {
        patientId,
        requestDate: { gte: thirtyDaysAgo },
        status: { not: "cancelled" },
      });
      patientImagingServices = await prisma.radiologyRequest.findMany({
        where: patientImagingQuery,
        include: {
          referringDoctor: { select: { name: true } },
          radiologist: { select: { name: true } },
          technician: { select: { name: true } },
        },
        orderBy: { requestDate: "desc" },
        take: 20,
      });

      if (patientImagingServices.length > 0) {
        imagingSource = "patient";
      }
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientImagingQuery = await buildQuery("radiology", {
        patientId,
        appointmentId: { not: appointmentId },
        requestDate: { gte: thirtyDaysAgo },
        status: { not: "cancelled" },
      });
      patientImagingServices = await prisma.radiologyRequest.findMany({
        where: patientImagingQuery,
        include: {
          referringDoctor: { select: { name: true } },
          radiologist: { select: { name: true } },
          technician: { select: { name: true } },
        },
        orderBy: { requestDate: "desc" },
        take: 10,
      });

      if (patientImagingServices.length > 0) {
        imagingSource = "mixed";
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          appointment,
          labTests: [...appointmentLabTests, ...patientLabTests],
          prescriptions: [...appointmentPrescriptions, ...patientPrescriptions],
          imagingServices: [
            ...appointmentImagingServices,
            ...patientImagingServices,
          ],
          source: {
            labTests: labTestsSource,
            prescriptions: prescriptionsSource,
            imaging: imagingSource,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error: any) {
    console.error("Error fetching appointment medical records:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch medical records",
      },
      { status: 500 },
    );
  }
}
