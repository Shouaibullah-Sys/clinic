// app/api/appointments/[id]/medical-records/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Prescription } from "@/lib/models/Prescription";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { Appointment } from "@/lib/models/Appointment";
import { jwtVerify } from "jose";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    // Only receptionists, doctors, and admins can access
    if (!["receptionist", "doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Insufficient permissions." },
        { status: 403 },
      );
    }

    const buildQuery = async (module: "lab" | "prescription" | "radiology", baseQuery: any) => {
      const { query: finalQuery } = await buildMarkedOnlyQuery({
        userId: payload.id as string,
        module,
        baseQuery,
      });
      return finalQuery;
    };

    // Get the appointment to access patient ID
    const appointment = await Appointment.findById(appointmentId)
      .select("-__v")
      .populate(
        "patient",
        "_id name patientId phone email dateOfBirth gender address bloodGroup allergies",
      )
      .populate("doctor", "_id name specialization department");

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    const patientId = appointment.patient._id;
    const appointmentDate = new Date(appointment.date);

    // Get appointment-specific lab tests
    const appointmentLabTestsQuery = await buildQuery("lab", {
      appointment: appointmentId,
    });
    const appointmentLabTests = await LabTest.find(appointmentLabTestsQuery)
      .select(
        "_id testId testName category price discountedPrice status priority charges orderedAt",
      )
      .sort({ orderedAt: -1 });

    // Get patient-specific lab tests (from last 30 days if no appointment-specific tests)
    let patientLabTests = [];
    let labTestsSource: "appointment" | "patient" | "mixed" = "appointment";

    if (appointmentLabTests.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientLabTestsQuery = await buildQuery("lab", {
        patient: patientId,
        orderedAt: { $gte: thirtyDaysAgo },
        status: { $ne: "cancelled" },
      });
      patientLabTests = await LabTest.find(patientLabTestsQuery)
        .select(
          "_id testId testName category price discountedPrice status priority charges orderedAt",
        )
        .sort({ orderedAt: -1 })
        .limit(20);

      if (patientLabTests.length > 0) {
        labTestsSource = "patient";
      }
    } else {
      // If we have appointment-specific tests, still get recent patient tests for context
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientLabTestsQuery = await buildQuery("lab", {
        patient: patientId,
        appointment: { $ne: appointmentId }, // Exclude current appointment tests
        orderedAt: { $gte: thirtyDaysAgo },
        status: { $ne: "cancelled" },
      });
      patientLabTests = await LabTest.find(patientLabTestsQuery)
        .select(
          "_id testId testName category price discountedPrice status priority charges orderedAt",
        )
        .sort({ orderedAt: -1 })
        .limit(10)
        .lean();

      if (patientLabTests.length > 0) {
        labTestsSource = "mixed";
      }
    }

    // Get appointment-specific prescriptions
    const appointmentPrescriptionsQuery = await buildQuery("prescription", {
      appointment: appointmentId,
    });
    const appointmentPrescriptions = await Prescription.find(appointmentPrescriptionsQuery)
      .select(
        "_id prescriptionId prescribedDate medications diagnosis instructions notes status expiryDate charges paymentStatus paymentVerified",
      )
      .populate("patient", "_id name patientId")
      .populate("doctor", "_id name specialization")
      .sort({ prescribedDate: -1 });

    // Get patient-specific prescriptions
    let patientPrescriptions = [];
    let prescriptionsSource: "appointment" | "patient" | "mixed" =
      "appointment";

    if (appointmentPrescriptions.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientPrescriptionsQuery = await buildQuery("prescription", {
        patient: patientId,
        prescribedDate: { $gte: thirtyDaysAgo },
        status: "active",
        expiryDate: { $gt: new Date() },
      });
      patientPrescriptions = await Prescription.find(patientPrescriptionsQuery)
        .select(
          "_id prescriptionId prescribedDate medications diagnosis instructions notes status expiryDate charges paymentStatus paymentVerified",
        )
        .populate("patient", "_id name patientId")
        .populate("doctor", "_id name specialization")
        .sort({ prescribedDate: -1 })
        .limit(10);

      if (patientPrescriptions.length > 0) {
        prescriptionsSource = "patient";
      }
    } else {
      // If we have appointment-specific prescriptions, still get recent patient prescriptions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientPrescriptionsQuery = await buildQuery("prescription", {
        patient: patientId,
        appointment: { $ne: appointmentId }, // Exclude current appointment prescriptions
        prescribedDate: { $gte: thirtyDaysAgo },
        status: "active",
        expiryDate: { $gt: new Date() },
      });
      patientPrescriptions = await Prescription.find(patientPrescriptionsQuery)
        .select(
          "_id prescriptionId prescribedDate medications diagnosis instructions notes status expiryDate charges paymentStatus paymentVerified",
        )
        .populate("patient", "_id name patientId")
        .populate("doctor", "_id name specialization")
        .sort({ prescribedDate: -1 })
        .limit(5);

      if (patientPrescriptions.length > 0) {
        prescriptionsSource = "mixed";
      }
    }

    // Get appointment-specific imaging services
    const appointmentImagingQuery = await buildQuery("radiology", {
      appointment: appointmentId,
    });
    const appointmentImagingServices = await RadiologyService.find(appointmentImagingQuery)
      .select(
        "_id serviceId serviceType bodyPart view status priority reportStatus billingStatus charges paymentVerified requestDate scheduledDate performedDate",
      )
      .populate("referringDoctor", "name")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .sort({ requestDate: -1 })
      .lean();

    console.log(
      `📸 Found ${appointmentImagingServices.length} appointment-specific imaging services for appointment ${appointmentId}`,
    );
    appointmentImagingServices.forEach((service) => {
      console.log(
        `  - Service ${service.serviceId}: paymentStatus=${service.charges?.paymentStatus}, billingStatus=${service.billingStatus}, paymentVerified=${service.paymentVerified}, hasAppointment=${!!service.appointment}, charges=${JSON.stringify(service.charges)}`,
      );
    });

    // Also check if there are any imaging services for this patient without appointment link
    const allPatientImagingQuery = await buildQuery("radiology", {
      patient: patientId,
      requestDate: { $gte: appointmentDate },
    });
    const allPatientImagingServices = await RadiologyService.find(allPatientImagingQuery)
      .select("_id serviceId appointment")
      .sort({ requestDate: -1 })
      .lean();

    console.log(
      `🔍 Total imaging services for patient since appointment date: ${allPatientImagingServices.length}`,
    );
    allPatientImagingServices.forEach((service) => {
      console.log(
        `  - Service ${service.serviceId}: appointment=${service.appointment}`,
      );
    });

    // If no appointment-specific imaging services found, check if there are any recent patient services
    if (
      appointmentImagingServices.length === 0 &&
      allPatientImagingServices.length > 0
    ) {
      console.log(
        `⚠️ No appointment-specific imaging services found, but ${allPatientImagingServices.length} patient services exist. This might indicate imaging service is not properly linked to appointment.`,
      );
    }

    // Get patient-specific imaging services (from last 30 days if no appointment-specific services)
    let patientImagingServices = [];
    let imagingSource: "appointment" | "patient" | "mixed" = "appointment";

    if (appointmentImagingServices.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientImagingQuery = await buildQuery("radiology", {
        patient: patientId,
        requestDate: { $gte: thirtyDaysAgo },
        status: { $ne: "cancelled" },
      });
      patientImagingServices = await RadiologyService.find(patientImagingQuery)
        .select(
          "_id serviceId serviceType bodyPart view status priority reportStatus billingStatus charges paymentVerified requestDate scheduledDate performedDate",
        )
        .populate("referringDoctor", "name")
        .populate("radiologist", "name")
        .populate("technician", "name")
        .sort({ requestDate: -1 })
        .limit(20);

      if (patientImagingServices.length > 0) {
        imagingSource = "patient";
      }
    } else {
      // If we have appointment-specific services, still get recent patient services for context
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientImagingQuery = await buildQuery("radiology", {
        patient: patientId,
        appointment: { $ne: appointmentId }, // Exclude current appointment services
        requestDate: { $gte: thirtyDaysAgo },
        status: { $ne: "cancelled" },
      });
      patientImagingServices = await RadiologyService.find(patientImagingQuery)
        .select(
          "_id serviceId serviceType bodyPart view status priority reportStatus billingStatus charges paymentVerified requestDate scheduledDate performedDate",
        )
        .populate("referringDoctor", "name")
        .populate("radiologist", "name")
        .populate("technician", "name")
        .sort({ requestDate: -1 })
        .limit(10)
        .lean();

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
