import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

// Get order mapping for phases
const phasePriority: Record<string, number> = {
  before_work: 1,
  while_work: 2,
  after_work: 3,
};

const createConfigSchema = z.object({
  game: z.string().trim().min(1, "Game is required"),
  phase: z.enum(["before_work", "while_work", "after_work"]),
  sort_order: z.number().int().min(1),
  label: z.string().trim().min(1, "Label is required"),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { data: configs, error } = await supabase
      .from("daily_task_config")
      .select("*");

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }

    // Sort in memory by phase (custom order), game, sort_order
    const sortedConfigs = [...(configs || [])].sort((a, b) => {
      const aPhasePriority = phasePriority[a.phase] ?? 99;
      const bPhasePriority = phasePriority[b.phase] ?? 99;

      if (aPhasePriority !== bPhasePriority) {
        return aPhasePriority - bPhasePriority;
      }

      const aGame = a.game.toLowerCase();
      const bGame = b.game.toLowerCase();
      if (aGame !== bGame) {
        return aGame.localeCompare(bGame);
      }

      return a.sort_order - b.sort_order;
    });

    return NextResponse.json({ success: true, data: sortedConfigs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { game, phase, sort_order, label, is_active } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("daily_task_config")
      .insert({
        game,
        phase,
        sort_order,
        label,
        is_active,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
