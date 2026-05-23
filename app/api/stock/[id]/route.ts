import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const { quantity, operation } = await req.json(); // operation: "add" | "remove"

    const item = await Item.findById(id);
    if (!item) return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });

    if (operation === "add") {
      item.stock += quantity;
    } else if (operation === "remove") {
      if (item.stock < quantity) {
        return NextResponse.json({ success: false, error: "Insufficient stock" }, { status: 400 });
      }
      item.stock -= quantity;
    }

    await item.save();
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
