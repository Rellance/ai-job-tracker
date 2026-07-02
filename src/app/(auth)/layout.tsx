import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Brand } from "@/components/shared/brand";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Brand />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
