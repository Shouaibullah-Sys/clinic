// app/api/fix-test/[id]/doctor/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { User } from "@/lib/models/User";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id: testId } = await params;

    console.log(`Fixing doctor for test: ${testId}`);

    // Find the test
    const test = await LabTest.findById(testId);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    console.log("Current test:", {
      testId: test.testId,
      doctor: test.doctor,
      orderedBy: test.orderedBy
    });

    // Find a doctor to assign
    let doctorToAssign = null;
    
    // First, check if orderedBy is a doctor
    if (test.orderedBy) {
      const orderedByUser = await User.findById(test.orderedBy);
      if (orderedByUser && orderedByUser.role === 'doctor') {
        doctorToAssign = test.orderedBy;
        console.log("Found doctor from orderedBy:", orderedByUser.name);
      }
    }
    
    // If not, find any active doctor
    if (!doctorToAssign) {
      const anyDoctor = await User.findOne({ role: 'doctor', active: true });
      if (anyDoctor) {
        doctorToAssign = anyDoctor._id;
        console.log("Found random doctor:", anyDoctor.name);
      }
    }
    
    // If still no doctor, use a system default
    if (!doctorToAssign) {
      // Create a default doctor user if none exists
      const defaultDoctor = new User({
        name: "System Doctor",
        email: "system@hospital.com",
        role: "doctor",
        phone: "0000000000",
        password: "default123",
        active: true,
        approved: true
      });
      await defaultDoctor.save();
      doctorToAssign = defaultDoctor._id;
      console.log("Created default doctor");
    }

    // Update the test
    test.doctor = doctorToAssign;
    await test.save();

    // Populate and return
    await test.populate("doctor", "name");
    await test.populate("patient", "name patientId");

    return NextResponse.json({
      success: true,
      message: "Test doctor fixed successfully",
      data: {
        testId: test.testId,
        doctor: test.doctor,
        patient: test.patient
      }
    });

  } catch (error: any) {
    console.error("Error fixing test:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}