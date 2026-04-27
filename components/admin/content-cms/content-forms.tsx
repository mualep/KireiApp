"use client";

import { useActionState, useEffect, useId, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";

import {
  createQuestionAction,
  createServiceAction,
  createTestimonialAction,
  deleteQuestionAction,
  type ContentActionState,
  updateLandingContentAction,
  updateQuestionAction,
  updateServiceAction,
  updateTestimonialAction,
} from "@/app/admin/(shell)/content/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type LandingContentFormProps = {
  canEdit: boolean;
  row: {
    content_key: string;
    content_value: JsonValue;
    id: string;
    section: string;
  };
};

type ServiceFormValue = {
  description: string | null;
  game_name: string;
  icon_url: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  service_type: string;
  sort_order: number;
};

type TestimonialFormValue = {
  avatar_url: string | null;
  buyer_name: string;
  comment: string;
  game: string;
  id: string;
  is_visible: boolean;
  rating: number;
  sort_order: number;
};

type QuestionFormValue = {
  answer: string;
  id: string;
  question: string;
  sort_order: number;
};

const initialState: ContentActionState = {};
const serviceTypes = [
  "Rank Boost",
  "Quest Completion",
  "Account Leveling",
  "Custom",
];

export function LandingContentForm({
  canEdit,
  row,
}: LandingContentFormProps) {
  const id = useId();
  const [state, formAction, isPending] = useActionState(
    updateLandingContentAction,
    initialState,
  );
  const isDisabled = isPending || !canEdit;
  const contentValueError = getFieldError(state, "content_value");

  useRefreshOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={row.id} />
      <input name="section" type="hidden" value={row.section} />
      <input name="content_key" type="hidden" value={row.content_key} />
      <FieldGroup>
        <Field data-disabled={isDisabled} data-invalid={Boolean(contentValueError)}>
          <FieldLabel htmlFor={`${id}-content-value`}>JSON Value</FieldLabel>
          <InputGroup className="min-h-40 rounded-2xl bg-background/70">
            <InputGroupTextarea
              id={`${id}-content-value`}
              name="content_value"
              rows={7}
              spellCheck={false}
              autoComplete="off"
              defaultValue={formatJsonForEdit(row.content_value)}
              disabled={isDisabled}
              aria-invalid={Boolean(contentValueError)}
              placeholder={'"Updated content…"'}
            />
          </InputGroup>
          <FieldDescription>
            Use valid JSON. Strings must stay wrapped in quotes.
          </FieldDescription>
          {contentValueError ? <FieldError>{contentValueError}</FieldError> : null}
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant={canEdit ? "secondary" : "outline"}
          className={canEdit ? "border-primary/20 bg-primary/10 text-primary" : ""}
        >
          {canEdit ? "Editable" : "Read Only"}
        </Badge>
        <Button
          className="rounded-full transition-colors transition-transform hover:-translate-y-0.5"
          disabled={isDisabled}
          type="submit"
        >
          <SaveIcon data-icon="inline-start" aria-hidden="true" />
          {isPending ? "Saving…" : "Save Row"}
        </Button>
      </div>
    </form>
  );
}

