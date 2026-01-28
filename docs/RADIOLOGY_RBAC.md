# Radiology Role-Based Access Control (RBAC) Documentation

## Overview

This document outlines the role-based access control (RBAC) implementation for radiology features in the hospital management system. All radiology endpoints and pages are protected with proper authentication and authorization checks.

## Roles and Permissions

### Radiologist

- **Primary Role**: `radiologist`
- **Access Level**: Full access to radiology workflow
- **Permissions**:
  - View all radiology requests
  - Update request status (scheduled → in-progress → completed)
  - Add tests and parameters to requests
  - Submit radiology results (findings, impression, recommendations)
  - View patient information for radiology requests
  - Access radiologist dashboard

### Receptionist

- **Primary Role**: `receptionist`
- **Access Level**: Payment and billing management
- **Permissions**:
  - View all radiology requests
  - Process payments for radiology services
  - Update billing status (pending → billed → paid)
  - View billing details
  - Access reception radiology dashboard

### Doctor

- **Primary Role**: `doctor`
- **Access Level**: Imaging study ordering and viewing
- **Permissions**:
  - Order new imaging studies for patients
  - View imaging studies for their patients
  - View imaging results and reports
  - Access imaging services pages

### Admin

- **Primary Role**: `admin`
- **Access Level**: Full access to all radiology features
- **Permissions**: All permissions from radiologist, receptionist, and doctor roles

## API Endpoints

### Radiologist Endpoints

#### GET `/api/radiologist/requests`

- **Purpose**: Fetch radiology requests for radiologist
- **Allowed Roles**: `radiologist`, `admin`
- **Access Control**:
  - Only shows requests with payment verified (billingStatus: "paid" or "billed")
  - High priority requests (urgent/emergency) shown even if unpaid
  - Filters by status tabs: pending, in-progress, completed, all

#### GET `/api/radiologist/requests/[id]`

- **Purpose**: Get a single radiology request by ID
- **Allowed Roles**: `radiologist`, `admin`, `doctor`
- **Access Control**:
  - Doctors can only access their own requests
  - Radiologists and admins can access any request

#### PUT `/api/radiologist/requests/[id]/status`

- **Purpose**: Update radiology request status
- **Allowed Roles**: `radiologist`, `admin`
- **Access Control**:
  - Validates status transitions
  - Requires payment verification for routine tests before starting
  - Assigns radiologist when starting procedure

#### PUT `/api/radiologist/requests/[id]/tests`

- **Purpose**: Add tests and parameters to radiology request
- **Allowed Roles**: `radiologist`, `admin`
- **Access Control**:
  - Only allowed for scheduled or in-progress requests
  - Stores custom test data in request

#### PUT `/api/radiologist/requests/[id]/results`

- **Purpose**: Submit radiology results
- **Allowed Roles**: `radiologist`, `admin`
- **Access Control**:
  - Requires findings and impression
  - Only allowed for scheduled or in-progress requests
  - Cannot submit if report already completed
  - Sets report status to completed

### Receptionist Endpoints

#### GET `/api/reception/radiology/requests`

- **Purpose**: Fetch radiology requests for payment processing
- **Allowed Roles**: `receptionist`, `admin`
- **Access Control**:
  - Filters by billing status tabs: pending, billed, paid, all
  - Shows all requests except cancelled

#### GET `/api/reception/radiology/requests/[id]/payment`

- **Purpose**: Get billing details for a radiology request
- **Allowed Roles**: `receptionist`, `admin`
- **Access Control**: Returns billing information with pricing

#### PUT `/api/reception/radiology/requests/[id]/payment`

- **Purpose**: Update payment status for radiology request
- **Allowed Roles**: `receptionist`, `admin`
- **Access Control**:
  - Validates billing status transitions
  - Cannot update cancelled requests
  - Records payment processor and timestamp

### Doctor Endpoints

#### GET `/api/doctor/patients/[id]/imaging`

- **Purpose**: Get imaging studies for a patient
- **Allowed Roles**: `doctor`, `admin`
- **Access Control**:
  - Only shows studies ordered by the requesting doctor
  - Returns studies for specific patient

#### POST `/api/doctor/patients/[id]/imaging`

- **Purpose**: Order a new imaging study for a patient
- **Allowed Roles**: `doctor`, `admin`
- **Access Control**:
  - Validates service type (x-ray, ct-scan, mri, ultrasound)
  - Validates priority (routine, urgent, emergency)
  - Links to appointment if provided

#### GET `/api/doctor/patients/[id]/imaging/[studyId]`

- **Purpose**: Get a specific imaging study with results
- **Allowed Roles**: `doctor`, `admin`
- **Access Control**:
  - Only shows studies ordered by the requesting doctor
  - Returns full details including results

## Page Routes

### Radiologist Dashboard

