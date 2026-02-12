// app/api/doctor/patients/[id]/visits/route.ts - Fetch all visits with records grouped by appointment

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { MedicalRecord } from "@/lib/models/MedicalRecord";
import { Prescription } from "@/lib/models/Prescription";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

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

    const userId = payload.id as string;
    const userRole = payload.role as string;

    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    const doctorObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch all appointments for this patient with this doctor
    const appointments = await Appointment.find({
      patient: patientId,
      doctor: doctorObjectId,
      status: { $nin: ["cancelled", "no-show", "rescheduled"] },
    })
      .select(
        "appointmentId date startTime endTime status reason priority notes checkInTime checkOutTime",
      )
      .sort({ startTime: -1 })
      .lean();

    // Fetch all medical records for this patient
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .lean();

    // Fetch all prescriptions for this patient
    const prescriptions = await Prescription.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .lean();

    // Fetch all lab tests for this patient
    const labTests = await LabTest.find({ patient: patientId })
      .populate("orderedBy", "name")
      .lean();

    // Fetch all imaging studies for this patient
    const imagingStudies = await RadiologyService.find({ patient: patientId })
      .populate("referringDoctor", "name specialization")
      .lean();

    // Group all records by appointment
    const visits = appointments.map((appointment) => {
      const appointmentId = appointment._id.toString();
      const appointmentDate = new Date(appointment.startTime);

      // Find medical records for this appointment
      const visitMedicalRecords = medicalRecords.filter((record) => {
        if (!record.appointment) return false;
        return record.appointment.toString() === appointmentId;
      });

      // If no appointment-linked records, find records within 24 hours of appointment
      const fallbackRecords =
        visitMedicalRecords.length === 0
          ? medicalRecords.filter((record) => {
              if (!record.visitDate) return false;
              const recordDate = new Date(record.visitDate);
              const diffHours =
                Math.abs(appointmentDate.getTime() - recordDate.getTime()) /
                36e5;
              return diffHours <= 24;
            })
          : [];

      const allRecords =
        visitMedicalRecords.length > 0 ? visitMedicalRecords : fallbackRecords;

      // Find prescriptions for this appointment
      const visitPrescriptions = prescriptions.filter((prescription) => {
        if (!prescription.appointment) return false;
        return prescription.appointment.toString() === appointmentId;
      });

      // Find prescriptions within 24 hours if none linked
      const fallbackPrescriptions =
        visitPrescriptions.length === 0
          ? prescriptions.filter((prescription) => {
              if (!prescription.prescribedDate) return false;
              const prescriptionDate = new Date(prescription.prescribedDate);
              const diffHours =
                Math.abs(
                  appointmentDate.getTime() - prescriptionDate.getTime(),
                ) / 36e5;
              return diffHours <= 24;
            })
          : [];

      const allPrescriptions =
        visitPrescriptions.length > 0
          ? visitPrescriptions
          : fallbackPrescriptions;

      // Find lab tests for this appointment
      const visitLabTests = labTests.filter((test) => {
        if (!test.appointment) return false;
        return test.appointment.toString() === appointmentId;
      });

      // Find lab tests within 24 hours if none linked
      const fallbackLabTests =
        visitLabTests.length === 0
          ? labTests.filter((test) => {
              if (!test.orderedAt) return false;
              const testDate = new Date(test.orderedAt);
              const diffHours =
                Math.abs(appointmentDate.getTime() - testDate.getTime()) / 36e5;
              return diffHours <= 24;
            })
          : [];

      const allLabTests =
        visitLabTests.length > 0 ? visitLabTests : fallbackLabTests;

      // Find imaging studies for this appointment
      const visitImaging = imagingStudies.filter((imaging) => {
        if (!imaging.appointment) return false;
        return imaging.appointment.toString() === appointmentId;
      });

      // Find imaging within 24 hours if none linked
      const fallbackImaging =
        visitImaging.length === 0
          ? imagingStudies.filter((imaging) => {
              if (!imaging.requestDate) return false;
              const imagingDate = new Date(imaging.requestDate);
              const diffHours =
                Math.abs(appointmentDate.getTime() - imagingDate.getTime()) /
                36e5;
              return diffHours <= 24;
            })
          : [];

      const allImaging =
        visitImaging.length > 0 ? visitImaging : fallbackImaging;

      return {
        appointment: {
          _id: appointment._id,
          appointmentId: appointment.appointmentId,
          date: appointment.startTime,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          reason: appointment.reason,
          priority: appointment.priority,
          notes: appointment.notes,
          checkInTime: appointment.checkInTime,
          checkOutTime: appointment.checkOutTime,
        },
        records: {
          medical: allRecords.map((record) => ({
            _id: record._id,
            recordId: record.recordId,
            date: record.visitDate,
            diagnosis: record.diagnosis,
            symptoms: record.symptoms,
            notes: record.notes,
            vitals: record.vitalSigns,
            doctor: record.doctor,
            examinations: record.examinations,
            procedures: record.procedures,
            followUpDate: record.followUpDate,
            admitted: record.admitted,
          })),
          prescriptions: allPrescriptions.map((prescription) => ({
            _id: prescription._id,
            prescriptionId: prescription.prescriptionId,
            date: prescription.prescribedDate,
            medications: prescription.medications,
            diagnosis: prescription.diagnosis,
            notes: prescription.notes,
            instructions: prescription.instructions,
            status: prescription.status,
            dispensingStatus: prescription.dispensingStatus,
            paymentStatus: prescription.paymentStatus,
            doctor: prescription.doctor,
          })),
          labTests: allLabTests.map((test) => ({
            _id: test._id,
            testId: test.testId,
            testName: test.testName,
            category: test.category,
            orderedAt: test.orderedAt,
            status: test.status,
            results: test.results,
            orderedBy: test.orderedBy,
          })),
          imaging: allImaging.map((imaging) => ({
            _id: imaging._id,
            serviceId: imaging.serviceId,
            serviceType: imaging.serviceType,
            bodyPart: imaging.bodyPart,
            view: imaging.view,
            requestDate: imaging.requestDate,
            scheduledDate: imaging.scheduledDate,
            performedDate: imaging.performedDate,
            status: imaging.status,
            reportStatus: imaging.reportStatus,
            findings: imaging.findings,
            impression: imaging.impression,
            referringDoctor: imaging.referringDoctor,
          })),
        },
        summary: {
          hasMedicalRecord: allRecords.length > 0,
          hasPrescription: allPrescriptions.length > 0,
          hasLabTest: allLabTests.length > 0,
          hasImaging: allImaging.length > 0,
          totalRecords:
            allRecords.length +
            allPrescriptions.length +
            allLabTests.length +
            allImaging.length,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: visits,
    });
  } catch (error: any) {
    console.error("Error fetching patient visits:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch visits" },
      { status: 500 },
    );
  }
}
