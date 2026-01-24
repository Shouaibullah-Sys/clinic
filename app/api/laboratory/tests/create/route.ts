// app/api/laboratory/tests/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    
    // Check if user can create lab tests
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to create lab tests." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      appointment,
      patient,
      doctor,
      testName,
      category,
      description,
      price,
      discountedPrice,
      priority = "routine",
      notes,
      
      // Laboratory specific fields
      specimen,
      collectionDetails,
      parameters,
      turnaroundTime,
      
      // Charges
      charges,
      paymentMethod,
    } = body;
    
    console.log(`Creating lab test by ${auth.userRole} ${auth.userName}:`, { 
      patient, doctor, testName 
    });
    
    // Validate required fields
    if (!patient || !doctor || !testName || !category) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: patient, doctor, testName, category are required." 
        },
        { status: 400 }
      );
    }
    
    // Validate patient exists
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }
    
    // Validate doctor exists
    const doctorExists = await User.findById(doctor);
    if (!doctorExists || !["doctor", "admin"].includes(doctorExists.role)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor or doctor not found" },
        { status: 400 }
      );
    }
    
    // Check if using template
    let testTemplate = null;
    if (body.templateId) {
      testTemplate = await LabTestTemplate.findById(body.templateId);
      if (!testTemplate) {
        return NextResponse.json(
          { success: false, error: "Test template not found" },
          { status: 404 }
        );
      }
    }
    
    // Generate test ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const testId = `LAB${year}${month}${random}`;
    
    // Prepare lab test data
    const labTestData: any = {
      testId,
      appointment: appointment ? new mongoose.Types.ObjectId(appointment) : undefined,
      patient: new mongoose.Types.ObjectId(patient),
      doctor: new mongoose.Types.ObjectId(doctor),
      testName,
      category,
      description,
      price: price || (testTemplate?.basePrice || 0),
      discountedPrice,
      priority,
      notes,
      orderedBy: new mongoose.Types.ObjectId(auth.userId),
      
      // Laboratory module fields
      labReferenceId: undefined, // Will be generated when sample is collected
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      paymentVerified: priority !== "routine", // Urgent/emergency tests don't require payment verification
      
      // Charges
      charges: {
        basePrice: price || (testTemplate?.basePrice || 0),
        tax: charges?.tax || 0,
        discount: charges?.discount || 0,
        otherCharges: charges?.otherCharges || 0,
        totalAmount: 0, // Will be calculated in pre-save
        paid: charges?.paid || 0,
        due: 0, // Will be calculated in pre-save
        paymentStatus: "pending",
        paymentMethod,
        transactionId: charges?.transactionId,
        paymentDate: charges?.paymentDate ? new Date(charges.paymentDate) : undefined,
        collectedBy: charges?.collectedBy ? new mongoose.Types.ObjectId(charges.collectedBy) : undefined,
      },
      
      // Specimen details
      specimen: specimen ? {
        type: specimen.type,
        collectionTime: specimen.collectionTime ? new Date(specimen.collectionTime) : undefined,
        collectedBy: specimen.collectedBy ? new mongoose.Types.ObjectId(specimen.collectedBy) : undefined,
        quantity: specimen.quantity,
        container: specimen.container,
        remarks: specimen.remarks,
      } : undefined,
      
      // Collection details
      collectionDetails: collectionDetails ? {
        collectionTime: collectionDetails.collectionTime ? new Date(collectionDetails.collectionTime) : undefined,
        collectedBy: collectionDetails.collectedBy ? new mongoose.Types.ObjectId(collectionDetails.collectedBy) : undefined,
        collectionNotes: collectionDetails.collectionNotes,
        sampleId: collectionDetails.sampleId,
        sampleCondition: collectionDetails.sampleCondition,
        sampleConditionNotes: collectionDetails.sampleConditionNotes,
      } : undefined,
      
      // If using template, copy parameters
      ...(testTemplate?.parameters && parameters === undefined ? {
        results: {
          parameters: testTemplate.parameters.map((param: { parameterName: string; unit?: string; normalRange: string }) => ({
            name: param.parameterName,
            value: "",
            unit: param.unit,
            normalRange: param.normalRange,
            flag: "normal",
            remarks: "",
          })),
        }
      } : {}),
      
      // Custom parameters if provided
      ...(parameters && parameters.length > 0 ? {
        results: {
          parameters: parameters.map((param: { name: string; value?: any; unit?: string; normalRange?: string; flag?: string; remarks?: string }) => ({
            name: param.name,
            value: param.value || "",
            unit: param.unit,
            normalRange: param.normalRange,
            flag: param.flag || "normal",
            remarks: param.remarks,
          })),
        }
      } : {}),
      
      turnaroundTime: turnaroundTime || (testTemplate?.turnaroundTime || 24),
    };
    
    // Create the lab test
    const labTest = new LabTest(labTestData);
    await labTest.save();
    
    // Populate the created test for response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone age gender")
      .populate("doctor", "name specialization phone")
      .populate("orderedBy", "name")
      .populate("appointment", "appointmentId date")
      .lean();
    
    return NextResponse.json({
      success: true,
      data: populatedTest,
      message: "Lab test created successfully",
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating lab test:", error);
    
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
      return NextResponse.json(
        { success: false, error: "Duplicate test ID detected. Please try again." },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lab test" },
      { status: 500 }
    );
  }
}

