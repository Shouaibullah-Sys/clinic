// components/pharmacy/PrescriptionHistory.tsx
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw } from 'lucide-react';
import { generatePharmacyReceipt } from '@/utils/generatePharmacyReceipt';
import { IPrescription, PrescriptionItem } from '@/lib/models/Prescription';
import { Types } from 'mongoose';
import { IMedicineStock } from '@/lib/models/MedicineStock';

interface User {
  _id: Types.ObjectId;
  name: string;
}

interface MedicineInfo {
  name: string;
  batchNumber: string;
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
function isMedicinePopulated(medicine: Types.ObjectId | IMedicineStock): medicine is IMedicineStock {
  return (medicine as IMedicineStock).name !== undefined;
}

export const PrescriptionHistory = ({ 
  prescriptions, 
  loading, 
  user,
  onRefresh
}: PrescriptionHistoryProps) => {
  const handlePrint = (prescription: IPrescription) => {
    // Transform the prescription data to match the expected format
    const receiptData: PrescriptionForReceipt = {
      ...prescription,
      createdAt: prescription.createdAt.toISOString(),
      items: prescription.items.map(item => {
        let medicineName = 'Unknown Medicine';
        let batchNumber = 'N/A';

        if (isMedicinePopulated(item.medicine)) {
          medicineName = item.medicine.name;
          batchNumber = item.medicine.batchNumber;
        }

        return {
          ...item,
          medicine: {
            name: medicineName,
            batchNumber: batchNumber
          }
        };
      }),
      issuedBy: {
        name: user?.name || 'System'
      }
    };
    generatePharmacyReceipt(receiptData);
  };

  const getMedicineInfo = (medicine: Types.ObjectId | IMedicineStock): MedicineInfo => {
    if (isMedicinePopulated(medicine)) {
      return {
        name: medicine.name,
        batchNumber: medicine.batchNumber
      };
    }
    return {
      name: 'Unknown Medicine',
      batchNumber: 'N/A'
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
            <div key={prescription._id.toString()} className="border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-medium text-sm sm:text-base">{prescription.patientName}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {prescription.invoiceNumber} • {new Date(prescription.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base font-bold">${prescription.totalAmount.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm capitalize">{prescription.paymentMethod}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 font-medium text-xs sm:text-sm mb-2">
                  <div className="hidden md:block text-center">#</div>
                  <div>Medicine</div>
                  <div className="hidden md:block text-center">Batch</div>
                  <div className="text-right md:text-center">Qty</div>
                  <div className="hidden sm:block text-right">Price</div>
                  <div className="text-right">Total</div>
                </div>
                
                {prescription.items.map((item: PrescriptionItem, index: number) => {
                  const medicineInfo = getMedicineInfo(item.medicine);
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs sm:text-sm py-2 border-t">
                      <div className="hidden md:block text-center">{index + 1}</div>
                      <div className="truncate">{medicineInfo.name}</div>
                      <div className="hidden md:block text-center">{medicineInfo.batchNumber}</div>
                      <div className="text-right md:text-center">{item.quantity}</div>
                      <div className="hidden sm:block text-right">${item.unitPrice.toFixed(2)}</div>
                      <div className="text-right">
                        ${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  size="sm" 
                  onClick={() => handlePrint(prescription)}
                >
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
