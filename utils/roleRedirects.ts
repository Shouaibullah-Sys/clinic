// utils/roleRedirects.ts
export const getDashboardPath = (role: string): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "doctor":
      return "/doctor/dashboard";
    case "nurse":
      return "/nurse/dashboard";
    case "receptionist":
      return "/reception/dashboard";
    case "pharmacist":
      return "/pharmacy/dashboard";
    case "lab_technician":
      return "/laboratory/dashboard";
    case "radiologist":
      return "/radiology/dashboard";
    case "admission":
      return "/admissions/dashboard";
    case "staff":
    default:
      return "/staff/dashboard";
  }
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case "admin":
      return "Administrator";
    case "doctor":
      return "Doctor";
    case "nurse":
      return "Nurse";
    case "receptionist":
      return "Receptionist";
    case "pharmacist":
      return "Pharmacist";
    case "lab_technician":
      return "Lab Technician";
    case "radiologist":
      return "Radiologist";
    case "admission":
      return "Admission Staff";
    case "staff":
      return "Staff";
    default:
      return "User";
  }
};

export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    admin: ["admin"],
    doctor: ["admin", "doctor"],
    nurse: ["admin", "doctor", "nurse"],
    receptionist: ["admin", "receptionist"],
    pharmacist: ["admin", "pharmacist"],
    lab_technician: ["admin", "lab_technician"],
    radiologist: ["admin", "radiologist"],
    admission: ["admin", "admission"],
    staff: ["admin", "staff"],
  };

  const allowedRoles = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || [];
  return allowedRoles.includes(userRole);
};