import { requireAuth } from "@/lib/auth";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  
  return (
    <div className="dash-main">
      <div className="dash-content">{children}</div>
    </div>
  );
}
