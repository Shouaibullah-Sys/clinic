// app/api/patients/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Patient } from "@/lib/models/Patient";
import { Appointment } from "@/lib/models/Appointment";
import { MedicalRecord } from "@/lib/models/MedicalRecord";
import { Prescription } from "@/lib/models/Prescription";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";

// Helper to calculate age from date of birth
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

// GET: Get patient details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

  // Update the authenticateRequest call to handle the promise properly
const auth = await authenticateRequest(request);
if (!auth.success) {
  return NextResponse.json(
    { success: false, error: auth.error },
    { status: auth.status || 401 }
  );
}

// Access auth properties safely
const userId = auth.userId as string;
const userRole = auth.userRole as string;
const userName = auth.userName as string;
    // Check if user has permission to view patient data
    const allowedRoles = ["admin", "doctor", "nurse", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access patient data." },
        { status: 403 }
      );
    }

    const { id: patientId } = await params;

    console.log(`Fetching patient data for ID: ${patientId} by user: ${auth.userRole} ${auth.userName}`);

    // Get patient basic information
    const patient = await Patient.findById(patientId)
      .select("-__v -createdAt -updatedAt")
      .lean();

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Calculate age
    const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

    // If user is a doctor, check if they have treated this patient
    if (auth.userRole === "doctor") {
      console.log(`Doctor access check: userRole=${auth.userRole}, userId=${auth.userId}, patientId=${patientId}`);
      const hasAccess = await Appointment.exists({
        patient: patientId,
        doctor: auth.userId,
        status: { $nin: ["cancelled", "no-show"] }
      });
      console.log(`Doctor access check result: hasAccess=${hasAccess}`);

      if (!hasAccess) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Forbidden. You can only access patients you have treated." 
          },
          { status: 403 }
        );
      }
    }

    // Get patient appointments
    const appointmentQuery: any = { patient: patientId };
    
    // Filter by doctor if user is doctor
    if (auth.userRole === "doctor") {
      appointmentQuery.doctor = auth.userId;
    }

    const appointments = await Appointment.find(appointmentQuery)
      .populate("doctor", "name specialization")
      .sort({ date: -1, startTime: -1 })
      .limit(20)
      .lean();

    // Get medical records
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ visitDate: -1 })
      .limit(10)
      .lean();

    // Get prescriptions
    const prescriptions = await Prescription.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ prescribedDate: -1 })
      .limit(10)
      .lean();

    // Get lab tests
    const labTests = await LabTest.find({ patient: patientId })
      .populate("doctor", "name")
      .populate("orderedBy", "name role")
      .sort({ orderedAt: -1 })
      .limit(10)
      .lean();

    // Get vital signs history (last 10 entries)
    const vitalSignsHistory = await MedicalRecord.aggregate([
      { $match: { patient: patient._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          date: "$createdAt",
          bloodPressure: "$vitalSigns.bloodPressure",
          heartRate: "$vitalSigns.heartRate",
          temperature: "$vitalSigns.temperature",
          respiratoryRate: "$vitalSigns.respiratoryRate",
          oxygenSaturation: "$vitalSigns.oxygenSaturation",
          weight: "$vitalSigns.weight",
          height: "$vitalSigns.height",
          bmi: "$vitalSigns.bmi"
        }
      }
    ]);

    // Format the response data
    const responseData = {
      patient: {
        ...patient,
        age,
        fullAddress: patient.address || null
      },
      statistics: {
        totalAppointments: await Appointment.countDocuments({ patient: patientId, status: { $nin: ["cancelled", "no-show"] } }),
        completedAppointments: await Appointment.countDocuments({ patient: patientId, status: "completed" }),
        upcomingAppointments: await Appointment.countDocuments({ 
          patient: patientId, 
          status: { $in: ["scheduled", "confirmed"] },
          date: { $gte: new Date() }
        }),
        totalPrescriptions: await Prescription.countDocuments({ patient: patientId }),
        totalLabTests: await LabTest.countDocuments({ patient: patientId, status: { $ne: "cancelled" } }),
        lastVisit: appointments.length > 0 ? appointments[0].date : null
      },
      appointments: appointments.map(apt => ({
        _id: apt._id,
        appointmentId: apt.appointmentId,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        duration: apt.duration,
        status: apt.status,
        reason: apt.reason,
        priority: apt.priority,
        doctor: apt.doctor,
        notes: apt.notes,
        checkInTime: apt.checkInTime,
        checkOutTime: apt.checkOutTime
      })),
      medicalRecords: medicalRecords.map(record => ({
        _id: record._id,
        recordId: record.recordId,
        visitDate: record.visitDate,
        doctor: record.doctor,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        notes: record.notes,
        vitalSigns: record.vitalSigns,
        followUpDate: record.followUpDate,
        createdBy: record.createdBy
      })),
      prescriptions: prescriptions.map(pres => ({
        _id: pres._id,
        prescriptionId: pres.prescriptionId,
        prescribedDate: pres.prescribedDate,
        prescribedBy: pres.prescribedBy,
        medications: pres.medications,
        instructions: pres.instructions,
        status: pres.status,
        refillsRemaining: pres.refillsRemaining,
        expiryDate: pres.expiryDate
      })),
      labTests: labTests.map(test => ({
        _id: test._id,
        testId: test.testId,
        testName: test.testName,
        category: test.category,
        orderedAt: test.orderedAt,
        status: test.status,
        collectionStatus: test.collectionStatus,
        doctor: test.doctor,
        orderedBy: test.orderedBy,
        results: test.results,
        priority: test.priority
      })),
      vitalSignsHistory,
      permissions: {
        canEdit: auth.userRole === "admin" || auth.userRole === "receptionist",
        canAddMedicalRecord: auth.userRole === "admin" || auth.userRole === "doctor" || auth.userRole === "nurse",
        canWritePrescription: auth.userRole === "admin" || auth.userRole === "doctor",
        canOrderLabTest: auth.userRole === "admin" || auth.userRole === "doctor"
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error fetching patient data:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch patient data",
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

// PUT: Update patient information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Only admin and receptionist can update patient information
    const allowedRoles = ["admin", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only admin and receptionist can update patient information." },
        { status: 403 }
      );
    }

    const { id: patientId } = await params;
    const body = await request.json();

    console.log(`Updating patient ${patientId} by ${auth.userRole} ${auth.userName}`);

    // Check if patient exists
    const existingPatient = await Patient.findById(patientId);
    if (!existingPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Define allowed fields for update
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
      "primaryPhysician"
    ];

    // Filter update data to only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If updating address, ensure it's a string (address is stored as string in the model)
    if (body.address !== undefined) {
      updateData.address = body.address;
    }

    // If updating emergency contact
    if (body.emergencyContact !== undefined) {
      updateData.emergencyContact = body.emergencyContact;
    }

    // If updating insurance
    if (body.insurance !== undefined) {
      updateData.insurance = body.insurance;
    }

    // Update the patient
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-__v -createdAt -updatedAt");

    // Add audit log entry
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({
        action: 'UPDATE_PATIENT',
        entityType: 'Patient',
        entityId: patientId,
        userId: auth.userId,
        userRole: auth.userRole,
        userName: auth.userName,
        changes: updateData,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: "Patient information updated successfully"
    });

  } catch (error: any) {
    console.error("Error updating patient:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { success: false, error: `Duplicate ${field} detected. Please use a different value.` },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}

// DELETE: Delete patient (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Only admin can delete patients
    if (auth.userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only administrators can delete patients." },
        { status: 403 }
      );
    }

    const { id: patientId } = await params;

    console.log(`Deleting patient ${patientId} by admin ${auth.userName}`);

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient has active appointments
    const activeAppointments = await Appointment.countDocuments({
      patient: patientId,
      status: { $in: ["scheduled", "confirmed", "checked-in"] }
    });

    if (activeAppointments > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Cannot delete patient with active appointments. Please cancel all appointments first." 
        },
        { status: 400 }
      );
    }

    // Soft delete: Mark as inactive instead of actual deletion
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { 
        $set: { 
          active: false,
          deletedAt: new Date(),
          deletedBy: auth.userId
        } 
      },
      { new: true }
    ).select("-__v -createdAt -updatedAt");

    // Add audit log entry
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({
        action: 'DELETE_PATIENT',
        entityType: 'Patient',
        entityId: patientId,
        userId: auth.userId,
        userRole: auth.userRole,
        userName: auth.userName,
        changes: { active: false, deletedAt: new Date() },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: "Patient marked as inactive successfully"
    });

  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete patient" },
      { status: 500 }
    );
  }
}

