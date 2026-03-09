import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_VALUE, isAuthenticated } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const authed = await isAuthenticated();
  if (authed) redirect("/bookings");

  async function handleLogin(formData: FormData) {
    "use server";
    const password = formData.get("password") as string;
    if (password === SESSION_VALUE) {
      const store = await cookies();
      store.set(SESSION_COOKIE, SESSION_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      redirect("/bookings");
    } else {
      redirect("/login?error=1");
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-title">BEYOND</div>
        <p className="login-sub">Dashboard · Internal access only</p>

        <form action={handleLogin}>
          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            className="input"
            style={{ width: "100%", marginBottom: 16 }}
            placeholder="Enter dashboard password"
          />
          {error && (
            <p className="login-error" style={{ marginBottom: 12 }}>
              Incorrect password. Try again.
            </p>
          )}
          <button type="submit" className="btn btn-gold" style={{ width: "100%" }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
