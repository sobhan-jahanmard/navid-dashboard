"use client";

import { Suspense } from "react";
import { SignInComponent } from "./sign-in";

export default function SignIn() {
  return (
    <Suspense>
      <SignInComponent />;
    </Suspense>
  );
}