- **Route**: `/services/imaging/radiologist`
- **Allowed Roles**: `radiologist`, `admin`
- **Features**:
  - View pending, in-progress, and completed requests
  - Start and complete requests
  - Add tests and parameters
  - Submit results
  - Filter by status and priority

### Reception Radiology Dashboard

- **Route**: `/services/imaging/reception`
- **Allowed Roles**: `receptionist`, `admin`
- **Features**:
  - View pending, billed, and paid requests
  - Process payments
  - View billing details
  - Track revenue

### Imaging Services

- **Route**: `/services/imaging`
- **Allowed Roles**: `doctor`, `admin`
- **Features**:
  - View imaging service types
  - Order imaging studies (via patient pages)

## Middleware Protection

The middleware enforces route-level protection:

```typescript
// Radiologist dashboard protection
if (
  pathname.startsWith("/services/imaging/radiologist") &&
  !["admin", "radiologist"].includes(userRole)
) {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

// Reception radiology dashboard protection
if (
  pathname.startsWith("/services/imaging/reception") &&
  !["admin", "receptionist"].includes(userRole)
) {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

// General radiology routes
if (
  pathname.startsWith("/radiology/") &&
  !["admin", "radiologist"].includes(userRole)
) {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}
```

## Role Route Mapping

### Radiologist

```typescript
radiologist: [
  "/radiology",
  "/dashboard",
  "/imaging",
  "/radiology-reports",
  "/services/imaging/radiologist",
];
```

### Receptionist

```typescript
receptionist: [
  "/reception",
  "/dashboard",
  "/patients",
  "/admissions",
  "/appointments",
  "/billing",
  "/reception/lab-tests",
  "/services/imaging/reception",
];
```

### Doctor

```typescript
doctor: [
  "/doctor",
  "/dashboard",
  "/patients",
  "/admissions",
  "/prescriptions",
  "/medical-records",
  "/doctor/dashboard",
  "/doctor/patients",
  "/doctor/appointments",
  "/doctor/prescriptions",
  "/doctor/lab-tests",
  "/services/imaging",
];
```

## Navigation

The service sidebar includes role-specific navigation links:

### Imaging Section

- **X-Ray**: `/services/imaging?type=xray`
- **CT Scan**: `/services/imaging?type=ct_scan`
- **MRI**: `/services/imaging?type=mri`
- **Ultrasound**: `/services/imaging?type=ultrasound`
- **Radiologist Dashboard**: `/services/imaging/radiologist` (radiologist only)
- **Reception Radiology**: `/services/imaging/reception` (receptionist only)

Role-based filtering ensures users only see navigation items relevant to their role.

## Authentication Pattern

All API endpoints use the centralized authentication pattern:

```typescript
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// Authenticate request
const auth = await authenticateRequest(request);
if (!auth.success) {
  return NextResponse.json(
    { success: false, error: auth.error },
    { status: auth.status || 401 },
  );
}

// Check role permissions
const allowedRoles = ["radiologist", "admin"];
if (!hasRequiredRole(auth.userRole, allowedRoles)) {
  return NextResponse.json(
    {
      success: false,
      error: "Forbidden. You don't have permission to access this resource.",
      userRole: auth.userRole,
      allowedRoles: allowedRoles,
    },
    { status: 403 },
  );
}
```

## Security Considerations

1. **Token Validation**: All requests require valid JWT tokens
2. **Role Verification**: Each endpoint checks user role against allowed roles
3. **Data Isolation**: Doctors can only access their own patients' data
4. **Status Validation**: Status transitions are validated to prevent invalid state changes
5. **Payment Verification**: Routine tests require payment verification before starting
6. **Admin Override**: Admins have access to all features for troubleshooting

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized. No authentication token provided."
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Forbidden. You don't have permission to access this resource.",
  "userRole": "doctor",
  "allowedRoles": ["radiologist", "admin"]
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Radiology request not found"
}
```

## Testing Checklist

- [ ] Radiologist can access their dashboard
- [ ] Receptionist can access their dashboard
- [ ] Doctor can order imaging studies
- [ ] Doctor can view imaging results
- [ ] Radiologist can update request status
- [ ] Radiologist can submit results
- [ ] Receptionist can process payments
- [ ] Admin can access all radiology features
- [ ] Unauthorized users are redirected to login
- [ ] Users without proper role see unauthorized page
- [ ] Navigation links are filtered by role
- [ ] API endpoints return proper error codes

## Future Enhancements

1. **Audit Logging**: Track all radiology actions for compliance
2. **Permission Granularity**: More fine-grained permissions (e.g., view-only vs. edit)
3. **Role Delegation**: Allow temporary role delegation for coverage
4. **Multi-factor Authentication**: Enhanced security for sensitive operations
5. **Rate Limiting**: Prevent abuse of API endpoints
