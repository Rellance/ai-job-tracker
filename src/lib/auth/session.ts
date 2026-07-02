import { redirect } from "next/navigation";

import { auth } from "@/auth";

/** Returns the authenticated user or redirects to /login. Use in server
 *  components and server actions that require a session. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}
