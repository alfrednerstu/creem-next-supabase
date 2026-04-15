"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfile, type ProfileActionState } from "./actions";

const initial: ProfileActionState = {};

export default function UpdateProfileForm({
  initial: values,
}: {
  initial: { full_name: string; email: string };
}) {
  const [state, action] = useFormState(updateProfile, initial);
  return (
    <form action={action}>
      <label>
        Full name
        <input type="text" name="full_name" defaultValue={values.full_name} />
      </label>
      <label>
        Email
        <input type="email" value={values.email} disabled />
      </label>
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}
      {state.info ? <p className="alert alert-success">{state.info}</p> : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
