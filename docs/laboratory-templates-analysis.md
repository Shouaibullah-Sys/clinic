# Laboratory Templates Implementation Analysis

## Executive Summary

The laboratory templates feature is **partially connected to real database data**. The frontend makes API calls to fetch, create, update, and delete templates, and the database models exist. However, there is a **critical missing endpoint** for the status toggle functionality.

---

## 1. Current State of the Templates Page

### [`app/laboratory/templates/page.tsx`](app/laboratory/templates/page.tsx)

#### Data Flow

- **Authentication**: Uses `useAuthStore` to get `accessToken`
- **Data Fetching**: Calls `/api/laboratory/templates` endpoint
- **State Management**: Uses React `useState` and `useEffect`

#### Current Operations

| Operation       | Method | Endpoint                                | Status         |
| --------------- | ------ | --------------------------------------- | -------------- |
| Fetch templates | GET    | `/api/laboratory/templates`             | ✅ Working     |
| Delete template | DELETE | `/api/laboratory/templates/[id]`        | ✅ Working     |
| Toggle status   | PUT    | `/api/laboratory/templates/[id]/status` | ❌ **Missing** |

#### Frontend Interface

```typescript
interface LabTestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired: boolean;
  preparationInstructions?: string;
  turnaroundTime: number;
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit?: string;
    normalRange: string;
    criticalLow?: number;
    criticalHigh?: number;
    maleRange?: string;
    femaleRange?: string;
    childRange?: string;
    methodology?: string;
  }>;
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}
```

#### UI Features

- Search by test code, name, or description
- Filter by category (Hematology, Biochemistry, Microbiology, etc.)
- Filter by status (Active/Inactive)
- Statistics cards (Total Templates, Categories, Avg Parameters, Avg Price)
- Table view and category tabs view
- Actions: View, Edit, Duplicate, Toggle Status, Delete

---

## 2. Database Models

### [`lib/models/LabTestTemplate.ts`](lib/models/LabTestTemplate.ts)

The `LabTestTemplate` model is **well-defined** with the following schema:

