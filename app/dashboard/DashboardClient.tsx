"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Financial {
  totalGMV: number;
  totalCommission: number;
  totalCashfreeFee: number;
  totalCancellationEarn: number;
  totalNetProfit: number;
  commissionPerPass: number;
  cashfreeRatePct: number;
  cancellationFeePct: number;
  avgCashfreePerBooking: number;
  avgNetPerBooking: number;
  totalPassesSold: number;
}
interface Counts {
  total: number; paid: number; confirmed: number; cancelled: number;
  pending: number; failed: number; totalPassesSold: number;
  emailsSent: number; emailsPending: number;
}
interface PassType { name: string; qty: number; revenue: number; }
interface EventStat {
  id: string; title: string; revenue: number; bookings: number; passes: number;
  commission: number; cashfreeFee: number; cancellationEarning: number;
  netProfit: number; cancelledCount: number;
}
interface DailyPt {
  date: string; bookings: number; passes: number;
  revenue: number; profit: number; cancelled: number;
}
interface PayMethod { method: string; count: number; }
interface RecentBooking {
  bookingId: string; eventTitle: string; grandTotal: number; passes: number;
  ticketSummary: string; commission: number; cashfreeFee: number;
  cancellationEarning: number; netProfit: number;
  isCancelled: boolean; createdAt: string;
}
interface Props {
  financial: Financial; counts: Counts; passTypes: PassType[];
  topEvents: EventStat[]; dailyData: DailyPt[];
  paymentMethods: PayMethod[]; recentBookings: RecentBooking[];
}

