import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Item from "@/models/Item";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  // The check you specifically asked for: only the superuser (or a staff member
  // explicitly granted canManageStock) can add or deduct stock here.
  if (!hasPermission(currentUser, "canManageStock")) {
    return NextResponse.json({ success: false, error: "You don't have permission to adjust stock" }, { status: 403 });
  }

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