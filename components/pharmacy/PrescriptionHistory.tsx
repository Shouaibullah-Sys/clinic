// components/pharmacy/PrescriptionHistory.tsx
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw } from "lucide-react";
import { generatePharmacyReceipt } from "@/utils/generatePharmacyReceipt";
import {
  IPrescription,
  IPrescriptionMedication,
} from "@/lib/models/Prescription";
import { Types } from "mongoose";
import { IMedicineStock } from "@/lib/models/MedicineStock";

interface User {
  _id: Types.ObjectId;
  name: string;
}

interface MedicineInfo {
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
}

interface PrescriptionItemForReceipt {
  medicine: MedicineInfo;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface PrescriptionForReceipt {
  patientName: string;
  patientPhone: string;
  invoiceNumber: string;
  items: PrescriptionItemForReceipt[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;
  createdAt: string;
  issuedBy?: {
    name: string;
  };
}

interface PrescriptionHistoryProps {
  prescriptions: IPrescription[];
  loading: boolean;
  user: User | null;
  onRefresh: () => void;
}

// Type guard to check if medicine is populated
function isMedicinePopulated(
  medicine: Types.ObjectId | IMedicineStock,
): medicine is IMedicineStock {
  return (medicine as IMedicineStock).name !== undefined;
}

export const PrescriptionHistory = ({
  prescriptions,
  loading,
  user,
  onRefresh,
}: PrescriptionHistoryProps) => {
  const handlePrint = (prescription: IPrescription) => {
    // Transform the prescription data to match the expected format
    const receiptData: PrescriptionForReceipt = {
      patientName: (prescription as any).patient?.name || "Unknown Patient",
      patientPhone: (prescription as any).patient?.phone || "N/A",
      invoiceNumber: prescription.prescriptionId,
      items: prescription.medications.map((item) => {
        let medicineName = item.name;
        let form = item.form;
        let dosage = item.dosage;
        let frequency = item.frequency;
        let route = item.route;

        // If medicine is populated, use its data
        if (item.medicine && isMedicinePopulated(item.medicine)) {
          medicineName = item.medicine.name;
          form = item.medicine.form;
          dosage = item.medicine.dosage;
          frequency = item.medicine.frequency;
          route = item.medicine.route;
        }

        return {
          medicine: {
            name: medicineName,
            form: form,
            dosage: dosage,
            frequency: frequency,
            route: route,
          },
          quantity: item.quantity,
          unitPrice: item.price,
          discount: 0,
        };
      }),
      totalAmount: prescription.charges.totalAmount,
      amountPaid: prescription.charges.paid,
      paymentMethod: prescription.charges.paymentMethod || "N/A",
      createdAt: prescription.createdAt.toISOString(),
      issuedBy: {
        name: user?.name || "System",
      },
    };
    generatePharmacyReceipt(receiptData);
  };

  const getMedicineInfo = (
    medication: IPrescriptionMedication,
  ): MedicineInfo => {
    let medicineName = medication.name;
    let form = medication.form;
    let dosage = medication.dosage;
    let frequency = medication.frequency;
    let route = medication.route;

    // If medicine is populated, use its data
    if (medication.medicine && isMedicinePopulated(medication.medicine)) {
      medicineName = medication.medicine.name;
      form = medication.medicine.form;
      dosage = medication.medicine.dosage;
      frequency = medication.medicine.frequency;
      route = medication.medicine.route;
    }

    return {
      name: medicineName,
      form: form,
      dosage: dosage,
      frequency: frequency,
      route: route,
    };
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No prescriptions found
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <div
              key={prescription._id.toString()}
              className="border rounded-lg p-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-medium text-sm sm:text-base">
                    {(prescription as any).patient?.name || "Unknown Patient"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {prescription.prescriptionId} •{" "}
                    {new Date(prescription.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base font-bold">
                    ${prescription.charges.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm capitalize">
                    {prescription.charges.paymentMethod || "N/A"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-9 gap-2 font-medium text-xs sm:text-sm mb-2">
                  <div className="hidden md:block text-center">#</div>
                  <div>Medicine</div>
                  <div className="hidden md:block text-center">Form</div>
                  <div className="hidden md:block text-center">Dosage</div>
                  <div className="hidden md:block text-center">Frequency</div>
                  <div className="hidden md:block text-center">Route</div>
                  <div className="text-right md:text-center">Qty</div>
                  <div className="hidden sm:block text-right">Price</div>
                  <div className="text-right">Total</div>
                </div>

                {prescription.medications.map(
                  (medication: IPrescriptionMedication, index: number) => {
                    const medicineInfo = getMedicineInfo(medication);
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-9 gap-2 text-xs sm:text-sm py-2 border-t"
                      >
                        <div className="hidden md:block text-center">
                          {index + 1}
                        </div>
                        <div className="truncate">{medicineInfo.name}</div>
                        <div className="hidden md:block text-center">
                          {medicineInfo.form}
                        </div>
                        <div className="hidden md:block text-center">
                          {medicineInfo.dosage}
                        </div>
                        <div className="hidden md:block text-center">
                          {medicineInfo.frequency}
                        </div>
                        <div className="hidden md:block text-center">
                          {medicineInfo.route}
                        </div>
                        <div className="text-right md:text-center">
                          {medication.quantity}
                        </div>
                        <div className="hidden sm:block text-right">
                          ${medication.price.toFixed(2)}
                        </div>
                        <div className="text-right">
                          ${(medication.quantity * medication.price).toFixed(2)}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={() => handlePrint(prescription)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
