import { MedicineStock } from "@/lib/models/MedicineStock";

export interface StockCheckResult {
  name: string;
  available: number;
  required: number;
  insufficient: boolean;
  form?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  message: string;
}

export interface StockValidationResult {
  allAvailable: boolean;
  checks: StockCheckResult[];
  insufficientItems: StockCheckResult[];
}

export class PrescriptionService {
  static async checkStockAvailability(
    medications: any[],
  ): Promise<StockValidationResult> {
    const stockChecks = await Promise.all(
      medications.map(async (med) => {
        const medicine = await MedicineStock.findById(med.medicine);
        if (!medicine) {
          return {
            name: med.name,
            available: 0,
            required: med.quantity,
            insufficient: true,
            message: `Medicine not found: ${med.name}`,
          };
        }

        const available = medicine.currentQuantity;
        return {
          name: med.name,
          available,
          required: med.quantity,
          insufficient: available < med.quantity,
          form: medicine.form,
          dosage: medicine.dosage,
          frequency: medicine.frequency,
          route: medicine.route,
          message:
            available < med.quantity
              ? `Insufficient stock. Available: ${available}, Required: ${med.quantity}`
              : "Available",
        };
      }),
    );

    const insufficientItems = stockChecks.filter((item) => item.insufficient);
    return {
      allAvailable: insufficientItems.length === 0,
      checks: stockChecks,
      insufficientItems,
    };
  }
}
