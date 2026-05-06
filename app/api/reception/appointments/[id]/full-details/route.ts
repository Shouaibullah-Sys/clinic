import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!["receptionist", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Receptionist or admin access required." },
        { status: 403 }
      );
    }

    const { id: appointmentId } = await params;

    console.log(`Receptionist ${userId} fetching full details for appointment ${appointmentId}`);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
            guardian: true,
            patientId: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            emergencyContact: true,
            bloodGroup: true,
            allergies: true,
          }
        },
        doctor: {
          select: {
            name: true,
            specialization: true,
            department: true,
            phone: true,
          }
        },
        createdBy: {
          select: { name: true }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    const [labTests, prescriptions, medicalRecords] = await Promise.all([
      prisma.labTest.findMany({
        where: { appointmentId },
        include: {
          patient: { select: { name: true, patientId: true } },
          doctor: { select: { name: true, specialization: true } },
          createdBy: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.prescription.findMany({
        where: { appointmentId },
        include: {
          patient: { select: { name: true, patientId: true } },
          doctor: { select: { name: true, specialization: true } }
        },
        orderBy: { date: "desc" }
      }),
      prisma.medicalRecord.findMany({
        where: { appointmentId },
        include: {
          doctor: { select: { name: true } }
        },
        orderBy: { date: "desc" },
        take: 3
      })
    ]);

    const resolvedConsultationFee =
      appointment.consultationFee ??
      appointment.doctorFee ??
      (appointment.appointmentType === "emergency" ? 150 :
       appointment.appointmentType === "procedure" ? 200 : 100);

    const billingDetails = {
      consultationFee: resolvedConsultationFee,
      labTests: labTests.map(test => {
        const charges = test.charges ? JSON.parse(test.charges as string) : {};
        const base = charges.basePrice || test.discountedPrice || test.price || 0;
        const tax = charges.tax || 0;
        const other = charges.otherCharges || 0;
        const discount = charges.discount || 0;
        const total = base + tax + other - discount;
        const paid = charges.paid || 0;
        const due = charges.due || 0;
        
        return {
          testId: test.testId,
          testName: test.tests,
          basePrice: base,
          tax,
          otherCharges: other,
          discount,
          total,
          paid,
          due,
          paymentStatus: charges.paymentStatus || "pending",
          paymentMethod: charges.paymentMethod
        };
      }),
      prescriptions: prescriptions.map(prescription => {
        return {
          prescriptionId: prescription.prescriptionId,
          medications: prescription.medications,
          total: 0
        };
      }),
      summary: {
        labTestsTotal: labTests.reduce((sum, test) => {
          const charges = test.charges ? JSON.parse(test.charges as string) : {};
          const base = charges.basePrice || test.discountedPrice || test.price || 0;
          const tax = charges.tax || 0;
          const other = charges.otherCharges || 0;
          const discount = charges.discount || 0;
          return sum + base + tax + other - discount;
        }, 0),
        prescriptionsTotal: 0,
        consultationFee: resolvedConsultationFee,
        totalAmount: 0,
        totalPaid: labTests.reduce((sum, test) => {
          const charges = test.charges ? JSON.parse(test.charges as string) : {};
          return sum + (charges.paid || 0);
        }, 0),
        totalDue: labTests.reduce((sum, test) => {
          const charges = test.charges ? JSON.parse(test.charges as string) : {};
          return sum + (charges.due || 0);
        }, 0)
      }
    };

    billingDetails.summary.totalAmount = 
      billingDetails.summary.labTestsTotal + 
      billingDetails.summary.prescriptionsTotal + 
      billingDetails.summary.consultationFee;

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

    const patient = appointment.patient as any;

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
          allergies: patient?.allergies ? JSON.parse(patient.allergies) : []
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
