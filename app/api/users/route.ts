import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  if (currentUser.role !== "superuser") {
    return NextResponse.json({ success: false, error: "Only the superuser can view users" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find().sort({ createdAt: -1 });
  return NextResponse.json({ success: true, data: users });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  if (currentUser.role !== "superuser") {
    return NextResponse.json({ success: false, error: "Only the superuser can create users" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, username, password, permissions } = body;

    if (!name?.trim() || !username?.trim() || !password) {
      return NextResponse.json({ success: false, error: "Name, username, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return NextResponse.json({ success: false, error: "A user with that username already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      username: username.trim(),
      passwordHash,
      role: "staff",
      permissions: {
        canManageStock: Boolean(permissions?.canManageStock),
        canManageItems: Boolean(permissions?.canManageItems),
        canManageBills: Boolean(permissions?.canManageBills),
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}