"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInWithOAuth, signUpWithPassword, type AuthActionState } from "../actions";

const initial: AuthActionState = {};

export default function SignUpForm() {
  const [state, action] = useFormState(signUpWithPassword, initial);

  return (
    <>
      <form action={action}>
        <label>
          Full name
          <input type="text" name="full_name" autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autoComplete="new-password" minLength={8} />
        </label>
        {state.error ? (
          <p className="alert alert-error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.info ? (
          <p className="alert alert-success" role="status">
            {state.info}
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
      <form action={async () => signInWithOAuth("github")}>
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
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}
