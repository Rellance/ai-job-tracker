import { redirect } from "next/navigation";

export default function Home() {
  // Until auth + a marketing landing land (M1), send users to the app shell.
  redirect("/dashboard");
}
