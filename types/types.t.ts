export type DailyRecord = {
  _id: string;
  patientName: string;
  testType: string;
  phone: string;
  amountCharged: number;
  amountPaid: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  date: Date | string;
  createdBy: string;
};
