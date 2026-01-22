// // components/pharmacy/PrescriptionTable.tsx
// import { Button } from '@/components/ui/button';
// import { Printer } from 'lucide-react';
// import { Prescription } from '@/lib/models/Prescription';

// interface PrescriptionTableProps {
//   prescriptions: Prescription[];
//   loading: boolean;
//   onPrint: (prescription: Prescription) => void;
// }

// export const PrescriptionTable = ({ 
//   prescriptions, 
//   loading, 
//   onPrint 
// }: PrescriptionTableProps) => {
//   return (
//     <div className="space-y-4">
//       {prescriptions.length === 0 ? (
//         <div className="text-center py-8 text-muted-foreground">
//           No prescriptions found
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {prescriptions.map((prescription) => (
//             <div key={prescription._id} className="border rounded-lg p-4">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <h3 className="font-medium">{prescription.patientName}</h3>
//                   <p className="text-sm text-muted-foreground">
//                     {prescription.invoiceNumber} • {new Date(prescription.createdAt).toLocaleString()}
//                   </p>
//                 </div>
//                 <div className="text-right">
//                   <p className="font-bold">${prescription.totalAmount.toFixed(2)}</p>
//                   <p className="text-sm capitalize">{prescription.paymentMethod}</p>
//                 </div>
//               </div>
              
//               <div className="mt-4">
//                 <div className="grid grid-cols-6 gap-2 font-medium text-sm mb-2">
//                   <div>#</div>
//                   <div>Medicine</div>
//                   <div>Batch</div>
//                   <div className="text-right">Qty</div>
//                   <div className="text-right">Price</div>
//                   <div className="text-right">Total</div>
//                 </div>
                
//                 {prescription.items.map((item, index) => (
//                   <div key={index} className="grid grid-cols-6 gap-2 text-sm py-1 border-t">
//                     <div>{index + 1}</div>
//                     <div>{item.medicine.name}</div>
//                     <div>{item.medicine.batchNumber}</div>
//                     <div className="text-right">{item.quantity}</div>
//                     <div className="text-right">${item.unitPrice.toFixed(2)}</div>
//                     <div className="text-right">
//                       ${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toFixed(2)}
//                     </div>
//                   </div>
//                 ))}
//               </div>
              
//               <div className="mt-4 flex justify-end">
//                 <Button 
//                   size="sm" 
//                   onClick={() => onPrint(prescription)}
//                   disabled={loading}
//                 >
//                   <Printer className="mr-2 h-4 w-4" />
//                   {loading ? 'Generating...' : 'Print Receipt'}
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };
