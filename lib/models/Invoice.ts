import mongoose, { Schema, model, models } from "mongoose";

export interface IInvoice extends mongoose.Document {
  invoiceId: string;
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    department: string;
    serviceType: string;
  }[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: "draft" | "sent" | "pending" | "partially_paid" | "paid" | "overdue" | "cancelled";
  issueDate: Date;
  dueDate: Date;
  paymentTerms: number; // in days
  discountRequest?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      department: { type: String, required: true },
      serviceType: { type: String, required: true },
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "pending", "partially_paid", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentTerms: {
      type: Number,
      default: 30,
      min: 0,
    },
    discountRequest: {
      type: Schema.Types.ObjectId,
      ref: "DiscountRequest",
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook
invoiceSchema.pre("save", function (next) {
  if (!this.invoiceId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.invoiceId = `INV${year}${month}${random}`;
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    const itemsTotal = this.items.reduce((sum, item) => sum + (item.total || item.unitPrice * item.quantity), 0);
    this.subtotal = itemsTotal;
    this.totalAmount = this.subtotal + (this.taxAmount || 0) - (this.discountAmount || 0);
    this.balance = this.totalAmount - (this.paidAmount || 0);
  }

  // Set due date if not provided
  if (!this.dueDate) {
    const due = new Date(this.issueDate);
    due.setDate(due.getDate() + (this.paymentTerms || 30));
    this.dueDate = due;
  }

  // Update status based on balance
  if (this.balance <= 0) {
    this.status = "paid";
  } else if (this.paidAmount > 0 && this.balance > 0) {
    this.status = "partially_paid";
  } else if (new Date() > this.dueDate && this.balance > 0) {
    this.status = "overdue";
  }

  next();
});

export const Invoice = models.Invoice || model<IInvoice>("Invoice", invoiceSchema);