// app/api/reception/appointments/[id]/full-details/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { LabTest } from "@/lib/models/LabTest";
import { Prescription } from "@/lib/models/Prescription";
import { MedicalRecord } from "@/lib/models/MedicalRecord";
import { jwtVerify } from "jose";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Define interfaces for the populated data
interface PopulatedPatient {
  _id?: Types.ObjectId;
  name?: string;
  phone?: string;
  guardian?: string;
  patientId?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  allergies?: string[];
}

interface PopulatedDoctor {
  _id?: Types.ObjectId;
  name?: string;
  specialization?: string;
  department?: string;
  phone?: string;
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// GET: Get complete appointment data for receptionists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Only receptionists and admins can access
    if (!["receptionist", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Receptionist or admin access required." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: appointmentId } = await params;
    
    console.log(`Receptionist ${userId} fetching full details for appointment ${appointmentId}`);
    
    // Get appointment with basic info
    const appointment = await Appointment.findById(appointmentId)
      .populate<{ patient: PopulatedPatient }>("patient", "name phone guardian patientId dateOfBirth gender address emergencyContact bloodGroup allergies")
      .populate<{ doctor: PopulatedDoctor }>("doctor", "name specialization department phone")
      .populate("createdBy", "name")
      .lean();
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Get ALL related data for billing and management
    const [labTests, prescriptions, medicalRecords] = await Promise.all([
      // Lab tests with payment details
      LabTest.find({ appointment: appointmentId })
        .populate("patient", "name patientId")
        .populate("doctor", "name specialization")
        .populate("orderedBy", "name")
        .select("testId testName category description price discountedPrice status priority specimen instructions notes charges orderedAt collectedAt completedAt reportedAt")
        .sort({ orderedAt: -1 })
        .lean(),
      
      // Prescriptions with medication details
      Prescription.find({ appointment: appointmentId })
        .populate("patient", "name patientId")
        .populate("doctor", "name specialization")
        .select("prescriptionId prescribedDate diagnosis medications notes status expiryDate instructions")
        .sort({ prescribedDate: -1 })
        .lean(),
      
      // Medical records (limited for context)
      MedicalRecord.find({ appointment: appointmentId })
        .populate("doctor", "name")
        .select("recordId date diagnosis symptoms notes vitalSigns treatmentPlan followUpDate")
        .sort({ date: -1 })
        .limit(3)
        .lean()
    ]);
    
    // Calculate detailed billing
    const resolvedConsultationFee =
      (appointment as any).consultationFee ??
      (appointment as any).doctorFee ??
      (appointment.appointmentType === "emergency" ? 150 :
       appointment.appointmentType === "procedure" ? 200 : 100);

    const billingDetails = {
      consultationFee: resolvedConsultationFee,
      
      labTests: labTests.map(test => {
        const base = test.discountedPrice || test.price || 0;
        const tax = test.charges?.tax || 0;
        const other = test.charges?.otherCharges || 0;
        const discount = test.charges?.discount || 0;
        const total = base + tax + other - discount;
        const paid = test.charges?.paid || 0;
        const due = test.charges?.due || 0;
        
        return {
          testId: test.testId,
          testName: test.testName,
          basePrice: base,
          tax,
          otherCharges: other,
          discount,
          total,
          paid,
          due,
          paymentStatus: test.charges?.paymentStatus || "pending",
          paymentMethod: test.charges?.paymentMethod
        };
      }),
      
      prescriptions: prescriptions.map(prescription => {
        return {
          prescriptionId: prescription.prescriptionId,
          medications: Array.isArray(prescription.medications) 
            ? prescription.medications.map((med: any) => ({
                name: med.name || "",
                dosage: med.dosage || "",
                quantity: med.quantity || 0,
                frequency: med.frequency || "",
                duration: med.duration || ""
              }))
            : [],
          total: 0 // No price in model
        };
      }),
      
      summary: {
        labTestsTotal: labTests.reduce((sum, test) => {
          const base = test.discountedPrice || test.price || 0;
          const tax = test.charges?.tax || 0;
          const other = test.charges?.otherCharges || 0;
          const discount = test.charges?.discount || 0;
          return sum + base + tax + other - discount;
        }, 0),
        
        prescriptionsTotal: 0, // No price in prescription model
        
        consultationFee: resolvedConsultationFee,
        
        totalAmount: 0, // Will be calculated below
        totalPaid: labTests.reduce((sum, test) => sum + (test.charges?.paid || 0), 0),
        totalDue: labTests.reduce((sum, test) => sum + (test.charges?.due || 0), 0)
      }
    };
    
    // Calculate final totals
    billingDetails.summary.totalAmount = 
      billingDetails.summary.labTestsTotal + 
      billingDetails.summary.prescriptionsTotal + 
      billingDetails.summary.consultationFee;
    
    // Helper function to safely get patient age
    const getPatientAge = (dateOfBirth?: Date): number | null => {
      if (!dateOfBirth) return null;
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    };
    
    // Safely extract patient information
    const patient = appointment.patient as PopulatedPatient;
    const doctor = appointment.doctor as PopulatedDoctor;
    
    return NextResponse.json({
      success: true,
      data: {
        appointment,
        labTests,
        prescriptions,
        medicalRecords,
        billing: billingDetails,
        patientSummary: {
          name: patient?.name || "N/A",
          patientId: patient?.patientId || "N/A",
          age: patient?.dateOfBirth ? getPatientAge(patient.dateOfBirth) : null,
          bloodGroup: patient?.bloodGroup || "N/A",
          allergies: Array.isArray(patient?.allergies) ? patient.allergies : []
        }
      },
      permissions: {
        canEditCharges: true,
        canProcessPayments: true,
        canPrintReceipts: true,
        canViewSensitiveInfo: ["admin", "receptionist"].includes(userRole)
      }
    });
    
  } catch (error: unknown) {
    console.error("Error fetching full appointment details:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch appointment details";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
