"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInWithOAuth, signInWithPassword, type AuthActionState } from "../actions";

const initial: AuthActionState = {};

export default function SignInForm({ next }: { next: string }) {
  const [state, action] = useFormState(signInWithPassword, initial);

  return (
    <>
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        {state.error ? (
          <p className="alert alert-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
      </form>

      <p className="divider">or continue with</p>

      <form action={async () => signInWithOAuth("google")} style={{ marginBottom: "var(--sp-3)" }}>
        <button type="submit" className="btn btn-ghost btn-block">
          Google
        </button>
      </form>
      <form action={async () => signInWithOAuth("github")} style={{ marginBottom: "var(--sp-6)" }}>
        <button type="submit" className="btn btn-ghost btn-block">
          GitHub
        </button>
      </form>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
