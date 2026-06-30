import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BookOpenTextIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  FileTextIcon,
  MessageSquareQuoteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CreateQuestionForm,
  CreateServiceForm,
  CreateTestimonialForm,
  DeleteQuestionForm,
  LandingContentForm,
  QuestionForm,
  ServiceForm,
  TestimonialForm,
} from "@/components/admin/content-cms/content-forms";
import { canAccessAdminContent } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Content CMS | KireiApp",
  description: "Release 1 content CMS mutation baseline.",
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type LandingContentRow = {
  id: string;
  section: string;
  content_key: string;
  content_value: JsonValue;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  updated_at: string;
};

type ServiceRow = {
  id: string;
  game_name: string;
  service_type: string;
  description: string | null;
  icon_url: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

type TestimonialRow = {
  id: string;
  buyer_name: string;
  game: string;
  rating: number;
  comment: string;
  avatar_url: string | null;
  is_visible: boolean;
  sort_order: number;
  updated_at: string;
};

type QueryIssue = {
  message: string;
  source: string;
};

type ContentCmsData = {
  issues: QueryIssue[];
  landingRows: LandingContentRow[];
  questions: QuestionRow[];
  services: ServiceRow[];
  testimonials: TestimonialRow[];
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export default async function AdminContentPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminContent(staff.profile.tier)) {
    redirect("/admin/profile");
  }

  const data = await getContentCmsData();
  const groupedLandingRows = groupLandingRows(data.landingRows);
  const activeServices = data.services.filter((service) => service.is_active);
  const visibleTestimonials = data.testimonials.filter(
    (testimonial) => testimonial.is_visible,
  );
  const canEditFooterRows = staff.profile.tier === "owner";

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 left-10 size-64 rounded-full bg-secondary/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                <ShieldCheckIcon data-icon="inline-start" aria-hidden="true" />
                Mutation baseline
              </Badge>
              <Badge
                variant="secondary"
                className="border-border bg-background/60 text-muted-foreground"
              >
                Release 1
              </Badge>
            </div>
            <h1 className="mt-5 text-balance font-heading text-4xl font-black tracking-tight sm:text-5xl">
              Content CMS
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
              Review and safely update the Release 1 landing content,
              services, questions, and testimonials that power the public
              experience.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background/50 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              Owner/Admin Surface
            </p>
            <p className="mt-1 max-w-xs">
              Server Actions validate every mutation, recheck staff tier, and
              write audit logs through the approved RPC path.
            </p>
          </div>
        </div>
      </section>

      {data.issues.length > 0 ? <IssuePanel issues={data.issues} /> : null}

      <section
        aria-labelledby="content-summary-title"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="content-summary-title" className="sr-only">
          Content Summary
        </h2>
        <SummaryCard
          icon={FileTextIcon}
          label="Landing Rows"
          value={data.landingRows.length}
          detail={`${groupedLandingRows.length} sections`}
        />
        <SummaryCard
          icon={TagsIcon}
          label="Services"
          value={data.services.length}
          detail={`${numberFormatter.format(activeServices.length)} active`}
        />
        <SummaryCard
          icon={BookOpenTextIcon}
          label="FAQ Items"
          value={data.questions.length}
          detail="Dedicated rows"
        />
        <SummaryCard
          icon={MessageSquareQuoteIcon}
          label="Testimonials"
          value={data.testimonials.length}
          detail={`${numberFormatter.format(visibleTestimonials.length)} visible`}
        />
      </section>

      {/* 1. HERO SECTION (Hero & Stats) */}
      <section
        aria-labelledby="hero-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Landing Content"
          title="Hero & Stats"
          description="Edit hero copy, headline, CTAs, and live counter statistics."
          icon={ClipboardListIcon}
        />
        <Separator className="my-5" />
        <div className="grid gap-6 xl:grid-cols-2">
          {renderSectionCard(groupedLandingRows.find(g => g.section === "hero"), canEditFooterRows)}
          {renderSectionCard(groupedLandingRows.find(g => g.section === "stats"), canEditFooterRows)}
        </div>
      </section>

      {/* 2. SERVICES SECTION */}
      <section
        aria-labelledby="services-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Catalog"
          title="Services"
          description="Create or edit landing service cards. Image URLs are stored only until image policy is decided."
          icon={TagsIcon}
        />
        <Separator className="my-5" />
        <CreateServiceForm />
        <Separator className="my-5" />
        {data.services.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.services.map((service) => (
              <Card
                key={service.id}
                className="border-border/80 bg-background/45"
              >
                <CardHeader>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge
                      active={service.is_active}
                      activeLabel="Active"
                      inactiveLabel="Hidden"
                    />
                    <Badge variant="outline">{service.service_type}</Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Sort {numberFormatter.format(service.sort_order)}
                    </span>
                  </div>
                  <CardTitle className="text-2xl">
                    {service.game_name}
                  </CardTitle>
                  <CardDescription className="break-words">
                    {service.description || "No service description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(service.updated_at)}
                  </p>
                  <ServiceForm service={service} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState message="No service rows are available yet." />
        )}
      </section>

      {/* 3. WHY KIREIKU SECTION */}
      <section
        aria-labelledby="why-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Value Proposition"
          title="Why Kireiku"
          description="Copy and cards showing our process clarity, curated boosters, and safety focus."
          icon={ClipboardListIcon}
        />
        <Separator className="my-5" />
        <div className="flex flex-col gap-6">
          {renderSectionCard(groupedLandingRows.find(g => g.section === "why"), canEditFooterRows)}
        </div>
      </section>

      {/* 4. TESTIMONIALS SECTION */}
      <section
        aria-labelledby="testimonials-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Social Proof"
          title="Testimonials"
          description="Visible and hidden testimonials are shown for staff review."
          icon={MessageSquareQuoteIcon}
        />
        <Separator className="my-5" />
        <CreateTestimonialForm />
        <Separator className="my-5" />
        {data.testimonials.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="border-border/80 bg-background/45"
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      active={testimonial.is_visible}
                      activeLabel="Visible"
                      inactiveLabel="Hidden"
                    />
                    <Badge variant="outline">{testimonial.game}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <StarIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                        className="fill-current"
                      />
                      {numberFormatter.format(testimonial.rating)}/5
                    </span>
                  </div>
                  <CardTitle>{testimonial.buyer_name}</CardTitle>
                  <CardDescription>
                    Sort {numberFormatter.format(testimonial.sort_order)} ·
                    Updated {formatDate(testimonial.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <blockquote className="break-words text-muted-foreground">
                    “{testimonial.comment}”
                  </blockquote>
                  <TestimonialForm testimonial={testimonial} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState message="No testimonial rows are available yet." />
        )}
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section
        aria-labelledby="how-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Workflow"
          title="How It Works"
          description="Step-by-step description of the order process."
          icon={ClipboardListIcon}
        />
        <Separator className="my-5" />
        <div className="flex flex-col gap-6">
          {renderSectionCard(groupedLandingRows.find(g => g.section === "how_it_works"), canEditFooterRows)}
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section
        aria-labelledby="faq-items-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Help Content"
          title="FAQ Items"
          description="Questions come from dedicated FAQ rows, never landing content."
          icon={BookOpenTextIcon}
        />
        <Separator className="my-5" />
        <CreateQuestionForm />
        <Separator className="my-5" />
        {data.questions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {data.questions.map((item) => (
              <Card
                key={item.id}
                className="border-border/80 bg-background/45"
              >
                <CardHeader>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Sort {numberFormatter.format(item.sort_order)}
                    </Badge>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Updated {formatDate(item.updated_at)}
                    </p>
                  </div>
                  <CardTitle className="break-words text-lg">
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="break-words text-muted-foreground">
                    {item.answer}
                  </p>
                  <div className="mt-5 flex flex-col gap-4">
                    <QuestionForm item={item} />
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                      <p className="mb-3 text-sm font-medium text-destructive">
                        Delete this FAQ row. This button is intentionally
                        scoped to this item only.
                      </p>
                      <DeleteQuestionForm id={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState message="No FAQ items are available yet." />
        )}
      </section>

      {/* 7. FOOTER SECTION */}
      <section
        aria-labelledby="footer-title"
        className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6"
      >
        <SectionHeading
          eyebrow="Navigation"
          title="Footer Content"
          description="Copyright notice, G2G URLs, brand summary, and social links."
          icon={ClipboardListIcon}
        />
        <Separator className="my-5" />
        <div className="flex flex-col gap-6">
          {renderSectionCard(groupedLandingRows.find(g => g.section === "footer"), canEditFooterRows)}
        </div>
      </section>
    </div>
  );
}

async function getContentCmsData(): Promise<ContentCmsData> {
  const supabase = await createClient();
  const issues: QueryIssue[] = [];

  const contentQuery = supabase
    .from("landing_content")
    .select("id, section, content_key, content_value, updated_at")
    .order("section", { ascending: true })
    .order("content_key", { ascending: true });

  const questionQuery = supabase
    .from("faq_items")
    .select("id, question, answer, sort_order, updated_at")
    .order("sort_order", { ascending: true })
    .order("question", { ascending: true });

  const serviceQuery = supabase
    .from("services")
    .select(
      "id, game_name, service_type, description, icon_url, image_url, is_active, sort_order, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("game_name", { ascending: true });

  const testimonialQuery = supabase
    .from("testimonials")
    .select(
      "id, buyer_name, game, rating, comment, avatar_url, is_visible, sort_order, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("buyer_name", { ascending: true });

  const [
    contentResult,
    questionResult,
    serviceResult,
    testimonialResult,
  ] = await Promise.all([
    contentQuery,
    questionQuery,
    serviceQuery,
    testimonialQuery,
  ]);

  return {
    issues,
    landingRows: getRows<LandingContentRow>(
      contentResult,
      "Landing content",
      issues,
    ),
    questions: getRows<QuestionRow>(questionResult, "FAQ items", issues),
    services: getRows<ServiceRow>(serviceResult, "Services", issues),
    testimonials: getRows<TestimonialRow>(
      testimonialResult,
      "Testimonials",
      issues,
    ),
  };
}

function renderSectionCard(
  group: { lastUpdated: string | null; rows: LandingContentRow[]; section: string } | undefined,
  canEditFooterRows: boolean,
) {
  if (!group) return null;
  const isFooter = group.section === "footer";
  const title = group.section === "why" ? "Why Kireiku" : group.section.replaceAll("_", " ");
  
  return (
    <Card key={group.section} className="border-border/80 bg-background/45 w-full">
      <CardHeader>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CardTitle className="truncate capitalize text-2xl font-bold">
            {title}
          </CardTitle>
          <Badge variant="outline">
            {numberFormatter.format(group.rows.length)} rows
          </Badge>
        </div>
        <CardDescription>
          Last updated {formatDate(group.lastUpdated)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {group.rows.map((row) => {
          const isFooterRow = row.section === "footer";
          const canEditRow = !isFooterRow || canEditFooterRows;

          return (
            <div
              key={row.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    className="text-sm font-semibold text-foreground capitalize"
                    translate="no"
                  >
                    {row.content_key.replaceAll("_", " ")}
                  </p>
                  {isFooterRow ? (
                    <Badge
                      variant="outline"
                      className={
                        canEditFooterRows
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {canEditFooterRows
                        ? "Owner Editable"
                        : "Owner Only"}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatDate(row.updated_at)}
                </p>
              </div>
              <LandingContentForm canEdit={canEditRow} row={row} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function getRows<T>(
  result: { data: unknown[] | null; error: { message: string } | null },
  source: string,
  issues: QueryIssue[],
): T[] {
  if (result.error) {
    issues.push({
      source,
      message: "This content group could not be loaded. Please try again.",
    });

    return [];
  }

  return (result.data ?? []) as T[];
}

function groupLandingRows(rows: LandingContentRow[]) {
  const groups = new Map<string, LandingContentRow[]>();

  for (const row of rows) {
    const sectionRows = groups.get(row.section) ?? [];
    sectionRows.push(row);
    groups.set(row.section, sectionRows);
  }

  return Array.from(groups.entries()).map(([section, sectionRows]) => ({
    lastUpdated: sectionRows
      .map((row) => row.updated_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
    rows: sectionRows,
    section,
  }));
}

function SummaryCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-border/80 bg-card/75 shadow-xl backdrop-blur-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="font-semibold uppercase tracking-widest">
            {label}
          </CardDescription>
          <span className="rounded-full border border-primary/25 bg-primary/10 p-2 text-primary">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-4xl font-black tabular-nums tracking-tight">
          {numberFormatter.format(value)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  const headingId = getHeadingId(title);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
        <h2
          id={headingId}
          className="mt-2 text-balance font-heading text-2xl font-black tracking-tight sm:text-3xl"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="hidden rounded-3xl border border-primary/25 bg-primary/10 p-3 text-primary sm:inline-flex">
        <Icon aria-hidden="true" />
      </span>
    </div>
  );
}

function IssuePanel({ issues }: { issues: QueryIssue[] }) {
  return (
    <section
      aria-labelledby="content-issues-title"
      className="rounded-[2rem] border border-destructive/25 bg-destructive/10 p-5 text-destructive shadow-xl backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-start gap-3">
        <CircleAlertIcon aria-hidden="true" className="mt-1 shrink-0" />
        <div>
          <h2
            id="content-issues-title"
            className="font-heading text-xl font-bold"
          >
            Some content could not be loaded
          </h2>
          <p className="mt-1 text-sm text-destructive/85">
            No edits were attempted. The available sections below still render
            safely.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {issues.map((issue) => (
              <li key={`${issue.source}-${issue.message}`}>
                <span className="font-semibold">{issue.source}:</span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/35 p-8 text-center text-muted-foreground">
      <SparklesIcon aria-hidden="true" className="mx-auto mb-3 text-primary" />
      <p>{message}</p>
    </div>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "text-muted-foreground"
      }
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

function JsonPreview({ value }: { value: JsonValue }) {
  return (
    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
      {formatJson(value)}
    </pre>
  );
}

function formatJson(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "not updated";
  }

  return dateFormatter.format(new Date(value));
}

function getHeadingId(title: string): string {
  return `${title.toLowerCase().replaceAll(" ", "-")}-title`;
}
