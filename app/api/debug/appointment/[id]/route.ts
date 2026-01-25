// app/api/debug/appointment/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { LabTest } from "@/lib/models/LabTest";
import { Prescription } from "@/lib/models/Prescription";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: appointmentId } = await params;
    
    console.log(`Debugging appointment: ${appointmentId}`);
    
    // Check appointment exists
    const appointment = await Appointment.findById(appointmentId);
    console.log(`Appointment exists: ${!!appointment}`);
    
    // Count lab tests
    const labTestCount = await LabTest.countDocuments({ appointment: appointmentId });
    console.log(`Lab tests count: ${labTestCount}`);
    
    // Count prescriptions
    const prescriptionCount = await Prescription.countDocuments({ appointment: appointmentId });
    console.log(`Prescriptions count: ${prescriptionCount}`);
    
    // List all lab tests
    const allLabTests = await LabTest.find({ appointment: appointmentId }).select("testId testName appointment").lean();
    console.log("All lab tests:", allLabTests);
    
    // List all prescriptions
    const allPrescriptions = await Prescription.find({ appointment: appointmentId }).select("prescriptionId appointment").lean();
    console.log("All prescriptions:", allPrescriptions);
    
    return NextResponse.json({
      success: true,
      data: {
        appointmentExists: !!appointment,
        labTestCount,
        prescriptionCount,
        allLabTests,
        allPrescriptions
      }
    });
    
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}