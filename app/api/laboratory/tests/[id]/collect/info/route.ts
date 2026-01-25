// api/laboratory/tests/[id]/collect/info/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Appointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(
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

    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;

    console.log(`Fetching lab test info for ID: ${testId}`);

    // Calculate age function
    const calculateAge = (dateOfBirth: Date): number => {
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

    // First, get the test with basic population
    const test = await LabTest.findById(testId)
      .populate("patient", "name patientId phone dateOfBirth gender")
      .populate("orderedBy", "name role")
      .populate("doctor", "name")
      .lean();

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    console.log("Initial populated test:", {
      testId: test.testId,
      patient: test.patient,
      doctor: test.doctor,
      orderedBy: test.orderedBy
    });

    // Get doctor information - try multiple strategies
    let doctorInfo = { name: "Doctor Not Assigned" };
    
    // Strategy 1: Check if doctor field is populated
    if (test.doctor && typeof test.doctor === 'object' && 'name' in test.doctor) {
      doctorInfo = { name: (test.doctor as any).name };
      console.log("Found doctor from test.doctor field:", doctorInfo);
    }
    // Strategy 2: Check if orderedBy is a doctor
    else if (test.orderedBy && typeof test.orderedBy === 'object') {
      const orderedByUser = test.orderedBy as any;
      if (orderedByUser.role === 'doctor') {
        doctorInfo = { name: orderedByUser.name };
        console.log("Found doctor from orderedBy (who is a doctor):", doctorInfo);
      } else {
        console.log("OrderedBy is not a doctor, role:", orderedByUser.role);
      }
    }
    // Strategy 3: Try to get doctor from appointment
    else if (test.appointment) {
      try {
        const appointment = await Appointment.findById(test.appointment)
          .populate("doctor", "name")
          .lean();
        
        if (appointment && appointment.doctor && typeof appointment.doctor === 'object') {
          doctorInfo = { name: (appointment.doctor as any).name };
          console.log("Found doctor from appointment:", doctorInfo);
        }
      } catch (err) {
        console.error("Error fetching appointment:", err);
      }
    }

    // Calculate age for patient
    let patientAge = null;
    let patientDateOfBirth = null;
    let patientGender = null;
    
    if (test.patient && typeof test.patient === 'object') {
      const patient = test.patient as any;
      patientDateOfBirth = patient.dateOfBirth || null;
      patientGender = patient.gender || null;
      
      if (patientDateOfBirth) {
        try {
          patientAge = calculateAge(new Date(patientDateOfBirth));
          console.log("Calculated patient age:", patientAge, "from DOB:", patientDateOfBirth);
        } catch (err) {
          console.error("Error calculating age:", err);
        }
      }
    }

    // Prepare response data
    const responseData: any = {
      ...test,
      _id: test._id.toString(),
      doctor: doctorInfo,
      patient: {
        _id: (test.patient as any)?._id?.toString() || null,
        name: (test.patient as any)?.name || "Unknown Patient",
        patientId: (test.patient as any)?.patientId || "N/A",
        phone: (test.patient as any)?.phone || null,
        dateOfBirth: patientDateOfBirth,
        age: patientAge,
        gender: patientGender
      },
      collectionStatus: test.collectionStatus || "pending",
      charges: test.charges || {
        paymentStatus: "pending",
        paid: 0,
        due: 0
      },
      priority: test.priority || "routine",
      status: test.status || "pending"
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
        error: error.message || "Failed to fetch test information",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}