export function CreateServiceForm() {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    createServiceAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <Card className="border-border/80 bg-background/45">
      <CardHeader>
        <CardTitle>Create Service</CardTitle>
        <CardDescription>
          Add a service card without changing public image policy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <ServiceFields
            idPrefix={idPrefix}
            isPending={isPending}
            state={state}
          />
          <ActionFeedback state={state} />
          <Button
            className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
            disabled={isPending}
            type="submit"
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {isPending ? "Creating…" : "Create Service"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ServiceForm({ service }: { service: ServiceFormValue }) {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    updateServiceAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-4">
      <input name="id" type="hidden" value={service.id} />
      <ServiceFields
        idPrefix={idPrefix}
        isPending={isPending}
        service={service}
        state={state}
      />
      <ActionFeedback state={state} />
      <Button
        className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
        disabled={isPending}
        type="submit"
      >
        <SaveIcon data-icon="inline-start" aria-hidden="true" />
        {isPending ? "Saving…" : "Save Service"}
      </Button>
    </form>
  );
}

export function CreateTestimonialForm() {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    createTestimonialAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <Card className="border-border/80 bg-background/45">
      <CardHeader>
        <CardTitle>Create Testimonial</CardTitle>
        <CardDescription>
          New testimonials stay hidden unless marked visible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <TestimonialFields
            idPrefix={idPrefix}
            isPending={isPending}
            state={state}
          />
          <ActionFeedback state={state} />
          <Button
            className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
            disabled={isPending}
            type="submit"
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {isPending ? "Creating…" : "Create Testimonial"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function TestimonialForm({
  testimonial,
}: {
  testimonial: TestimonialFormValue;
}) {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    updateTestimonialAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-4">
      <input name="id" type="hidden" value={testimonial.id} />
      <TestimonialFields
        idPrefix={idPrefix}
        isPending={isPending}
        state={state}
        testimonial={testimonial}
      />
      <ActionFeedback state={state} />
      <Button
        className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
        disabled={isPending}
        type="submit"
      >
        <SaveIcon data-icon="inline-start" aria-hidden="true" />
        {isPending ? "Saving…" : "Save Testimonial"}
      </Button>
    </form>
  );
}

export function CreateQuestionForm() {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    createQuestionAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <Card className="border-border/80 bg-background/45">
      <CardHeader>
        <CardTitle>Create FAQ Item</CardTitle>
        <CardDescription>
          Questions are managed in dedicated FAQ rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <QuestionFields
            idPrefix={idPrefix}
            isPending={isPending}
            state={state}
          />
          <ActionFeedback state={state} />
          <Button
            className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
            disabled={isPending}
            type="submit"
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {isPending ? "Creating…" : "Create FAQ Item"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function QuestionForm({ item }: { item: QuestionFormValue }) {
  const idPrefix = useId();
  const [state, formAction, isPending] = useActionState(
    updateQuestionAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-4">
      <input name="id" type="hidden" value={item.id} />
      <QuestionFields
        idPrefix={idPrefix}
        isPending={isPending}
        item={item}
        state={state}
      />
      <ActionFeedback state={state} />
      <Button
        className="w-fit rounded-full transition-colors transition-transform hover:-translate-y-0.5"
        disabled={isPending}
        type="submit"
      >
        <SaveIcon data-icon="inline-start" aria-hidden="true" />
        {isPending ? "Saving…" : "Save FAQ Item"}
      </Button>
    </form>
  );
}

export function DeleteQuestionForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(
    deleteQuestionAction,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={id} />
      <input name="confirm" type="hidden" value="delete" />
      <ActionFeedback state={state} />
      <Button
        className="w-fit rounded-full transition-colors"
        disabled={isPending}
        type="submit"
        variant="destructive"
      >
        <Trash2Icon data-icon="inline-start" aria-hidden="true" />
        {isPending ? "Deleting…" : "Delete FAQ Item"}
      </Button>
    </form>
  );
}

function ServiceFields({
  idPrefix,
  isPending,
  service,
  state,
}: {
  idPrefix: string;
  isPending: boolean;
  service?: Partial<ServiceFormValue>;
  state: ContentActionState;
}) {
  return (
    <FieldGroup className="gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          id={`${idPrefix}-game-name`}
          label="Game Title"
          name="game_name"
          placeholder="Mobile Legends…"
          defaultValue={service?.game_name}
          disabled={isPending}
          error={getFieldError(state, "game_name")}
        />
        <SelectField
          id={`${idPrefix}-service-type`}
          label="Service Type"
          name="service_type"
          options={serviceTypes}
          defaultValue={service?.service_type ?? "Rank Boost"}
          disabled={isPending}
          error={getFieldError(state, "service_type")}
        />
      </div>
      <TextareaField
        id={`${idPrefix}-description`}
        label="Description"
        name="description"
        placeholder="Short public service description…"
        defaultValue={service?.description ?? ""}
        disabled={isPending}
        error={getFieldError(state, "description")}
        rows={3}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          id={`${idPrefix}-icon-url`}
          label="Icon URL"
          name="icon_url"
          placeholder="https://example.com/icon.png…"
          defaultValue={service?.icon_url ?? ""}
          disabled={isPending}
          error={getFieldError(state, "icon_url")}
          type="url"
        />
        <TextInputField
          id={`${idPrefix}-image-url`}
          label="Image URL"
          name="image_url"
          placeholder="https://example.com/image.png…"
          defaultValue={service?.image_url ?? ""}
          disabled={isPending}
          error={getFieldError(state, "image_url")}
          type="url"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          id={`${idPrefix}-sort-order`}
          label="Sort Order"
          name="sort_order"
          placeholder="10…"
          defaultValue={String(service?.sort_order ?? 0)}
          disabled={isPending}
          error={getFieldError(state, "sort_order")}
          inputMode="numeric"
          type="number"
        />
        <CheckboxField
          id={`${idPrefix}-is-active`}
          label="Active on landing page"
          name="is_active"
          defaultChecked={service?.is_active ?? true}
          disabled={isPending}
        />
      </div>
    </FieldGroup>
  );
}

function TestimonialFields({
  idPrefix,
  isPending,
  state,
  testimonial,
}: {
  idPrefix: string;
  isPending: boolean;
  state: ContentActionState;
  testimonial?: Partial<TestimonialFormValue>;
}) {
  return (
    <FieldGroup className="gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          id={`${idPrefix}-buyer-name`}
          label="Buyer Name"
          name="buyer_name"
          placeholder="Sample Buyer…"
          defaultValue={testimonial?.buyer_name}
          disabled={isPending}
          error={getFieldError(state, "buyer_name")}
        />
        <TextInputField
          id={`${idPrefix}-game`}
          label="Game"
          name="game"
          placeholder="Valorant…"
          defaultValue={testimonial?.game}
          disabled={isPending}
          error={getFieldError(state, "game")}
        />
      </div>
      <TextareaField
        id={`${idPrefix}-comment`}
        label="Comment"
        name="comment"
        placeholder="Verified customer comment…"
        defaultValue={testimonial?.comment ?? ""}
        disabled={isPending}
        error={getFieldError(state, "comment")}
        rows={4}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <TextInputField
          id={`${idPrefix}-rating`}
          label="Rating"
          name="rating"
          placeholder="5…"
          defaultValue={String(testimonial?.rating ?? 5)}
          disabled={isPending}
          error={getFieldError(state, "rating")}
          inputMode="numeric"
          max={5}
          min={1}
          type="number"
        />
        <TextInputField
          id={`${idPrefix}-sort-order`}
          label="Sort Order"
          name="sort_order"
          placeholder="10…"
          defaultValue={String(testimonial?.sort_order ?? 0)}
          disabled={isPending}
          error={getFieldError(state, "sort_order")}
          inputMode="numeric"
          type="number"
        />
        <CheckboxField
          id={`${idPrefix}-is-visible`}
          label="Visible on landing page"
          name="is_visible"
          defaultChecked={testimonial?.is_visible ?? false}
          disabled={isPending}
        />
      </div>
      <TextInputField
        id={`${idPrefix}-avatar-url`}
        label="Avatar URL"
        name="avatar_url"
        placeholder="https://example.com/avatar.png…"
        defaultValue={testimonial?.avatar_url ?? ""}
        disabled={isPending}
        error={getFieldError(state, "avatar_url")}
        type="url"
      />
    </FieldGroup>
  );
}

function QuestionFields({
  idPrefix,
  isPending,
  item,
  state,
}: {
  idPrefix: string;
  isPending: boolean;
  item?: Partial<QuestionFormValue>;
  state: ContentActionState;
}) {
  return (
    <FieldGroup className="gap-4">
      <TextInputField
        id={`${idPrefix}-question`}
        label="Question"
        name="question"
        placeholder="How does an order start?…"
        defaultValue={item?.question}
        disabled={isPending}
        error={getFieldError(state, "question")}
      />
      <TextareaField
        id={`${idPrefix}-answer`}
        label="Answer"
        name="answer"
        placeholder="Short public answer…"
        defaultValue={item?.answer ?? ""}
        disabled={isPending}
        error={getFieldError(state, "answer")}
        rows={4}
      />
      <TextInputField
        id={`${idPrefix}-sort-order`}
        label="Sort Order"
        name="sort_order"
        placeholder="10…"
        defaultValue={String(item?.sort_order ?? 0)}
        disabled={isPending}
        error={getFieldError(state, "sort_order")}
        inputMode="numeric"
        type="number"
      />
    </FieldGroup>
  );
}

function TextInputField({
  defaultValue,
  disabled,
  error,
  id,
  inputMode,
  label,
  max,
  min,
  name,
  placeholder,
  type = "text",
}: {
  defaultValue?: string;
  disabled: boolean;
  error?: string;
  id: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  max?: number;
  min?: number;
  name: string;
  placeholder: string;
  type?: "number" | "text" | "url";
}) {
  return (
    <Field data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="h-11 rounded-2xl bg-background/70">
        <InputGroupInput
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          min={min}
          max={max}
          autoComplete="off"
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
        />
      </InputGroup>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function TextareaField({
  defaultValue,
  disabled,
  error,
  id,
  label,
  name,
  placeholder,
  rows,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  placeholder: string;
  rows: number;
}) {
  return (
    <Field data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="min-h-24 rounded-2xl bg-background/70">
        <InputGroupTextarea
          id={id}
          name={name}
          rows={rows}
          autoComplete="off"
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
        />
      </InputGroup>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function SelectField({
  defaultValue,
  disabled,
  error,
  id,
  label,
  name,
  options,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <Field data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        name={name}
        autoComplete="off"
        defaultValue={defaultValue}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 rounded-2xl border border-input bg-background/70 px-3 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          error ? "border-destructive ring-3 ring-destructive/20" : "",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function CheckboxField({
  defaultChecked,
  disabled,
  id,
  label,
  name,
}: {
  defaultChecked: boolean;
  disabled: boolean;
  id: string;
  label: string;
  name: string;
}) {
  return (
    <Field data-disabled={disabled}>
      <label
        htmlFor={id}
        className="flex h-11 items-center gap-3 rounded-2xl border border-input bg-background/70 px-3 text-sm text-muted-foreground"
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          autoComplete="off"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="size-4 accent-primary"
        />
        <span>{label}</span>
      </label>
    </Field>
  );
}

function ActionFeedback({ state }: { state: ContentActionState }) {
  if (!state.message) {
    return null;
  }

  if (state.status === "success") {
    return (
      <p
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
        role="status"
      >
        <CheckCircle2Icon aria-hidden="true" />
        {state.message}
      </p>
    );
  }

  return (
    <FieldError aria-live="polite" className="rounded-2xl bg-destructive/10 p-3">
      {state.message}
    </FieldError>
  );
}

function getFieldError(
  state: ContentActionState,
  field: string,
): string | undefined {
  return state.fieldErrors?.[field]?.[0];
}

function useRefreshOnSuccess(state: ContentActionState) {
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);
}

function formatJsonForEdit(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}