// GET: Get test templates and required data for creating lab test
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    
    // Check if user can access laboratory
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    
    // Get test templates
    const testTemplates = await LabTestTemplate.find({ active: true })
      .populate("createdBy", "name")
      .sort({ category: 1, testName: 1 })
      .lean();
    
    let patientData = null;
    let doctorData = null;
    
    // Get patient data if patientId is provided
    if (patientId) {
      patientData = await Patient.findById(patientId)
        .select("name patientId phone age gender bloodGroup allergies medicalHistory")
        .lean();
    }
    
    // Get doctor data if doctorId is provided
    if (doctorId) {
      doctorData = await User.findById(doctorId)
        .select("name specialization department phone email")
        .lean();
    }
    
    // Get categories from templates
    const categories = [...new Set(testTemplates.map(template => template.category))];
    
    // Get specimen types
    const specimenTypes = ["blood", "urine", "stool", "tissue", "saliva", "other"];
    
    // Get priority options
    const priorityOptions = [
      { value: "routine", label: "Routine", description: "Standard processing time" },
      { value: "urgent", label: "Urgent", description: "Priority processing" },
      { value: "emergency", label: "Emergency", description: "Immediate processing" },
    ];
    
    // Get test categories with descriptions
    const testCategories = [
      { value: "hematology", label: "Hematology", description: "Blood cell analysis" },
      { value: "blood_test", label: "Blood Test", description: "General blood tests" },
      { value: "urine_test", label: "Urine Test", description: "Urinalysis" },
      { value: "stool_test", label: "Stool Test", description: "Stool analysis" },
      { value: "imaging", label: "Imaging", description: "X-ray, MRI, CT scan" },
      { value: "biopsy", label: "Biopsy", description: "Tissue sample analysis" },
      { value: "culture", label: "Culture", description: "Microbial culture" },
      { value: "hormone_test", label: "Hormone Test", description: "Hormone level analysis" },
      { value: "genetic_test", label: "Genetic Test", description: "Genetic analysis" },
      { value: "other", label: "Other", description: "Other tests" },
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        testTemplates,
        patient: patientData,
        doctor: doctorData,
        categories,
        specimenTypes,
        priorityOptions,
        testCategories,
        paymentMethods: ["cash", "card", "upi", "netbanking", "cheque", "insurance"],
        
        // Default test parameters for common tests
        defaultParameters: {
          "cbc": [
            { name: "Hemoglobin", unit: "g/dL", normalRange: "12.0-16.0", criticalLow: 7, criticalHigh: 20 },
            { name: "WBC Count", unit: "x10³/µL", normalRange: "4.0-11.0", criticalLow: 2, criticalHigh: 30 },
            { name: "Platelet Count", unit: "x10³/µL", normalRange: "150-400", criticalLow: 50, criticalHigh: 1000 },
            { name: "RBC Count", unit: "x10⁶/µL", normalRange: "4.0-5.5", criticalLow: 3, criticalHigh: 7 },
          ],
          "blood_sugar": [
            { name: "Fasting Blood Sugar", unit: "mg/dL", normalRange: "70-100", criticalLow: 50, criticalHigh: 200 },
            { name: "Post Prandial", unit: "mg/dL", normalRange: "<140", criticalLow: 50, criticalHigh: 300 },
            { name: "HbA1c", unit: "%", normalRange: "<5.7", criticalLow: 4, criticalHigh: 10 },
          ],
          "lipid_profile": [
            { name: "Total Cholesterol", unit: "mg/dL", normalRange: "<200", criticalLow: 0, criticalHigh: 300 },
            { name: "LDL Cholesterol", unit: "mg/dL", normalRange: "<100", criticalLow: 0, criticalHigh: 190 },
            { name: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40", criticalLow: 20, criticalHigh: 100 },
            { name: "Triglycerides", unit: "mg/dL", normalRange: "<150", criticalLow: 0, criticalHigh: 500 },
          ],
        },
        
        // Default charges configuration
        defaultCharges: {
          taxPercentage: 18,
          otherCharges: 0,
        },
      },
    });
    
  } catch (error: any) {
    console.error("Error fetching lab test creation data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab test creation data" },
      { status: 500 }
    );
  }
}