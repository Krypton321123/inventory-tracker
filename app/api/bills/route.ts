import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Item from "@/models/Item";
import mongoose from "mongoose";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  if (!hasPermission(currentUser, "canManageBills")) {
    return NextResponse.json({ success: false, error: "You don't have permission to create bills" }, { status: 403 });
  }
  // This handler deducts stock on every line item (see the loop below) — the exact
  // same mutation /api/stock/[id] gates behind canManageStock. Without this second
  // check, a user with canManageBills but not canManageStock could move stock by
  // creating bills instead of using the stock endpoint directly, which defeats the
  // "only superuser can add/deduct stock" rule you asked for. Requiring both here
  // closes that path.
  if (!hasPermission(currentUser, "canManageStock")) {
    return NextResponse.json({ success: false, error: "You don't have permission to adjust stock, which bill creation requires" }, { status: 403 });
  }

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