// components/admission/AdmissionList.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";

interface Admission {
  _id: string;
  admissionId: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
  };
  doctor: {
    _id: string;
    name: string;
  };
  admissionDate: string;
  status: string;
  ward: string;
  bedNumber: string;
  reason: string;
}

export function AdmissionList() {
  const { user, accessToken } = useAuthStore();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    ward: "",
    search: "",
    page: 1,
    limit: 10,
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAdmissions();
  }, [filters]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.ward && { ward: filters.ward }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admissions?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmissions(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Error loading admissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted": return "bg-green-100 text-green-800";
      case "discharged": return "bg-blue-100 text-blue-800";
      case "transferred": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by admission ID, reason, diagnosis..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="all-status">All Status</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="transferred">Transferred</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.ward}
            onChange={(e) => handleFilterChange("ward", e.target.value)}
          >
            <option value="all-wards">All Wards</option>
            <option value="General Ward">General Ward</option>
            <option value="ICU">ICU</option>
            <option value="Emergency">Emergency</option>
            <option value="Private Ward">Private Ward</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admission ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admission Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ward/Bed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : admissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  No admissions found
                </td>
              </tr>
            ) : (
              admissions.map((admission) => (
                <tr key={admission._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm">{admission.admissionId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {admission.patient.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {admission.patient.patientId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {admission.doctor.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(admission.admissionDate), "dd/MM/yyyy")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{admission.ward}</div>
                    <div className="text-sm text-gray-500">Bed: {admission.bedNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(admission.status)}`}>
                      {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {/* View details */}}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {["admin", "doctor", "nurse"].includes(user?.role || "") && (
                      <button
                        onClick={() => {/* Edit */}}
                        className="text-green-600 hover:text-green-900"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page === 1}
              className="px-3 py-1 rounded-md border disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </span>
            
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page === totalPages}
              className="px-3 py-1 rounded-md border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