/* ─── Formatters ─────────────────────────────────────────────────────────── */
const inr = (n: number, d = 0) =>
  `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const fmtD = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

const COLORS = ["#c9b97a","#3ecf8e","#60a5fa","#a78bfa","#f87171","#fb923c","#34d399","#e879f9"];

/* ─── Sparkline ──────────────────────────────────────────────────────────── */
function Spark({ data, color = "#c9b97a" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 80; const H = 32; const max = Math.max(...data, 1);
  const step = W / (data.length - 1);
  const pts  = data.map((v, i) => `${i * step},${H - (v / max) * H}`).join(" ");
  const area = `M0,${H} ${data.map((v, i) => `L${i * step},${H - (v / max) * H}`).join(" ")} L${W},${H} Z`;
  const gid  = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.4, pointerEvents: "none" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Donut ──────────────────────────────────────────────────────────────── */
function Donut({ slices, size = 88 }: { slices: { v: number; color: string; label: string }[]; size?: number }) {
  const cx = size / 2; const r = size * 0.36; const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.v, 0);
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
  );
  let used = 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {slices.map((sl, i) => {
        const dash = (sl.v / total) * circ;
        const rot  = (used / total) * 360 - 90;
        used += sl.v;
        return (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={sl.color} strokeWidth="11" opacity="0.85"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform={`rotate(${rot} ${cx} ${cx})`}>
            <title>{sl.label}: {sl.v}</title>
          </circle>
        );
      })}
      <circle cx={cx} cy={cx} r={r - 7} fill="var(--surface)" />
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
      color: "var(--text-3)", display: "flex", alignItems: "center", gap: 10,
      marginTop: 28, marginBottom: 14,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function StatCard({
  label, value, color, note, accent, children,
}: {
  label: string; value: string | number; color?: string;
  note?: React.ReactNode; accent?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      padding: "18px 20px", position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {accent && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: accent }} />}
      <div style={{
        fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--text-3)", paddingLeft: accent ? 10 : 0,
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "0.02em",
        lineHeight: 1, color: color ?? "var(--text)", paddingLeft: accent ? 10 : 0,
      }}>{value}</div>
      {note && (
        <div style={{ fontSize: 11, color: "var(--text-3)", paddingLeft: accent ? 10 : 0, lineHeight: 1.5 }}>
          {note}
        </div>
      )}
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
      color: "var(--gold)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(201,185,122,0.2),transparent)" }} />
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: "9px 12px", textAlign: right ? "right" : "left",
      fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
      color: "var(--text-3)", fontWeight: 600, whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
export default function DashboardClient({
  financial, counts, passTypes, topEvents, dailyData, paymentMethods, recentBookings,
}: Props) {
  const [chartTab, setChartTab] = useState<"revenue"|"profit"|"bookings"|"passes">("revenue");

  const chartBars = useMemo(() => dailyData.map((d) => ({
    ...d,
    val: chartTab === "revenue"  ? d.revenue
       : chartTab === "profit"   ? d.profit
       : chartTab === "bookings" ? d.bookings
       : d.passes,
  })), [dailyData, chartTab]);

  const chartMax = Math.max(...chartBars.map((b) => b.val), 1);
  const spark14r = dailyData.slice(-14).map((d) => d.revenue);
  const spark14p = dailyData.slice(-14).map((d) => d.profit);
  const spark14b = dailyData.slice(-14).map((d) => d.bookings);
  const spark14t = dailyData.slice(-14).map((d) => d.passes);

  const convRate   = counts.total > 0    ? pct((counts.paid      / counts.total) * 100) : "—";
  const failRate   = counts.total > 0    ? pct((counts.failed    / counts.total) * 100) : "—";
  const cancelRate = counts.paid  > 0    ? pct((counts.cancelled / counts.paid)  * 100) : "—";
  const marginPct  = financial.totalCommission > 0
    ? pct((financial.totalNetProfit / financial.totalCommission) * 100) : "—";
  const breakeven  = inr(financial.commissionPerPass / (financial.cashfreeRatePct / 100), 0);
  const avgOrderV  = counts.paid             > 0 ? inr(financial.totalGMV / counts.paid, 0) : "—";
  const avgPassV   = counts.totalPassesSold  > 0 ? inr(financial.totalGMV / counts.totalPassesSold, 0) : "—";
  const avgPPB     = counts.confirmed        > 0 ? (counts.totalPassesSold / counts.confirmed).toFixed(2) : "—";
  const chartColor = chartTab === "revenue" ? "#c9b97a" : chartTab === "profit" ? "#3ecf8e"
                   : chartTab === "bookings" ? "#60a5fa" : "#fbbf24";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: "0.05em", color: "var(--text)", lineHeight: 1 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 5, fontWeight: 300 }}>
          Financial performance · Pass analytics · Operations
        </p>
      </div>

      {/* ══ REVENUE & PROFIT ═════════════════════════════════════════════════ */}
      <SL>Revenue &amp; Profit</SL>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
        <StatCard label="Gross GMV" value={inr(financial.totalGMV)} color="#60a5fa" accent="#60a5fa"
          note={<><strong style={{ color: "var(--text-2)" }}>{counts.paid}</strong> paid bookings</>}>
          <Spark data={spark14r} color="#60a5fa" />
        </StatCard>

        <StatCard label="Commission Earned" value={inr(financial.totalCommission)} color="var(--gold)" accent="var(--gold)"
          note={<>₹{financial.commissionPerPass}/pass × <strong style={{ color: "var(--text-2)" }}>{counts.totalPassesSold}</strong> passes</>}>
          <Spark data={dailyData.slice(-14).map((d) => d.passes * financial.commissionPerPass)} color="#c9b97a" />
        </StatCard>

        <StatCard label="Cashfree Fees Paid" value={`−${inr(financial.totalCashfreeFee, 2)}`} color="var(--red)" accent="var(--red)"
          note={<>{financial.cashfreeRatePct}% of GMV · avg <strong style={{ color: "var(--text-2)" }}>{inr(financial.avgCashfreePerBooking, 2)}</strong>/booking</>}
        />

        <StatCard label="Cancellation Earnings" accent="var(--amber)"
          value={financial.totalCancellationEarn > 0 ? `+${inr(financial.totalCancellationEarn, 2)}` : "₹0"}
          color={financial.totalCancellationEarn > 0 ? "var(--amber)" : "var(--text-3)"}
          note={<>{financial.cancellationFeePct}% on cancel · <strong style={{ color: "var(--text-2)" }}>{counts.cancelled}</strong> booking{counts.cancelled !== 1 ? "s" : ""}</>}
        />
      </div>

      {/* Net profit + per-booking equation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <StatCard label="Net Profit" accent={financial.totalNetProfit >= 0 ? "var(--green)" : "var(--red)"}
          value={`${financial.totalNetProfit < 0 ? "−" : ""}${inr(financial.totalNetProfit, 2)}`}
          color={financial.totalNetProfit >= 0 ? "var(--green)" : "var(--red)"}
          note={<>Margin: <strong style={{ color: "var(--text-2)" }}>{marginPct}</strong> of commission</>}>
          <Spark data={spark14p} color="#3ecf8e" />
        </StatCard>

        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderTop: "2px solid rgba(201,185,122,0.25)", display: "flex" }}>
          {[
            { lbl: "Commission / pass",  val: `₹${financial.commissionPerPass}`,                                                                    color: "var(--gold)",  sub: "per confirmed pass",         op: "−" },
            { lbl: "Avg Cashfree fee",   val: inr(financial.avgCashfreePerBooking, 2),                                                              color: "var(--red)",   sub: `${financial.cashfreeRatePct}% × avg order`, op: "+" },
            { lbl: "Avg cancel earn",    val: counts.cancelled > 0 ? inr(r2(financial.totalCancellationEarn / counts.cancelled), 2) : "—",          color: "var(--amber)", sub: `${financial.cancellationFeePct}% if cancelled`, op: "=" },
            { lbl: "Avg net / booking",  val: inr(financial.avgNetPerBooking, 2),                                                                    color: financial.avgNetPerBooking >= 0 ? "var(--green)" : "var(--red)", sub: "your take-home", op: "" },
          ].map((block, i) => (
            <div key={i} style={{ flex: 1, padding: "14px 16px", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--border)" : "none", position: "relative" }}>
              {i > 0 && (
                <div style={{ position: "absolute", left: -9, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--text-3)" }}>
                  {["−", "+", "="][i - 1]}
                </div>
              )}
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>{block.lbl}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: block.color }}>{block.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{block.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BOOKING COUNTS ═══════════════════════════════════════════════════ */}
      <SL>Bookings</SL>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
        <StatCard label="All Attempts" value={counts.total} note="Every initiated booking" />
        <StatCard label="Paid" value={counts.paid} color="var(--green)" accent="var(--green)"
          note={<>Conv: <strong style={{ color: "var(--text-2)" }}>{convRate}</strong></>}>
          <Spark data={spark14b} color="#3ecf8e" />
        </StatCard>
        <StatCard label="Confirmed" value={counts.confirmed} color="var(--green)" accent="var(--green)"
          note="Paid & not cancelled" />
        <StatCard label="Cancelled" value={counts.cancelled} color="var(--amber)" accent="var(--amber)"
          note={<>Rate: <strong style={{ color: "var(--text-2)" }}>{cancelRate}</strong> of paid</>} />
        <StatCard label="Pending" value={counts.pending} color="var(--amber)" accent="var(--amber)"
          note="Payment not completed" />
        <StatCard label="Failed" value={counts.failed} color="var(--red)" accent="var(--red)"
          note={<>Rate: <strong style={{ color: "var(--text-2)" }}>{failRate}</strong></>} />
      </div>

      {/* ══ PASSES SOLD ══════════════════════════════════════════════════════ */}
      <SL>Passes Sold</SL>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatCard label="Total Passes Sold" value={counts.totalPassesSold} color="var(--gold)" accent="var(--gold)"
          note="Confirmed only — excludes cancelled">
          <Spark data={spark14t} color="#c9b97a" />
        </StatCard>
        <StatCard label="Passes / Booking" value={avgPPB} note="Avg passes per confirmed order" />
        <StatCard label="Avg Pass Value"   value={avgPassV} note="GMV ÷ passes sold" />
        <StatCard label="Avg Order Value"  value={avgOrderV} note="GMV ÷ paid bookings" />
      </div>

      {/* ══ 30-DAY CHART ══════════════════════════════════════════════════════ */}
      <SL>Last 30 Days</SL>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", padding: 3 }}>
            {(["revenue","profit","bookings","passes"] as const).map((t) => (
              <button key={t} onClick={() => setChartTab(t)} style={{
                padding: "6px 14px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", border: "none", cursor: "pointer", fontFamily: "var(--font)",
                background: chartTab === t ? "var(--gold)" : "transparent",
                color: chartTab === t ? "#080808" : "var(--text-3)",
                transition: "background 0.15s, color 0.15s",
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            30-day total: <span style={{ color: "var(--text-2)" }}>
              {chartTab === "bookings" || chartTab === "passes"
                ? chartBars.reduce((s, d) => s + d.val, 0)
                : inr(chartBars.reduce((s, d) => s + d.val, 0), 2)}
            </span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
          {chartBars.map((d, i) => {
            const h   = d.val !== 0 ? Math.max((Math.abs(d.val) / chartMax) * 102, 3) : 1;
            const tip = chartTab === "bookings" ? `${d.val} bookings`
                      : chartTab === "passes"   ? `${d.val} passes`
                      : inr(d.val, 2);
            return (
              <div key={i} title={`${fmtD(d.date)}: ${tip}`}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = d.val !== 0 ? "0.65" : "0.15"; }}
                style={{
                  flex: 1, height: h,
                  background: d.val !== 0 ? chartColor : "rgba(255,255,255,0.06)",
                  opacity: d.val !== 0 ? 0.65 : 0.15, transition: "opacity 0.12s", cursor: "default",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 5 }}>
          {chartBars.map((d, i) => (
            <span key={i} style={{ flex: 1, fontSize: 9, color: "var(--text-3)", textAlign: "center", overflow: "hidden" }}>
              {i % 5 === 0 ? fmtD(d.date) : ""}
            </span>
          ))}
        </div>
      </div>

      {/* ══ PASS TYPES + WATERFALL ════════════════════════════════════════════ */}
      <SL>Pass Breakdown &amp; Revenue Flow</SL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>

        {/* Waterfall */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20 }}>
          <CardTitle>Where every rupee goes</CardTitle>
          {[
            { dot: "#60a5fa",              label: "Gross GMV collected",                                                               val: inr(financial.totalGMV),                        color: "#60a5fa" },
            { dot: "rgba(255,255,255,.2)", label: "Returned to organisers",                                                           val: `−${inr(financial.totalGMV - financial.totalCommission)}`, color: "var(--text-3)" },
            { dot: "var(--gold)",          label: `Commission (₹${financial.commissionPerPass} × ${financial.totalPassesSold} passes)`, val: `+${inr(financial.totalCommission)}`,            color: "var(--gold)" },
            { dot: "var(--amber)",         label: `Cancel earnings (${financial.cancellationFeePct}% × ${counts.cancelled} bookings)`, val: financial.totalCancellationEarn > 0 ? `+${inr(financial.totalCancellationEarn, 2)}` : "—", color: "var(--amber)" },
            { dot: "var(--red)",           label: `Cashfree fees (${financial.cashfreeRatePct}% of GMV)`,                              val: `−${inr(financial.totalCashfreeFee, 2)}`,        color: "var(--red)" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.dot, flexShrink: 0 }} />
                {row.label}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: row.color }}>{row.val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 6, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Net Profit</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: financial.totalNetProfit >= 0 ? "var(--green)" : "var(--red)" }}>
              {financial.totalNetProfit < 0 ? "−" : ""}{inr(financial.totalNetProfit, 2)}
            </span>
          </div>
        </div>

        {/* Pass types */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <CardTitle>Passes sold by type</CardTitle>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)", marginLeft: "auto", paddingBottom: 16 }}>
              {counts.totalPassesSold} total
            </span>
          </div>
          {passTypes.length === 0
            ? <div style={{ color: "var(--text-3)", fontSize: 13, padding: "20px 0" }}>No pass data yet</div>
            : passTypes.map((p, i) => {
              const maxQty = passTypes[0].qty || 1;
              const color  = COLORS[i % COLORS.length];
              return (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                  <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(p.qty / maxQty) * 100}%`, background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color, minWidth: 36, textAlign: "right" }}>{p.qty}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 72, textAlign: "right" }}>{inr(p.revenue)}</span>
                  <span style={{ fontSize: 10, color: "var(--text-3)", minWidth: 34, textAlign: "right" }}>
                    {counts.totalPassesSold > 0 ? `${Math.round((p.qty / counts.totalPassesSold) * 100)}%` : "—"}
                  </span>
                </div>
              );
            })
          }
          {passTypes.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 3 }}>Best-selling</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--gold)" }}>{passTypes[0].name}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 3 }}>Avg pass value</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text)" }}>{avgPassV}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ TOP EVENTS ════════════════════════════════════════════════════════ */}
      <SL>Event Performance</SL>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-3)" }}>
            Top Events by Revenue
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <Th>Event</Th><Th right>Orders</Th><Th right>Passes</Th><Th right>Cancelled</Th>
                  <Th right>GMV</Th><Th right>Commission</Th><Th right>Cashfree Fee</Th>
                  <Th right>Cancel Earn</Th><Th right>Net Profit</Th>
                </tr>
              </thead>
              <tbody>
                {topEvents.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>No events yet</td></tr>
                  : topEvents.map((ev) => (
                    <tr key={ev.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 13, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-3)" }}>{ev.id.slice(0, 10)}…</div>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, color: "var(--text-2)" }}>{ev.bookings}</td>
                      <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, color: "var(--text-2)" }}>{ev.passes}</td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        {ev.cancelledCount > 0
                          ? <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--amber)" }}>{ev.cancelledCount}</span>
                          : <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#60a5fa" }}>{inr(ev.revenue)}</span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--gold)" }}>{inr(ev.commission)}</span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--red)" }}>−{inr(ev.cashfreeFee, 2)}</span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--amber)" }}>
                          {ev.cancellationEarning > 0 ? `+${inr(ev.cancellationEarning, 2)}` : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: ev.netProfit >= 0 ? "var(--green)" : "var(--red)" }}>
                          {ev.netProfit < 0 ? "−" : ""}{inr(ev.netProfit, 2)}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20, flex: 1 }}>
            <CardTitle>Payment Methods</CardTitle>
            {paymentMethods.length === 0
              ? <div style={{ color: "var(--text-3)", fontSize: 13 }}>No data yet</div>
              : (
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Donut slices={paymentMethods.slice(0, 6).map((m, i) => ({ v: m.count, label: m.method, color: COLORS[i] }))} />
                  <div style={{ flex: 1 }}>
                    {paymentMethods.slice(0, 6).map((m, i) => (
                      <div key={m.method} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span style={{ fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i], flexShrink: 0 }} />
                          {m.method}
                        </span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20 }}>
            <CardTitle>Email Delivery</CardTitle>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Confirmed tickets emailed</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 21, color: counts.emailsPending === 0 && counts.confirmed > 0 ? "var(--green)" : "var(--amber)" }}>
                {counts.emailsSent} / {counts.confirmed}
              </span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
              <div style={{
                height: "100%", borderRadius: 3, background: "var(--green)", transition: "width 0.5s",
                width: counts.confirmed > 0 ? `${(counts.emailsSent / counts.confirmed) * 100}%` : "0%",
              }} />
            </div>
            <div style={{ fontSize: 11, marginTop: 8, color: counts.emailsPending > 0 ? "var(--amber)" : "var(--green)" }}>
              {counts.emailsPending > 0
                ? `⚠ ${counts.emailsPending} ticket${counts.emailsPending > 1 ? "s" : ""} not yet emailed`
                : counts.confirmed > 0 ? "✓ All confirmed tickets emailed" : "No confirmed bookings yet"}
            </div>
          </div>
        </div>
      </div>

      {/* ══ INSIGHTS ══════════════════════════════════════════════════════════ */}
      <SL>Quick Insights</SL>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Conversion Rate",   val: convRate,   sub: "Paid ÷ all attempts",                col: "var(--green)" },
          { label: "Failure Rate",      val: failRate,   sub: `${counts.failed} failed payments`,   col: "var(--red)" },
          { label: "Cancellation Rate", val: cancelRate, sub: `${counts.cancelled} of ${counts.paid} paid`, col: "var(--amber)" },
          { label: "Profit Margin",     val: marginPct,  sub: "Net ÷ gross commission",             col: "var(--green)" },
          { label: "Break-even Order",  val: breakeven,  sub: "GMV at which Cashfree fee = ₹50",    col: "var(--amber)" },
          { label: "Avg Order Value",   val: avgOrderV,  sub: "GMV ÷ paid bookings",                col: "var(--text-2)" },
          { label: "Avg Pass Value",    val: avgPassV,   sub: "GMV ÷ passes sold",                  col: "var(--text-2)" },
          { label: "Passes / Booking",  val: avgPPB,     sub: "Confirmed bookings only",            col: "var(--text-2)" },
        ].map((ic) => (
          <div key={ic.label} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderLeft: `3px solid ${ic.col}`, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: ic.col, marginBottom: 5, opacity: 0.85 }}>
              {ic.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1, color: ic.col === "var(--text-2)" ? "var(--text)" : ic.col }}>
              {ic.val}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{ic.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ RECENT BOOKINGS ═══════════════════════════════════════════════════ */}
      <SL>Recent Paid Bookings</SL>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>Booking</Th><Th>Event</Th><Th>Passes</Th>
                <Th right>Order Total</Th><Th right>Commission</Th>
                <Th right>Cashfree Fee</Th><Th right>Cancel Earn</Th>
                <Th right>Net Profit</Th><Th>Status</Th><Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>No bookings yet</td></tr>
                : recentBookings.map((b) => (
                  <tr key={b.bookingId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <Link href={`/bookings/${b.bookingId}`} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-3)", textDecoration: "none" }}>
                        {b.bookingId.slice(0, 10)}…
                      </Link>
                    </td>
                    <td style={{ padding: "10px 14px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: b.isCancelled ? "var(--text-3)" : "var(--text)" }}>{b.eventTitle}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: b.isCancelled ? "var(--text-3)" : "var(--gold)" }}>{b.passes}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.ticketSummary}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#60a5fa" }}>{inr(b.grandTotal)}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--gold)" }}>{inr(b.commission)}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--red)" }}>−{inr(b.cashfreeFee, 2)}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--amber)" }}>
                        {b.cancellationEarning > 0 ? `+${inr(b.cancellationEarning, 2)}` : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: b.netProfit >= 0 ? "var(--green)" : "var(--red)" }}>
                        {b.netProfit < 0 ? "−" : ""}{inr(b.netProfit, 2)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {b.isCancelled
                        ? <span className="badge badge-muted">Cancelled</span>
                        : <span className="badge badge-green">Confirmed</span>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {fmtDT(b.createdAt)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function r2(n: number) { return parseFloat(n.toFixed(2)); }