// lib/api/services/route.ts - List all services
import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload, getUserServices } from "@/lib/auth.jwt";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessibleServices = getUserServices(user);
    
    const services = accessibleServices.map(service => {
      const serviceInfo = {
        name: service,
        displayName: getServiceDisplayName(service),
        description: getServiceDescription(service),
        endpoint: `/api/services/${service}`,
        icon: getServiceIcon(service),
        color: getServiceColor(service),
        permissions: ['read', 'create'] // Default permissions
      };
      
      // Add specific permissions based on service type
      if (service === 'emergency') {
        serviceInfo.permissions.push('update', 'dispatch');
      }
      if (service === 'pharmacy') {
        serviceInfo.permissions.push('administer');
      }
      if (service === 'laboratory') {
        serviceInfo.permissions.push('report');
      }
      
      return serviceInfo;
    });
    
    return NextResponse.json({
      services,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
        accessibleServices
      }
    });
  } catch (error: any) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// Helper functions
function getServiceDisplayName(service: string): string {
  const displayNames: Record<string, string> = {
    xray: 'X-Ray',
    ct_scan: 'CT Scan',
    mri: 'MRI',
    ultrasound: 'Ultrasound',
    emergency: 'Emergency',
    opd: 'OPD',
    laboratory: 'Laboratory',
    ot: 'Operation Theatre',
    pharmacy: 'Pharmacy',
    indo: 'Indoor Patient',
    lithotripsy: 'Lithotripsy',
    endoscopy: 'Endoscopy',
    ambulance: 'Ambulance',
    dental: 'Dental',
    ecg: 'ECG'
  };
  return displayNames[service] || service;
}

function getServiceDescription(service: string): string {
  const descriptions: Record<string, string> = {
    xray: 'X-Ray imaging services',
    ct_scan: 'Computed Tomography scans',
    mri: 'Magnetic Resonance Imaging',
    ultrasound: 'Ultrasound diagnostic services',
    emergency: 'Emergency medical services',
    opd: 'Outpatient Department services',
    laboratory: 'Laboratory tests and analysis',
    ot: 'Operation Theatre and surgical procedures',
    pharmacy: 'Medication dispensing and management',
    indo: 'Inpatient care and management',
    lithotripsy: 'Kidney stone treatment',
    endoscopy: 'Endoscopic procedures',
    ambulance: 'Ambulance and patient transport',
    dental: 'Dental care and treatment',
    ecg: 'Electrocardiogram services'
  };
  return descriptions[service] || `${service} services`;
}

function getServiceIcon(service: string): string {
  const icons: Record<string, string> = {
    xray: '🩻',
    ct_scan: '📷',
    mri: '🧲',
    ultrasound: '👶',
    emergency: '🚨',
    opd: '👨‍⚕️',
    laboratory: '🧪',
    ot: '🔪',
    pharmacy: '💊',
    indo: '🏥',
    lithotripsy: '💎',
    endoscopy: '🔬',
    ambulance: '🚑',
    dental: '🦷',
    ecg: '📈'
  };
  return icons[service] || '🏥';
}

function getServiceColor(service: string): string {
  const colors: Record<string, string> = {
    xray: 'blue',
    ct_scan: 'cyan',
    mri: 'purple',
    ultrasound: 'pink',
    emergency: 'red',
    opd: 'green',
    laboratory: 'orange',
    ot: 'violet',
    pharmacy: 'teal',
    indo: 'indigo',
    lithotripsy: 'amber',
    endoscopy: 'lime',
    ambulance: 'rose',
    dental: 'emerald',
    ecg: 'sky'
  };
  return colors[service] || 'gray';
}