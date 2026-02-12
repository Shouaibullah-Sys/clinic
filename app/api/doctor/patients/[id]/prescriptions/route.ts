import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { Appointment } from "@/lib/models/Appointment";
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
    // Await params for Next.js 16
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

    console.log(
      `Fetching prescriptions for patient ${patientId} by doctor ${userId}`,
    );

    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    const doctorId = new mongoose.Types.ObjectId(userId);

    // Get prescriptions for this patient, either prescribed by this doctor or linked to appointments
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId, doctor: doctorId },
        {
          patient: patientId,
          appointment: { $exists: true },
          doctor: doctorId,
        },
      ],
    })
      .select(
        "_id prescriptionId prescribedDate medications diagnosis instructions notes status expiryDate charges paymentStatus paymentVerified",
      )
      .populate("doctor", "name specialization")
      .populate("appointment", "appointmentId date")
      .populate("patient", "name patientId")
      .sort({ prescribedDate: -1 })
      .lean();

    console.log(
      `Found ${prescriptions.length} prescriptions for patient ${patientId}`,
    );

    return NextResponse.json({
      success: true,
      data: prescriptions,
    });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescriptions",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params for Next.js 16
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

    console.log(
      `Creating prescription for patient ${patientId} by doctor ${userId}`,
    );

    // Only doctors and admins can create prescriptions
    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    // Create doctorId before using it
    const doctorId = new mongoose.Types.ObjectId(userId);

    // Check if request body can be parsed
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const {
      appointmentId,
      diagnosis,
      medications,
      notes,
      patientInstructions,
      followUpDate,
      validityDays = 7,
    } = body;

    // Validation - diagnosis is now optional
    // if (!diagnosis) {
    //   return NextResponse.json(
    //     { success: false, error: "Diagnosis is required" },
    //     { status: 400 }
    //   );
    // }

    if (
      !medications ||
      !Array.isArray(medications) ||
      medications.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "At least one medication is required" },
        { status: 400 },
      );
    }

    // NEW: Check for duplicate prescriptions
    const existingPrescription = await Prescription.findOne({
      patient: patientId,
      doctor: doctorId,
      diagnosis: { $regex: new RegExp(diagnosis.trim(), "i") },
      prescribedDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Within 24 hours
    });

    if (existingPrescription) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Similar prescription created recently. Please edit existing prescription instead.",
          existingPrescriptionId: existingPrescription._id,
          existingPrescription: {
            prescriptionId: existingPrescription.prescriptionId,
            prescribedDate: existingPrescription.prescribedDate,
            diagnosis: existingPrescription.diagnosis,
          },
        },
        { status: 400 },
      );
    }

    // Validate each medication
    const validatedMedications = medications.map((med: any, index: number) => {
      if (
        !med.name ||
        !med.dosage ||
        !med.frequency ||
        !med.duration ||
        !med.form
      ) {
        throw new Error(
          `Medication ${index + 1} is missing required fields (name, dosage, frequency, duration, form)`,
        );
      }

      // Check if medicine ID is provided (from SmartMedicineSearch)
      // Note: Medicine ID is optional for manual entries, but recommended for inventory tracking
      if (med._id || med.medicine) {
        // If medicine ID is provided, use it
        // (The medicine ID will be set in the return statement below)
      }
      // If no medicine ID is provided, we'll still allow the prescription but log a warning
      else {
        console.warn(
          `Medication ${index + 1}: No medicine ID provided. This medication won't be linked to inventory.`,
        );
      }

      // Convert route to lowercase and validate
      const route = (med.route?.toString().trim() || "oral").toLowerCase();
      const validRoutes = [
        "oral",
        "topical",
        "inhalation",
        "injection",
        "rectal",
        "vaginal",
        "ophthalmic",
        "otic",
        "nasal",
        "transdermal",
      ];

      if (!validRoutes.includes(route)) {
        throw new Error(
          `Medication ${index + 1}: "${route}" is not a valid route. Valid routes are: ${validRoutes.join(", ")}`,
        );
      }

      return {
        medicine: med._id || med.medicine || undefined, // Use medicine ID from search results, optional
        name: med.name.trim(),
        form: med.form.trim(),
        dosage: med.dosage.toString().trim(),
        frequency: med.frequency.toString().trim(),
        duration: med.duration.toString().trim(),
        instructions: med.instructions?.toString().trim() || "",
        quantity: med.quantity ? parseInt(med.quantity) || 1 : 1,
        price: med.price ? parseFloat(med.price) || 0 : 0,
        route: route,
        refills: med.refills ? parseInt(med.refills) || 0 : 0,
        refillsRemaining: med.refills ? parseInt(med.refills) || 0 : 0,
      };
    });

    // Check if appointment exists and belongs to patient (if provided)
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
      });

      if (!appointment) {
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found or does not belong to this patient",
          },
          { status: 404 },
        );
      }
    }

    // Check inventory availability for each medication
    const MedicineStock = mongoose.model("MedicineStock");
    const insufficientStock: string[] = [];

    for (const med of validatedMedications) {
      // Find medicine by name (since we don't have medicine ID in prescription creation)
      const medicine = await MedicineStock.findOne({
        name: { $regex: new RegExp(`^${med.name}$`, "i") },
      });

      if (!medicine) {
        insufficientStock.push(`${med.name} (not found in inventory)`);
      } else if (medicine.currentQuantity < med.quantity) {
        insufficientStock.push(
          `${med.name} (available: ${medicine.currentQuantity}, requested: ${med.quantity})`,
        );
      }
    }

    // Return warning if stock is insufficient (but don't block prescription creation)
    if (insufficientStock.length > 0) {
      console.warn(
        `Insufficient stock for prescription: ${insufficientStock.join(", ")}`,
      );
    }

    // Create prescription using the model's pre-save hook to generate prescriptionId
    const prescriptionData: any = {
      patient: patientId,
      doctor: doctorId,
      diagnosis: diagnosis ? diagnosis.trim() : "",
      medications: validatedMedications,
      instructions: patientInstructions?.trim() || "",
      notes: notes?.trim() || "",
      status: "active",
      prescribedDate: new Date(),
    };

    // Add expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (parseInt(validityDays) || 7));
    prescriptionData.expiryDate = expiryDate;

    // Add appointment if provided
    if (appointmentId) {
      prescriptionData.appointment = appointmentId;
    }

    // Add follow-up date if provided
    if (followUpDate) {
      prescriptionData.followUpDate = new Date(followUpDate);
    }

    // Create and save prescription
    console.log(
      "Prescription data before save:",
      JSON.stringify(prescriptionData, null, 2),
    );
    const prescription = new Prescription(prescriptionData);

    // Ensure prescriptionId is generated if pre-save hook fails
    if (!prescription.prescriptionId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      prescription.prescriptionId = `RX${year}${month}${random}`;
    }

    console.log("Prescription instance before save:", prescription);
    await prescription.save();

    // If appointment exists, update it to reference this prescription
    if (appointmentId && appointment) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { $addToSet: { prescriptions: prescription._id } },
        { new: true },
      );
    }

    console.log(
      `Prescription created successfully: ${prescription.prescriptionId} for appointment: ${appointmentId || "No appointment linked"}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: prescription,
        message: "Prescription created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating prescription:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      console.error("Validation error details:", errors);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate prescription ID detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create prescription",
      },
      { status: 500 },
    );
  }
}
