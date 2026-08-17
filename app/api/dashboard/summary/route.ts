import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getDashboardSummaryData } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 403 },
      );
    }

    const data = await getDashboardSummaryData();
    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 },
    );
  }
}
