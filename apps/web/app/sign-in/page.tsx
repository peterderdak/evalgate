import { Suspense } from "react";

import { SignInPage } from "../../components/sign-in-page";

function SignInFallback() {
  return <p className="text-sm text-ink/60">Loading sign-in...</p>;
}

export default function SignInRoute() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInPage />
    </Suspense>
  );
}
