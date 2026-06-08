import { SignUp } from "@clerk/react-router";
import { Shell } from "~/components/layout";

/** Clerk-hosted sign-up page (Flow A entry, also used for Flow B invites). */
export default function SignUpPage() {
  return (
    <Shell>
      <div className="flex justify-center">
        {/* After sign-up (Flow A) head to checkout; an invited Flow B user who
            accepts and signs up lands on the dashboard, which self-heals. */}
        <SignUp
          signInUrl="/sign-in"
          forceRedirectUrl="/subscribe"
          signInForceRedirectUrl="/dashboard"
        />
      </div>
    </Shell>
  );
}
