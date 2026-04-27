"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canAccessAdminContent } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ContentActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status?: "error" | "success";
};

type AuditTargetTable =
  | "landing_content"
  | "services"
  | "testimonials"
  | "faq_items";

const GENERIC_ERROR = "We could not save that change. Please review the form and try again.";
const GENERIC_DELETE_ERROR = "We could not delete that item. Please try again.";
const UNAUTHORIZED_ERROR = "You are not allowed to change this content.";

const landingSectionSchema = z.enum([
  "hero",
  "stats",
  "why",
  "how_it_works",
  "footer",
]);

const serviceTypeSchema = z.enum([
  "Rank Boost",
  "Quest Completion",
  "Account Leveling",
  "Custom",
]);

const uuidSchema = z.string().uuid();

const sortOrderSchema = z.coerce
  .number()
  .int("Sort order must be a whole number.")
  .min(0, "Sort order cannot be negative.")
  .max(32767, "Sort order is too large.");

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "URL is too long.")
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || isValidUrl(value), {
    message: "Enter a valid URL or leave it blank.",
  });

const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value === "" ? null : value));

const jsonContentSchema = z
  .string()
  .trim()
  .min(1, "Content value is required.")
  .transform((value, context) => {
    try {
      return JSON.parse(value) as JsonValue;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Enter valid JSON.",
      });

      return z.NEVER;
    }
  });

const landingContentUpdateSchema = z.object({
  content_key: z.string().trim().min(1, "Content key is required."),
  content_value: jsonContentSchema,
  id: uuidSchema,
  section: landingSectionSchema,
});

const serviceMutationSchema = z.object({
  description: optionalTextSchema(200),
  game_name: z.string().trim().min(1, "Game title is required.").max(80),
  icon_url: optionalUrlSchema,
  image_url: optionalUrlSchema,
  is_active: z.boolean(),
  service_type: serviceTypeSchema,
  sort_order: sortOrderSchema,
});

const serviceUpdateSchema = serviceMutationSchema.extend({
  id: uuidSchema,
});

const testimonialMutationSchema = z.object({
  avatar_url: optionalUrlSchema,
  buyer_name: z.string().trim().min(1, "Buyer name is required.").max(80),
  comment: z.string().trim().min(1, "Comment is required.").max(500),
  game: z.string().trim().min(1, "Game title is required.").max(80),
  is_visible: z.boolean(),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be at least 1.")
    .max(5, "Rating cannot be more than 5."),
  sort_order: sortOrderSchema,
});

const testimonialUpdateSchema = testimonialMutationSchema.extend({
  id: uuidSchema,
});

const questionMutationSchema = z.object({
  answer: z.string().trim().min(1, "Answer is required.").max(800),
  question: z.string().trim().min(1, "Question is required.").max(220),
  sort_order: sortOrderSchema,
});

const questionUpdateSchema = questionMutationSchema.extend({
  id: uuidSchema,
});