// PATCH: Partial update of patient information
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Only admin and receptionist can update patient information
    const allowedRoles = ["admin", "receptionist", "doctor"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to update patient information." },
        { status: 403 }
      );
    }

    const { id: patientId } = await params;
    const body = await request.json();

    console.log(`Partial update for patient ${patientId} by ${auth.userRole} ${auth.userName}`);

    // Check if patient exists
    const existingPatient = await Patient.findById(patientId);
    if (!existingPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Define allowed fields based on user role
    let allowedFields: string[] = [];
    
    if (auth.userRole === "admin" || auth.userRole === "receptionist") {
      allowedFields = [
        "phone",
        "email",
        "emergencyContact",
        "address",
        "insurance"
      ];
    } else if (auth.userRole === "doctor") {
      allowedFields = [
        "allergies",
        "chronicConditions",
        "currentMedications",
        "familyHistory"
      ];
    }

    // Filter update data to only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Special handling for specific fields
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

    // Update the patient
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-__v -createdAt -updatedAt");

    // Add audit log entry
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({
        action: 'UPDATE_PATIENT_PARTIAL',
        entityType: 'Patient',
        entityId: patientId,
        userId: auth.userId,
        userRole: auth.userRole,
        userName: auth.userName,
        changes: updateData,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: "Patient information updated successfully"
    });

  } catch (error: any) {
    console.error("Error updating patient:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}