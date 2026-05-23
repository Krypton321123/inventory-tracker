import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBillItem {
  itemId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface IBill extends Document {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: IBillItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  notes?: string;
  status: "paid" | "unpaid" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema<IBillItem>({
  itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  subtotal: { type: Number, required: true },
});

const BillSchema = new Schema<IBill>(
  {
    billNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    items: [BillItemSchema],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ["paid", "unpaid", "cancelled"], default: "unpaid" },
  },
  { timestamps: true }
);


const Bill: Model<IBill> =
  mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;
