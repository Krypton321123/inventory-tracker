import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Item from "@/models/Item";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: bills });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectDB();
    const body = await req.json();

    // Validate and deduct stock for each item
    for (const billItem of body.items) {
      const item = await Item.findById(billItem.itemId).session(session);
      if (!item) throw new Error(`Item ${billItem.itemId} not found`);
      if (item.stock < billItem.quantity) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${item.stock}`);
      }
      item.stock -= billItem.quantity;
      await item.save({ session });
    }

    // Generate bill number
    const count = await Bill.countDocuments().session(session);
    body.billNumber = `INV-${String(count + 1).padStart(5, "0")}`;

    const [bill] = await Bill.create([body], { session });
    await session.commitTransaction();

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (error) {
    await session.abortTransaction();
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 });
  } finally {
    session.endSession();
  }
}
