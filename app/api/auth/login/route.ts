import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username and password are required" }, { status: 400 });
    }

    await connectDB();

    const genericError = { success: false, error: "Invalid username or password" };

    const user = await User.findOne({ username: String(username).trim() });
    if (!user || !user.active) {
      return NextResponse.json(genericError, { status: 401 });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return NextResponse.json(genericError, { status: 401 });
    }

    const token = await signSession({ userId: user._id.toString(), role: user.role });
    await setSessionCookie(token);

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
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}