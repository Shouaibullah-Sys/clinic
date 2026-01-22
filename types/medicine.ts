export interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  description?: string;

}

export interface MedicineStock extends Medicine {
     remainingPercentage: number;
  expiryStatus: 'valid' | 'expiring-soon' | 'expired';
}