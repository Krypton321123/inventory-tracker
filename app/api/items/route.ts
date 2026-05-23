import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };


    const items = await Item.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await Item.create(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 });
  }
}