```typescript
interface ILabTestTemplate extends mongoose.Document {
  testCode: string; // Unique, uppercase
  testName: string; // Required
  category: string; // Required, enum values
  description?: string;
  specimenType: string[]; // Enum: blood, urine, stool, csf, etc.
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired: boolean; // Default: false
  preparationInstructions?: string;
  turnaroundTime: number; // Hours (1-720)
  basePrice: number; // Required, min: 0
  active: boolean; // Default: true
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit?: string;
    normalRange: string;
    criticalLow?: number;
    criticalHigh?: number;
    maleRange?: string;
    femaleRange?: string;
    childRange?: string;
    methodology?: string;
  }>;
  createdBy: mongoose.Types.ObjectId; // Ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

#### Valid Categories

- `hematology`
- `biochemistry`
- `microbiology`
- `serology`
- `immunology`
- `hormonal`
- `urinalysis`
- `stool_test`
- `molecular`
- `imaging`
- `other`

#### Indexes

- `testName: 1`
- `category: 1`
- `active: 1`
- `basePrice: 1`
- `createdAt: -1`

---

### [`lib/models/LabTest.ts`](lib/models/LabTest.ts)

The `LabTest` model represents **actual lab test orders** (not templates), but is related to templates.

Key fields:

- `testId: string` - Unique test identifier
- `patient: mongoose.Types.ObjectId` - Ref: Patient
- `doctor?: mongoose.Types.ObjectId` - Ref: User
- `testName: string`
- `category: string`
- `price: number`
- `discountedPrice?: number`
- `status` - pending, ordered, collected, processing, completed, reported, cancelled
- `isDirectTest: boolean`
- `paymentVerified: boolean`

---

### [`lib/models/User.ts`](lib/models/User.ts)

User model with roles relevant to laboratory:

| Role             | Description                        |
| ---------------- | ---------------------------------- |
| `admin`          | Full access                        |
| `doctor`         | Can order tests, view results      |
| `lab_technician` | Can collect samples, process tests |
| `receptionist`   | Can view tests, update charges     |

**Template Permissions:**

- Create: `lab_technician`, `doctor`, `admin`
- Update: `lab_technician`, `doctor`, `admin`
- Delete: `admin` only

---

### [`lib/models/Patient.ts`](lib/models/Patient.ts)

Patient model used for lab test orders:

- `patientId: string` - Unique identifier
- `name: string`
- `phone: string`
- `dateOfBirth: Date`
- `gender: male | female | other`
- `bloodGroup?: string`
- `allergies?: string[]`

---

## 3. API Endpoints Analysis

### Current Endpoints

#### GET `/api/laboratory/templates`

- **Purpose**: Fetch all templates with optional filtering
- **Query Parameters**: `category`, `active`, `search`
- **Authentication**: Required
- **Response**:

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### POST `/api/laboratory/templates`

- **Purpose**: Create a new template
- **Authentication**: Required
- **Role Required**: `lab_technician`, `doctor`, `admin`
- **Validation**: `testCode`, `testName`, `category`, `turnaroundTime`, `basePrice` required
- **Duplicate Check**: `testCode` must be unique

#### GET `/api/laboratory/templates/[id]`

- **Purpose**: Fetch a single template by ID
- **Authentication**: Required
- **Response**: Single template object with populated `createdBy`

#### PUT `/api/laboratory/templates/[id]`

- **Purpose**: Update a template
- **Authentication**: Required
- **Role Required**: `lab_technician`, `doctor`, `admin`
- **Validation**: Same as POST
- **Duplicate Check**: If updating `testCode`, checks for duplicates

#### DELETE `/api/laboratory/templates/[id]`

- **Purpose**: Delete a template
- **Authentication**: Required
- **Role Required**: `admin` only
- **Response**: Success message

---

### Missing Endpoints

#### ❌ PUT `/api/laboratory/templates/[id]/status`

**Critical Issue**: The frontend calls this endpoint (line 262 in `page.tsx`) but it doesn't exist.

The frontend code:

```typescript
const response = await fetch(
  `/api/laboratory/templates/${template._id}/status`,
  {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ active: !template.active }),
  },
);
```

**Workaround**: The same functionality can be achieved using the existing `PUT /api/laboratory/templates/[id]` endpoint by sending just the `active` field.

---

## 4. Integration Status

### ✅ What's Working

1. **Template Listing**: Full CRUD operations via API
2. **Authentication**: JWT-based auth implemented
3. **Filtering**: Server-side filtering by category and status
4. **Search**: Server-side search by test name, code, description
5. **Population**: `createdBy` field is populated with user info
6. **Validation**: Required fields and duplicate checks
7. **Database Models**: Complete schema definitions

### ❌ What's Broken

1. **Status Toggle**: Frontend calls non-existent `/api/laboratory/templates/[id]/status` endpoint

### ⚠️ Potential Issues

1. **Pagination**: No pagination in API (could be an issue with large datasets)
2. **Bulk Operations**: No endpoints for bulk activate/deactivate
3. **Import/Export**: Frontend has UI for import/export but no API endpoints
4. **Category Management**: No API to manage categories separately

---

## 5. Recommendations

### Priority 1: Fix Critical Issues

1. **Create Status Toggle Endpoint**

   ```typescript
   // app/api/laboratory/templates/[id]/status/route.ts
   export async function PUT(
     request: NextRequest,
     { params }: { params: Promise<{ id: string }> },
   ) {
     // Implementation similar to PUT in [id]/route.ts but only for active field
   }
   ```

   OR

2. **Modify Frontend** to use existing PUT endpoint
   ```typescript
   // Change from:
   `/api/laboratory/templates/${template._id}/status`
   // To:
   `/api/laboratory/templates/${template._id}`;
   ```

### Priority 2: Enhancements

1. **Add Pagination**
   - Add `page` and `limit` query parameters
   - Return `total`, `page`, `totalPages` in response

2. **Add Bulk Operations**
   - `POST /api/laboratory/templates/bulk/activate`
   - `POST /api/laboratory/templates/bulk/deactivate`
   - `POST /api/laboratory/templates/bulk/delete`

3. **Add Import/Export Endpoints**
   - `POST /api/laboratory/templates/import` - Import from CSV/JSON
   - `GET /api/laboratory/templates/export` - Export to CSV

4. **Add Category Management**
   - `GET /api/laboratory/categories` - List all categories
   - `POST /api/laboratory/categories` - Create category

### Priority 3: Performance & UX

1. **Caching**: Add Redis caching for template list
2. **Audit Trail**: Log all template changes
3. **Versioning**: Track template versions
4. **Soft Delete**: Add `deletedAt` instead of hard delete

---

## 6. Architecture Diagram

```mermaid
flowchart TD
    A[Frontend: laboratory/templates/page.tsx] -->|API Calls| B[API Routes]

    subgraph API Layer
        B1[GET /templates] --> C1[LabTestTemplate Model]
        B2[POST /templates] --> C1
        B3[GET /templates/[id]] --> C1
        B4[PUT /templates/[id]] --> C1
        B5[DELETE /templates/[id]] --> C1
        B6[PUT /templates/[id]/status] -->|MISSING| C1
    end

    subgraph Database
        C1 --> D[(MongoDB LabTestTemplate)]
        C1 --> E[(MongoDB User)]
    end

    F[LabTest Orders] -.->|Uses Template| C1
```

---

## 7. Conclusion

The laboratory templates feature is **70% complete** with a solid foundation. The main issue is a **missing API endpoint** for status toggling. Once this is fixed (either by creating the endpoint or modifying the frontend), the core CRUD operations will be fully functional.

**Next Steps:**

1. Fix the status toggle endpoint (Priority 1)
2. Add pagination for scalability (Priority 2)
3. Implement bulk operations (Priority 2)
4. Add import/export functionality (Priority 2)
