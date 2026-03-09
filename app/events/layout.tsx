import { requireAuth } from "@/lib/auth";
import SideBar from "@/components/SideBar";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="dash-shell">
      <SideBar />
      <div className="dash-main">
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
