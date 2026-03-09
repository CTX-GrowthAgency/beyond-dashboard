import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function RootPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/login");
  redirect("/bookings");
}
