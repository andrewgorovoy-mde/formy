import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";

// App chrome shared across dashboard / builder / responses. Uses the default violet accent for
// the wordmark; per-form accent colors live inside the pages themselves.
export function TopBar({
  right,
  userEmail,
}: {
  right?: React.ReactNode;
  userEmail?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#FAFAF9]/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-sm text-white">
            F
          </span>
          Formy
        </Link>
        <div className="flex items-center gap-2">
          {right}
          {userEmail && <UserMenu email={userEmail} />}
        </div>
      </div>
    </header>
  );
}
