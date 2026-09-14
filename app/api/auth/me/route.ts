import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    },
  });
}