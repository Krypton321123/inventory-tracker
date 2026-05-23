import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItem extends Document {
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: "pcs" },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

const Item: Model<IItem> =
  mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);

export default Item;