const deleteQuestionSchema = z.object({
  confirm: z.literal("delete"),
  id: uuidSchema,
});

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function updateLandingContentAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = landingContentUpdateSchema.safeParse({
    content_key: getStringValue(formData, "content_key"),
    content_value: getStringValue(formData, "content_value"),
    id: getStringValue(formData, "id"),
    section: getStringValue(formData, "section"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("landing_content")
    .select("id, section, content_key")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (
    readError ||
    !row ||
    row.section !== parsed.data.section ||
    row.content_key !== parsed.data.content_key
  ) {
    return actionError(GENERIC_ERROR);
  }

  if (!canEditLandingSection(auth.staff.profile.tier, row.section)) {
    return actionError(UNAUTHORIZED_ERROR);
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("landing_content")
    .update({
      content_value: parsed.data.content_value,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .single();

  if (updateError || !updatedRow) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "landing_content.update",
    payload: {
      content_key: row.content_key,
      fields: ["content_value"],
      section: row.section,
    },
    targetId: updatedRow.id,
    targetTable: "landing_content",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("Landing content saved.");
}

export async function createServiceAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = serviceMutationSchema.safeParse(readServiceForm(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !service) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "services.create",
    payload: {
      fields: [
        "game_name",
        "service_type",
        "description",
        "icon_url",
        "image_url",
        "is_active",
        "sort_order",
      ],
      service_type: parsed.data.service_type,
    },
    targetId: service.id,
    targetTable: "services",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("Service created.");
}

export async function updateServiceAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = serviceUpdateSchema.safeParse({
    ...readServiceForm(formData),
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .update(values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !service) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "services.update",
    payload: {
      fields: Object.keys(values),
      service_type: values.service_type,
    },
    targetId: service.id,
    targetTable: "services",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("Service saved.");
}

export async function createTestimonialAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = testimonialMutationSchema.safeParse(
    readTestimonialForm(formData),
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data: testimonial, error } = await supabase
    .from("testimonials")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !testimonial) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "testimonials.create",
    payload: {
      fields: [
        "buyer_name",
        "game",
        "rating",
        "comment",
        "avatar_url",
        "is_visible",
        "sort_order",
      ],
      visible: parsed.data.is_visible,
    },
    targetId: testimonial.id,
    targetTable: "testimonials",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("Testimonial created.");
}

export async function updateTestimonialAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = testimonialUpdateSchema.safeParse({
    ...readTestimonialForm(formData),
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { data: testimonial, error } = await supabase
    .from("testimonials")
    .update(values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !testimonial) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "testimonials.update",
    payload: {
      fields: Object.keys(values),
      visible: values.is_visible,
    },
    targetId: testimonial.id,
    targetTable: "testimonials",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("Testimonial saved.");
}

export async function createQuestionAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = questionMutationSchema.safeParse(readQuestionForm(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("faq_items")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !question) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "faq_items.create",
    payload: {
      fields: ["question", "answer", "sort_order"],
    },
    targetId: question.id,
    targetTable: "faq_items",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("FAQ item created.");
}

export async function updateQuestionAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = questionUpdateSchema.safeParse({
    ...readQuestionForm(formData),
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("faq_items")
    .update(values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !question) {
    return actionError(GENERIC_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "faq_items.update",
    payload: {
      fields: Object.keys(values),
    },
    targetId: question.id,
    targetTable: "faq_items",
  });

  if (!audited) {
    return actionError(GENERIC_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("FAQ item saved.");
}

export async function deleteQuestionAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const auth = await requireContentMutationAccess();

  if (!auth.ok) {
    return auth.state;
  }

  const parsed = deleteQuestionSchema.safeParse({
    confirm: getStringValue(formData, "confirm"),
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("faq_items")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return actionError(GENERIC_DELETE_ERROR);
  }

  const audited = await writeContentAudit(supabase, {
    action: "faq_items.delete",
    payload: {
      fields: ["id"],
    },
    targetId: parsed.data.id,
    targetTable: "faq_items",
  });

  if (!audited) {
    return actionError(GENERIC_DELETE_ERROR);
  }

  revalidateContentPaths();

  return actionSuccess("FAQ item deleted.");
}

async function requireContentMutationAccess(): Promise<
  | {
      ok: true;
      staff: NonNullable<Awaited<ReturnType<typeof getCurrentStaffUser>>>;
    }
  | { ok: false; state: ContentActionState }
> {
  const staff = await getCurrentStaffUser();

  if (!staff || !canAccessAdminContent(staff.profile.tier)) {
    return {
      ok: false,
      state: actionError(UNAUTHORIZED_ERROR),
    };
  }

  return {
    ok: true,
    staff,
  };
}

function canEditLandingSection(tier: string, section: string): boolean {
  if (section === "footer") {
    return tier === "owner";
  }

  return tier === "owner" || tier === "admin";
}

function readServiceForm(formData: FormData) {
  return {
    description: getStringValue(formData, "description"),
    game_name: getStringValue(formData, "game_name"),
    icon_url: getStringValue(formData, "icon_url"),
    image_url: getStringValue(formData, "image_url"),
    is_active: getBooleanValue(formData, "is_active"),
    service_type: getStringValue(formData, "service_type"),
    sort_order: getStringValue(formData, "sort_order"),
  };
}

function readTestimonialForm(formData: FormData) {
  return {
    avatar_url: getStringValue(formData, "avatar_url"),
    buyer_name: getStringValue(formData, "buyer_name"),
    comment: getStringValue(formData, "comment"),
    game: getStringValue(formData, "game"),
    is_visible: getBooleanValue(formData, "is_visible"),
    rating: getStringValue(formData, "rating"),
    sort_order: getStringValue(formData, "sort_order"),
  };
}

function readQuestionForm(formData: FormData) {
  return {
    answer: getStringValue(formData, "answer"),
    question: getStringValue(formData, "question"),
    sort_order: getStringValue(formData, "sort_order"),
  };
}

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getBooleanValue(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function validationError(error: z.ZodError): ContentActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Check the highlighted fields and try again.",
    status: "error",
  };
}

function actionError(message: string): ContentActionState {
  return {
    message,
    status: "error",
  };
}

function actionSuccess(message: string): ContentActionState {
  return {
    message,
    status: "success",
  };
}

function revalidateContentPaths() {
  revalidatePath("/");
  revalidatePath("/admin/content");
}

async function writeContentAudit(
  supabase: ServerSupabaseClient,
  {
    action,
    payload,
    targetId,
    targetTable,
  }: {
    action: string;
    payload: Record<string, unknown>;
    targetId: string;
    targetTable: AuditTargetTable;
  },
): Promise<boolean> {
  const { error } = await supabase.rpc("write_audit_log", {
    p_action: action,
    p_domain: "content",
    p_payload: payload,
    p_target_id: targetId,
    p_target_table: targetTable,
  });

  return !error;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);

    return true;
  } catch {
    return false;
  }
}
