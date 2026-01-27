// api/doctor/patients/[id]/prescriptions/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    
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
    
    // Only doctors and admins can create prescriptions
    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    // Rest of existing code...
  } catch (error: any) {
    // Error handling...
  }
}