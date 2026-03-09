import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "bd_session";
const SESSION_VALUE  = process.env.DASHBOARD_SECRET ?? "change-me";

/** Call at the top of every server page/layout to protect it. */
export async function requireAuth() {
  const store = await cookies();
  const val   = store.get(SESSION_COOKIE)?.value;
  if (val !== SESSION_VALUE) redirect("/login");
}

/** Returns true if the session cookie is valid. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export { SESSION_COOKIE, SESSION_VALUE };
