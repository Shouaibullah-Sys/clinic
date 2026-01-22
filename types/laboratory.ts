// types/laboratory.ts
export interface LabExpense {
  _id: string;
  amount: number;
  expenseType: string;
  description: string;
  date: string;
  doctorName?: string;
}

export interface LaboratoryRecordResponse {
  _id: string;
  patientName: string;
  testType: string;
  status: 'pending' | 'completed' | 'cancelled';
  orderedDate: string;
  completedDate?: string;
  amountPaid: number;
  doctorName?: string;
}