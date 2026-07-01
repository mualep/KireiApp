"use client";

import { useActionState, useState } from "react";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  MailIcon,
} from "lucide-react";

import { signInStaff, type LoginFormState } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  initialState?: LoginFormState;
};

export function LoginForm({ initialState = {} }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(
    signInStaff,
    initialState,
  );
  const hasError = Boolean(state.message);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={hasError}>
          <FieldLabel
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Email Address
          </FieldLabel>
          <InputGroup className={cn("h-12 rounded-full bg-background/70 transition-all", hasError && "border-red-500 ring-2 ring-red-500/30")}>
            <InputGroupAddon>
              <MailIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="email"
              name="email"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={state.email}
              disabled={isPending}
              aria-invalid={hasError}
              placeholder="admin@kireiku.com"
              className="text-foreground"
            />
          </InputGroup>
        </Field>

        <Field data-invalid={hasError}>
          <FieldLabel
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Password
          </FieldLabel>
          <InputGroup className={cn("h-12 rounded-full bg-background/70 transition-all", hasError && "border-red-500 ring-2 ring-red-500/30")}>
            <InputGroupAddon>
              <LockKeyholeIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={isPending}
              aria-invalid={hasError}
              placeholder="••••••••"
              className="text-foreground"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isPending}
                onClick={() => setShowPassword((current) => !current)}
                size="icon-xs"
              >
                {showPassword ? (
                  <EyeOffIcon aria-hidden="true" />
                ) : (
                  <EyeIcon aria-hidden="true" />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        {state.message ? (
          <FieldError aria-live="polite" className="text-red-400 font-medium mt-1">
            {state.message}
          </FieldError>
        ) : null}
      </FieldGroup>

      <Button
        type="submit"
        size="lg"
        className="mt-1 h-14 w-full rounded-full text-xs font-semibold uppercase tracking-widest shadow-xl shadow-primary/25 transition-colors transition-transform hover:-translate-y-0.5"
        disabled={isPending}
      >
        {isPending ? "Signing In…" : "Sign In"}
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </form>
  );
}
