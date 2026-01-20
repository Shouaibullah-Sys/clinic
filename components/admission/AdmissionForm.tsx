// components/admission/AdmissionForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

const admissionSchema = z.object({
  patient: z.string().refine(val => val !== "placeholder" && val !== "", {
    message: "Patient is required"
  }),
  reason: z.string().min(1, "Reason is required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  ward: z.string().min(1, "Ward is required"),
  bedNumber: z.string().min(1, "Bed number is required"),
  roomType: z.enum(["general", "private", "semi-private", "icu", "emergency"]),
  expectedStay: z.number().min(1, "Expected stay must be at least 1 day"),
  doctor: z.string().optional(),
  notes: z.string().optional(),
});

type AdmissionFormData = z.infer<typeof admissionSchema>;

interface Patient {
  _id: string;
  patientId: string;
  name: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
}

export function AdmissionForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      roomType: "general",
      expectedStay: 1,
      doctor: user?._id, // Default to current user if they're a doctor
    },
  });

  const onSubmit = async (data: AdmissionFormData) => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/admissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Admission created successfully");
        reset();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create admission");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async (search: string) => {
    try {
      const response = await fetch(`/api/patients?search=${search}`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch("/api/users?role=doctor");
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.data || []);
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Patient *
          </label>
          <select
            {...register("patient")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="placeholder">Select Patient</option>
            {patients.map((patient) => (
              <option key={patient._id} value={patient._id}>
                {patient.name} ({patient.patientId})
              </option>
            ))}
          </select>
          {errors.patient && (
            <p className="mt-1 text-sm text-red-600">{errors.patient.message}</p>
          )}
        </div>

        {/* Doctor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Doctor
          </label>
          <select
            {...register("doctor")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="placeholder">Select Doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
              </option>
            ))}
          </select>
        </div>

        {/* Ward and Bed */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ward *
          </label>
          <input
            type="text"
            {...register("ward")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., General Ward, ICU"
          />
          {errors.ward && (
            <p className="mt-1 text-sm text-red-600">{errors.ward.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bed Number *
          </label>
          <input
            type="text"
            {...register("bedNumber")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., A-101"
          />
          {errors.bedNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.bedNumber.message}</p>
          )}
        </div>

        {/* Room Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Room Type
          </label>
          <select
            {...register("roomType")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="general">General</option>
            <option value="private">Private</option>
            <option value="semi-private">Semi-Private</option>
            <option value="icu">ICU</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        {/* Expected Stay */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Expected Stay (days) *
          </label>
          <input
            type="number"
            {...register("expectedStay", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            min="1"
          />
          {errors.expectedStay && (
            <p className="mt-1 text-sm text-red-600">
              {errors.expectedStay.message}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Reason for Admission *
          </label>
          <textarea
            {...register("reason")}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe the reason for admission"
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
          )}
        </div>

        {/* Diagnosis */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Diagnosis *
          </label>
          <textarea
            {...register("diagnosis")}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter the diagnosis"
          />
          {errors.diagnosis && (
            <p className="mt-1 text-sm text-red-600">{errors.diagnosis.message}</p>
          )}
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Additional Notes
          </label>
          <textarea
            {...register("notes")}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Admission"}
        </button>
      </div>
    </form>
  );
}
