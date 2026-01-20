// utils/admissionUtils.ts
import { Admission, IAdmission } from "@/lib/models/Admission";
import mongoose from "mongoose";

export interface AdmissionStats {
  total: number;
  admitted: number;
  discharged: number;
  transferred: number;
  cancelled: number;
  averageStay: number;
  occupancyRate: number;
}

export interface WardOccupancy {
  ward: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

export class AdmissionService {
  static async getAdmissionStats(startDate?: Date, endDate?: Date): Promise<AdmissionStats> {
    const filter: any = {};
    
    if (startDate || endDate) {
      filter.admissionDate = {};
      if (startDate) filter.admissionDate.$gte = startDate;
      if (endDate) filter.admissionDate.$lte = endDate;
    }

    const admissions = await Admission.find(filter);
    
    const total = admissions.length;
    const admitted = admissions.filter(a => a.status === "admitted").length;
    const discharged = admissions.filter(a => a.status === "discharged").length;
    const transferred = admissions.filter(a => a.status === "transferred").length;
    const cancelled = admissions.filter(a => a.status === "cancelled").length;

    // Calculate average stay for discharged patients
    const dischargedAdmissions = admissions.filter(a => 
      a.status === "discharged" && a.admissionDate && a.dischargeDate
    );
    
    let averageStay = 0;
    if (dischargedAdmissions.length > 0) {
      const totalDays = dischargedAdmissions.reduce((sum, admission) => {
        const stayDays = Math.ceil(
          (admission.dischargeDate!.getTime() - admission.admissionDate.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        return sum + stayDays;
      }, 0);
      averageStay = totalDays / dischargedAdmissions.length;
    }

    // Mock occupancy rate (you would need total beds data)
    const occupancyRate = (admitted / 100) * 100; // Assuming 100 total beds

    return {
      total,
      admitted,
      discharged,
      transferred,
      cancelled,
      averageStay,
      occupancyRate,
    };
  }

  static async getWardOccupancy(): Promise<WardOccupancy[]> {
    // Group admissions by ward
    const wardData = await Admission.aggregate([
      {
        $match: { status: "admitted" }
      },
      {
        $group: {
          _id: "$ward",
          occupiedBeds: { $sum: 1 }
        }
      }
    ]);

    // This is mock data - you should replace with actual bed capacity data
    const wardCapacities: Record<string, number> = {
      "General Ward": 50,
      "Private Ward": 20,
      "ICU": 10,
      "Emergency": 15,
      "Semi-Private": 30,
    };

    return wardData.map(ward => {
      const totalBeds = wardCapacities[ward._id] || 10;
      const availableBeds = totalBeds - ward.occupiedBeds;
      const occupancyRate = (ward.occupiedBeds / totalBeds) * 100;

      return {
        ward: ward._id,
        totalBeds,
        occupiedBeds: ward.occupiedBeds,
        availableBeds,
        occupancyRate,
      };
    });
  }

  static async getUpcomingDischarges(limit: number = 10): Promise<IAdmission[]> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await Admission.find({
      status: "admitted",
      expectedDischargeDate: { $lte: tomorrow },
    })
      .populate("patient", "name patientId")
      .populate("doctor", "name")
      .sort({ expectedDischargeDate: 1 })
      .limit(limit);
  }

  static async addVitalSigns(
    admissionId: string,
    vitalSigns: any,
    recordedBy: mongoose.Types.ObjectId
  ): Promise<IAdmission> {
    const admission = await Admission.findById(admissionId);
    
    if (!admission) {
      throw new Error("Admission not found");
    }

    admission.vitalSigns.push({
      ...vitalSigns,
      date: new Date(),
    });

    await admission.save();
    return admission;
  }

  static async addTreatment(
    admissionId: string,
    treatment: string,
    administeredBy: mongoose.Types.ObjectId,
    notes?: string
  ): Promise<IAdmission> {
    const admission = await Admission.findById(admissionId);
    
    if (!admission) {
      throw new Error("Admission not found");
    }

    admission.treatments.push({
      date: new Date(),
      treatment,
      administeredBy,
      notes,
    });

    await admission.save();
    return admission;
  }

  static async dischargePatient(
    admissionId: string,
    dischargeSummary: string,
    dischargeDate?: Date
  ): Promise<IAdmission> {
    const admission = await Admission.findById(admissionId);
    
    if (!admission) {
      throw new Error("Admission not found");
    }

    if (admission.status === "discharged") {
      throw new Error("Patient already discharged");
    }

    admission.status = "discharged";
    admission.dischargeDate = dischargeDate || new Date();
    admission.dischargeSummary = dischargeSummary;

    await admission.save();
    return admission;
  }

  static async transferPatient(
    admissionId: string,
    newWard: string,
    newBedNumber: string,
    notes?: string
  ): Promise<IAdmission> {
    const admission = await Admission.findById(admissionId);
    
    if (!admission) {
      throw new Error("Admission not found");
    }

    // Check if new bed is available
    const existingAdmission = await Admission.findOne({
      ward: newWard,
      bedNumber: newBedNumber,
      status: "admitted",
      _id: { $ne: admissionId },
    });

    if (existingAdmission) {
      throw new Error("Bed is already occupied");
    }

    admission.ward = newWard;
    admission.bedNumber = newBedNumber;
    if (notes) admission.notes = `${admission.notes || ''}\nTransfer: ${notes}`;

    await admission.save();
    return admission;
  }
}