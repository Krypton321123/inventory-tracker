import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

async function requireSuperuser() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 }) };
  }
  if (currentUser.role !== "superuser") {
    return { error: NextResponse.json({ success: false, error: "Only the superuser can manage users" }, { status: 403 }) };
  }
  return { currentUser };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperuser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { permissions, active } = body;

    await connectDB();
    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    if (target.role === "superuser") {
      // Prevents a superuser from accidentally locking themselves — or the only
      // superuser account — out via the same screen used to edit staff.
      return NextResponse.json({ success: false, error: "The superuser account cannot be edited here" }, { status: 400 });
    }

    if (permissions) {
      target.permissions = {
        canManageStock: Boolean(permissions.canManageStock),
        canManageItems: Boolean(permissions.canManageItems),
        canManageBills: Boolean(permissions.canManageBills),
      };
    }
    if (typeof active === "boolean") {
      target.active = active;
    }

    await target.save();
    return NextResponse.json({ success: true, data: target });
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperuser();
  if (auth.error) return auth.error;

  const { id } = await params;
  await connectDB();
  const target = await User.findById(id);
  if (!target) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }
  if (target.role === "superuser") {
    return NextResponse.json({ success: false, error: "The superuser account cannot be deleted" }, { status: 400 });
  }

  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}