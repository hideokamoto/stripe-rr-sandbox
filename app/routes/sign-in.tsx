import { SignIn } from "@clerk/react-router";
import { Shell } from "~/components/layout";

/** Clerk-hosted sign-in page. */
export default function SignInPage() {
  return (
    <Shell>
      <div className="flex justify-center">
        <SignIn
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </Shell>
  );
}
