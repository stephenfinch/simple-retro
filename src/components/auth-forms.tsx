"use client";

import { useActionState } from "react";
import { guestAction, loginAction, signupAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Error({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id ?? props.name}>{label}</Label>
      <Input id={props.id ?? props.name} className="h-11 text-base sm:text-sm" {...props} />
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" required autoFocus autoComplete="email" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <Error state={state} />
      <Button size="xl" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignupForm({ next, name }: { next?: string; name?: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Your name" name="name" required autoFocus defaultValue={name} autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
      <Error state={state} />
      <Button size="xl" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}

export function GuestForm({ retroId }: { retroId: string }) {
  const [state, action, pending] = useActionState(guestAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="retroId" value={retroId} />
      <Field label="Your name" name="name" required autoFocus placeholder="So others know who's here" autoComplete="given-name" />
      <Error state={state} />
      <Button size="xl" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Join the retro"}
      </Button>
    </form>
  );
}
