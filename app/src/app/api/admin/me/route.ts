import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";

/** Whether to show the "Admin" link in the profile menu */
export async function GET() {
  return NextResponse.json({ isAdmin: await isAdmin() });
}
