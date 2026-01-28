import { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  CalendarDays,
  ShieldCheck,
  MapPin,
  Star,
  Settings as SettingsIcon,
  Upload,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Mail,
  Receipt,
  RefreshCcw,
  X,
} from "lucide-react";
import api from "@/services/api";

const DEFAULT_PREFS = {
  workspaceType: "any",
  seatingPreference: "any",
  allowInstantBookings: true,
  preferredCity: "",
  receiveEmailUpdates: true,
};

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    ink: "bg-ink text-white border-ink/20",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    brand: "bg-brand text-ink border-brand/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        tones[tone] || tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold text-ink truncate">
          {title}
        </h1>
        {subtitle ? <p className="text-sm text-slate mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function SidebarNav({ active, setActive, profile }) {
  const links = [
    { id: "about", label: "Overview", icon: User },
    { id: "trips", label: "Trips", icon: CalendarDays },
    { id: "refunds", label: "Refunds", icon: RefreshCcw },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const identityStatus =
    profile?.identityStatus || (profile?.verified ? "verified" : "unverified");

  const badge =
    identityStatus === "verified"
      ? { tone: "success", text: "Verified" }
      : identityStatus === "pending"
      ? { tone: "warn", text: "Pending" }
      : identityStatus === "rejected"
      ? { tone: "danger", text: "Action" }
      : { tone: "neutral", text: "Unverified" };

  return (
    <aside className="lg:sticky lg:top-20 space-y-4">
      <div className="rounded-3xl border border-charcoal/15 bg-white/85 shadow-sm backdrop-blur p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-slate uppercase">
              My account
            </div>
            <div className="mt-1 text-sm font-semibold text-ink truncate">
              {profile?.name || "Client"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={badge.tone}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {badge.text}
              </Pill>
              {profile?.email ? (
                <Pill tone={profile?.emailVerified ? "success" : "neutral"}>
                  <Mail className="h-3.5 w-3.5" />
                  {profile?.emailVerified ? "Email verified" : "Email not verified"}
                </Pill>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="mt-4 space-y-1">
          {links.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={[
                "w-full group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
                active === id
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/90 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <span
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center rounded-2xl border",
                    active === id
                      ? "border-white/10 bg-white/10"
                      : "border-charcoal/10 bg-white",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </span>
              <ChevronRight
                className={[
                  "h-4 w-4 opacity-60 transition",
                  active === id ? "translate-x-0" : "group-hover:translate-x-0.5",
                ].join(" ")}
              />
            </button>
          ))}
        </nav>
      </div>

      <div className="hidden lg:block rounded-3xl border border-charcoal/15 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <Sparkles className="h-4 w-4 text-brand" />
          Tips
        </div>
        <p className="mt-2 text-xs text-slate leading-relaxed">
          Complete your profile and upload your ID to speed up approvals and help hosts trust your requests.
        </p>
      </div>
    </aside>
  );
}

function Stat({ value, label }) {
  return (
    <div className="text-center px-2">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-slate mt-0.5">{label}</div>
    </div>
  );
}

function IdentityCard({ profile }) {
  const identityStatus =
    profile?.identityStatus || (profile?.verified ? "verified" : "unverified");

  let title = "Identity verification";
  let description = "Upload a valid ID to help keep the community safe.";
  let badgeTone = "neutral";
  let badgeText = "Not verified";

  if (identityStatus === "pending") {
    title = "Identity under review";
    description = "Thanks for submitting your ID. We are reviewing your information.";
    badgeTone = "warn";
    badgeText = "Pending review";
  } else if (identityStatus === "verified") {
    title = "Identity verified";
    description = "We have verified your government ID and account details.";
    badgeTone = "success";
    badgeText = "Verified";
  } else if (identityStatus === "rejected") {
    title = "Verification needed";
    description = "There was an issue with your last submission. Please upload your ID again.";
    badgeTone = "danger";
    badgeText = "Action required";
  }

  const yearsOn = profile?.yearsOn ?? 0;
  const existingDocs = Array.isArray(profile?.identityDocuments)
    ? profile.identityDocuments
    : [];

  return (
    <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <ShieldCheck className="h-5 w-5 text-brand" />
          {title}
        </div>
        <Pill tone={badgeTone}>{badgeText}</Pill>
      </div>

      <p className="text-sm text-slate leading-relaxed">{description}</p>

      <div className="inline-flex items-center gap-1 rounded-full border border-charcoal/20 px-3 py-1.5 text-xs text-slate">
        <Star className="h-3.5 w-3.5" />
        Community member since {new Date().getFullYear() - yearsOn}
      </div>

      {existingDocs.length > 0 && (
        <div className="pt-4 border-t border-charcoal/10 space-y-2">
          <div className="text-xs font-semibold text-slate uppercase tracking-wide">
            Uploaded documents
          </div>
          <ul className="space-y-1 text-xs text-ink/80">
            {existingDocs.map((doc, index) => {
              const label =
                doc.label ||
                (doc.type === "front"
                  ? "Front of ID"
                  : doc.type === "back"
                  ? "Back of ID"
                  : "Document");
              return (
                <li
                  key={doc.publicId || doc.url || index}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline flex-shrink-0"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function AboutMe({ profile, reviews }) {
  const isIdentityVerified =
    profile?.identityStatus === "verified" || profile?.verified === true;
  const roleLabel = (profile?.role || "Client").toString();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        subtitle="Manage how you appear to workspace owners and review your activity."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] gap-6">
        <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate">
                    No photo
                  </div>
                )}

                {isIdentityVerified ? (
                  <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-7 w-7 rounded-full bg-brand text-ink ring-2 ring-white">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-2xl font-semibold text-ink truncate">
                    {profile?.name || "Your name"}
                  </div>
                  <Pill tone="neutral">{roleLabel}</Pill>
                </div>

                <div className="mt-1 flex items-center gap-2 text-sm text-slate">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">
                    {profile?.location || "Add your city"}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-ink/90 text-sm leading-relaxed">
              {profile?.bio ||
                "Tell hosts a bit about yourself to make booking easier and build trust."}
            </p>
          </div>

          <div className="border-t border-charcoal/10 bg-slate-50/60 px-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat value={profile?.trips ?? 0} label="Trips" />
              <Stat value={reviews.length} label="Reviews" />
              <Stat value={profile?.yearsOn ?? 0} label="Years on FlexiDesk" />
            </div>
          </div>
        </div>

        <IdentityCard profile={profile} />
      </div>

      <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-charcoal/10">
          <h2 className="text-lg font-semibold text-ink">Reviews from hosts</h2>
          <p className="text-xs text-slate mt-0.5">
            Only hosts you have completed trips with can leave a review.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate">
            You do not have any reviews yet.
          </div>
        ) : (
          <div className="p-5 grid md:grid-cols-2 gap-6">
            {reviews.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl border border-charcoal/10 p-4 hover:shadow-sm transition bg-white"
              >
                <div className="flex items-center gap-3">
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt={r.author}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate">
                      Host
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate">{r.author}</div>
                    {r.location ? (
                      <div className="text-xs text-slate truncate">{r.location}</div>
                    ) : null}
                  </div>
                </div>
                {r.date ? <div className="text-xs text-slate mt-2">{r.date}</div> : null}
                <p className="text-sm text-ink/90 leading-relaxed mt-2">{r.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toneForStatus(status) {
  const s = String(status || "").toLowerCase();
  if (["paid", "completed", "confirmed", "approved"].includes(s)) return "success";
  if (["pending", "processing", "review", "requested"].includes(s)) return "warn";
  if (["cancelled", "canceled", "failed", "rejected", "refunded"].includes(s)) return "danger";
  return "neutral";
}

function normalizeToTripItem(b) {
  const id = b?._id || b?.id || b?.bookingId || b?.uid;
  const title = b?.listing?.title || b?.listingTitle || b?.title || "Booking";
  const img = b?.listing?.cover || b?.listing?.images?.[0] || b?.img || "";
  const listingName = b?.listing?.venue || b?.listing?.city || b?.listingName || "";
  const start = b?.startDate || b?.start || b?.from;
  const end = b?.endDate || b?.end || b?.to;
  const dates =
    start && end ? `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}` : b?.dates || "";
  const status = b?.status || b?.state || "";
  const total = b?.total || b?.amount || b?.totalAmount || b?.priceTotal;
  const currency = b?.currency || "PHP";
  const refundStatus = b?.refund?.status || b?.refundStatus || "";

  return {
    id: String(id || Math.random()),
    title,
    img,
    dates,
    listingName,
    status,
    total,
    currency,
    refundStatus,
    raw: b,
  };
}

function groupTripsByYear(items) {
  const byYear = new Map();
  for (const t of items) {
    const d =
      t?.raw?.startDate ||
      t?.raw?.createdAt ||
      t?.raw?.created_at ||
      t?.raw?.date ||
      t?.raw?.start ||
      t?.raw?.from ||
      t?.dates?.slice(0, 10) ||
      "";
    const year = d ? new Date(d).getFullYear() : new Date().getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(t);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  return years.map((y) => ({
    year: y,
    items: byYear
      .get(y)
      .slice()
      .sort((a, b) => {
        const da = new Date(
          a?.raw?.startDate || a?.raw?.createdAt || a?.raw?.date || 0
        ).getTime();
        const db = new Date(
          b?.raw?.startDate || b?.raw?.createdAt || b?.raw?.date || 0
        ).getTime();
        return db - da;
      }),
  }));
}

function PastTrips({ trips, bookings, onRequestRefund }) {
  const hasTrips = Array.isArray(trips) && trips.length > 0;
  const bookingItems = Array.isArray(bookings)
    ? bookings.map(normalizeToTripItem)
    : [];

  const tripItemsFromApi = [];
  if (hasTrips) {
    for (const g of trips) {
      const items = Array.isArray(g?.items) ? g.items : [];
      for (const x of items) {
        tripItemsFromApi.push(
          typeof x?.raw !== "undefined" ? x : normalizeToTripItem(x)
        );
      }
    }
  }

  const merged = [...bookingItems, ...tripItemsFromApi].filter(Boolean);
  const grouped = groupTripsByYear(merged);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trips"
        subtitle="Your bookings and completed stays are shown here."
      />

      {grouped.length === 0 ? (
        <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm px-5 py-8 text-sm text-slate">
          You do not have any trips yet.
        </div>
      ) : null}

      {grouped.map((group) => (
        <section key={group.year} className="space-y-3">
          <Pill tone="neutral">{group.year}</Pill>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {group.items.map((t) => {
              const stTone = toneForStatus(t.status);
              const rfTone = t.refundStatus ? toneForStatus(t.refundStatus) : "neutral";

              return (
                <article
                  key={t.id}
                  className="group rounded-3xl border border-charcoal/15 bg-white shadow-sm overflow-hidden flex flex-col hover:shadow-md transition"
                >
                  {t.img ? (
                    <img
                      src={t.img}
                      alt={t.title}
                      className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="h-44 w-full bg-slate-100 flex items-center justify-center text-xs text-slate">
                      No photo
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">{t.title}</div>
                          <div className="text-sm text-slate">{t.dates}</div>
                        </div>
                        {t.status ? (
                          <Pill tone={stTone}>{String(t.status)}</Pill>
                        ) : null}
                      </div>

                      {t.listingName ? (
                        <div className="text-xs text-slate">{t.listingName}</div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        {typeof t.total !== "undefined" && t.total !== null ? (
                          <Pill tone="neutral">
                            <Receipt className="h-3.5 w-3.5" />
                            {t.currency} {t.total}
                          </Pill>
                        ) : null}

                        {t.refundStatus ? (
                          <Pill tone={rfTone}>
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Refund: {String(t.refundStatus)}
                          </Pill>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRequestRefund?.(t)}
                        className="inline-flex items-center justify-center rounded-full border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Request refund
                      </button>

                      <div className="text-[11px] text-slate truncate">
                        Booking ID: {String(t.id).slice(-8)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Refunds({ refunds, onCreateRefund, onRefresh, loading }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Refunds"
        subtitle="Track your refund requests and their current status."
        right={
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full border border-charcoal/20 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {refunds.length === 0 ? (
        <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm px-5 py-8 text-sm text-slate">
          No refund requests found.
        </div>
      ) : (
        <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-charcoal/10">
            <h2 className="text-lg font-semibold text-ink">Your requests</h2>
            <p className="text-xs text-slate mt-0.5">
              Status updates appear here after review.
            </p>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-6">
            {refunds.map((r) => {
              const status = r?.status || r?.state || "pending";
              const tone = toneForStatus(status);
              const amount = r?.amount ?? r?.refundAmount ?? r?.total;
              const currency = r?.currency || "PHP";
              const createdAt = r?.createdAt || r?.created_at || r?.date;
              const bookingId = r?.bookingId || r?.booking?._id || r?.booking?.id;

              return (
                <article
                  key={r?._id || r?.id || `${bookingId}-${createdAt}`}
                  className="rounded-2xl border border-charcoal/10 p-4 hover:shadow-sm transition bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">
                        Refund request
                      </div>
                      <div className="text-xs text-slate truncate">
                        {bookingId ? `Booking: ${String(bookingId).slice(-10)}` : "Booking: —"}
                      </div>
                    </div>
                    <Pill tone={tone}>{String(status)}</Pill>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {typeof amount !== "undefined" && amount !== null ? (
                      <Pill tone="neutral">
                        <Receipt className="h-3.5 w-3.5" />
                        {currency} {amount}
                      </Pill>
                    ) : null}

                    {createdAt ? (
                      <Pill tone="neutral">{String(createdAt).slice(0, 10)}</Pill>
                    ) : null}
                  </div>

                  {r?.reason ? (
                    <p className="text-sm text-ink/90 leading-relaxed">{r.reason}</p>
                  ) : (
                    <p className="text-sm text-slate leading-relaxed">No reason provided.</p>
                  )}

                  {r?.adminNote ? (
                    <div className="rounded-2xl border border-charcoal/10 bg-slate-50/60 p-3 text-xs text-ink/80">
                      {r.adminNote}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <RefreshCcw className="h-4 w-4 text-brand" />
          Need a refund for a booking?
        </div>
        <p className="mt-1 text-sm text-slate">
          Open your Trips tab and use “Request refund” on the booking.
        </p>
      </div>
    </div>
  );
}

function RefundModal({ open, onClose, booking, onSubmit, submitting }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;

  const title = booking?.title || booking?.raw?.listing?.title || "Booking";
  const bookingId = booking?.id || booking?.raw?._id || booking?.raw?.id;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => (submitting ? null : onClose?.())}
      />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-4">
        <div className="w-full sm:max-w-lg rounded-3xl border border-charcoal/15 bg-white shadow-xl overflow-hidden">
          <div className="p-5 border-b border-charcoal/10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-ink truncate">
                Request a refund
              </div>
              <div className="text-xs text-slate truncate">
                {title} {bookingId ? `• ${String(bookingId).slice(-10)}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (submitting ? null : onClose?.())}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-charcoal/15 bg-white hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <label className="block text-xs font-medium text-slate">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Briefly explain the issue"
              className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand bg-white"
            />
            <div className="text-[11px] text-slate">
              Refunds are reviewed according to the host’s cancellation and refund policy.
            </div>
          </div>

          <div className="p-5 border-t border-charcoal/10 bg-white/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => (submitting ? null : onClose?.())}
              className="inline-flex items-center justify-center rounded-full border border-charcoal/20 bg-white px-5 py-2.5 text-sm hover:bg-slate-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSubmit?.({ bookingId, reason })}
              disabled={submitting || !bookingId}
              className="inline-flex items-center justify-center rounded-full bg-ink text-white px-5 py-2.5 text-sm hover:bg-ink/90 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSettings({ profile, setProfile, prefs, setPrefs }) {
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || "");
  const [frontDocFile, setFrontDocFile] = useState(null);
  const [backDocFile, setBackDocFile] = useState(null);
  const avatarInputRef = useRef(null);
  const frontDocInputRef = useRef(null);
  const backDocInputRef = useRef(null);

  const safeProfile = profile || { name: "", avatar: "", location: "", bio: "" };

  useEffect(() => {
    setAvatarPreview(profile?.avatar || "");
  }, [profile?.avatar]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...(prev || {}), [name]: value }));
  };

  const handlePrefsChange = (e) => {
    const { name, type, checked, value } = e.target;
    setPrefs((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleFrontDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontDocFile(file);
  };

  const handleBackDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackDocFile(file);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setMessage("");
      const formData = new FormData();
      formData.append("name", safeProfile.name || "");
      formData.append("location", safeProfile.location || "");
      formData.append("bio", safeProfile.bio || "");
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await api.put("/account/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data?.profile || res.data || null;
      if (updated) setProfile(updated);

      setMessage("Profile updated.");
      setAvatarFile(null);
    } catch (e) {
      setMessage("Unable to update profile right now.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = async () => {
    try {
      setSavingPrefs(true);
      setMessage("");
      const res = await api.put("/account/preferences", prefs);
      if (res.data?.preferences) setPrefs(res.data.preferences);
      setMessage("Preferences saved.");
    } catch (e) {
      setMessage("Unable to save preferences right now.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleUploadDocs = async () => {
    if (!frontDocFile && !backDocFile) {
      setMessage("Select at least one document to upload.");
      return;
    }
    try {
      setUploadingDocs(true);
      setMessage("");
      const formData = new FormData();
      if (frontDocFile) formData.append("front", frontDocFile);
      if (backDocFile) formData.append("back", backDocFile);

      const res = await api.post("/account/identity-docs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const documents = res.data?.documents;
      const identityStatus = res.data?.identityStatus;

      if (documents && identityStatus && setProfile) {
        setProfile((prev) =>
          prev ? { ...prev, identityStatus, identityDocuments: documents } : prev
        );
      }

      setMessage("Documents uploaded.");
      setFrontDocFile(null);
      setBackDocFile(null);
      if (frontDocInputRef.current) frontDocInputRef.current.value = "";
      if (backDocInputRef.current) backDocInputRef.current.value = "";
    } catch (e) {
      setMessage("Unable to upload documents right now.");
    } finally {
      setUploadingDocs(false);
    }
  };

  const settingsTabs = useMemo(
    () => [
      { id: "profile", label: "Profile", icon: User },
      { id: "identity", label: "Identity", icon: ShieldCheck },
      { id: "prefs", label: "Preferences", icon: SettingsIcon },
    ],
    []
  );

  const [tab, setTab] = useState("profile");
  useEffect(() => {
    setTab("profile");
  }, []);

  const ActionBar = ({ children }) => (
    <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 py-4 border-t border-charcoal/10 bg-white/90 backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Update your details, upload a photo, and manage booking preferences."
        right={message ? <Pill tone="neutral">{message}</Pill> : null}
      />

      <div className="rounded-3xl border border-charcoal/15 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-charcoal/10 bg-slate-50/70">
          <div className="px-4 sm:px-6 py-3">
            <div className="grid grid-cols-3 rounded-2xl border border-charcoal/10 bg-white p-1">
              {settingsTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    tab === id
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-8">
          {tab === "profile" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
                <div className="rounded-3xl border border-charcoal/10 bg-slate-50/60 p-5 h-fit">
                  <div className="text-sm font-semibold text-ink">Profile photo</div>
                  <p className="text-xs text-slate mt-1">
                    Shown to hosts when you request bookings.
                  </p>

                  <div className="mt-4 flex items-center gap-4">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-xs text-slate border border-charcoal/10">
                        No photo
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload new photo
                      </button>
                      <div className="text-[11px] text-slate">
                        JPG, PNG, or HEIC. Recommended 400×400+
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">
                        Full name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={safeProfile.name}
                        onChange={handleProfileChange}
                        className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={safeProfile.location}
                        onChange={handleProfileChange}
                        placeholder="City, Country"
                        className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={safeProfile.bio}
                      onChange={handleProfileChange}
                      rows={6}
                      className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    />
                  </div>
                </div>
              </div>

              <ActionBar>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center rounded-full bg-ink text-white px-5 py-2.5 text-sm hover:bg-ink/90 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>

                <div className="text-xs text-slate max-w-[520px]">
                  This info is shared with hosts when you send booking requests.
                </div>
              </ActionBar>
            </>
          )}

          {tab === "identity" && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-charcoal/10 bg-slate-50/60 p-5">
                    <div className="text-sm font-semibold text-ink">What to upload</div>
                    <p className="text-xs text-slate mt-1 leading-relaxed">
                      Upload clear front and back photos of a valid government ID. Files are stored securely and used only to verify your identity.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-charcoal/10 bg-white p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">
                        Front of ID
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => frontDocInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Choose file
                        </button>
                        <span className="text-xs text-slate truncate">
                          {frontDocFile ? frontDocFile.name : "No file selected"}
                        </span>
                      </div>
                      <input
                        ref={frontDocInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFrontDocChange}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">
                        Back of ID
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => backDocInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Choose file
                        </button>
                        <span className="text-xs text-slate truncate">
                          {backDocFile ? backDocFile.name : "No file selected"}
                        </span>
                      </div>
                      <input
                        ref={backDocInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleBackDocChange}
                      />
                    </div>
                  </div>
                </div>

                <IdentityCard profile={profile} />
              </div>

              <ActionBar>
                <button
                  type="button"
                  onClick={handleUploadDocs}
                  disabled={uploadingDocs}
                  className="inline-flex items-center justify-center rounded-full bg-ink text-white px-5 py-2.5 text-sm hover:bg-ink/90 disabled:opacity-60"
                >
                  {uploadingDocs ? "Uploading..." : "Upload documents"}
                </button>

                <div className="text-xs text-slate max-w-[520px]">
                  Your ID will be reviewed by FlexiDesk for verification.
                </div>
              </ActionBar>
            </>
          )}

          {tab === "prefs" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">
                    Preferred workspace type
                  </label>
                  <select
                    name="workspaceType"
                    value={prefs.workspaceType}
                    onChange={handlePrefsChange}
                    className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="any">No preference</option>
                    <option value="hot_desk">Hot desk</option>
                    <option value="dedicated_desk">Dedicated desk</option>
                    <option value="meeting_room">Meeting room</option>
                    <option value="private_office">Private office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate mb-1">
                    Seating preference
                  </label>
                  <select
                    name="seatingPreference"
                    value={prefs.seatingPreference}
                    onChange={handlePrefsChange}
                    className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="any">No preference</option>
                    <option value="near_window">Near window</option>
                    <option value="quiet_corner">Quiet area</option>
                    <option value="open_space">Open space</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate mb-1">
                    Preferred booking city
                  </label>
                  <input
                    type="text"
                    name="preferredCity"
                    value={prefs.preferredCity}
                    onChange={handlePrefsChange}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-slate-50/60 p-4">
                    <input
                      id="allowInstantBookings"
                      type="checkbox"
                      name="allowInstantBookings"
                      checked={prefs.allowInstantBookings}
                      onChange={handlePrefsChange}
                      className="mt-0.5 h-4 w-4 rounded border-charcoal/30"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Allow instant bookings
                      </span>
                      <span className="block text-xs text-slate mt-0.5">
                        If available, hosts can confirm your booking instantly.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-slate-50/60 p-4">
                    <input
                      id="receiveEmailUpdates"
                      type="checkbox"
                      name="receiveEmailUpdates"
                      checked={prefs.receiveEmailUpdates}
                      onChange={handlePrefsChange}
                      className="mt-0.5 h-4 w-4 rounded border-charcoal/30"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Email tips and recommendations
                      </span>
                      <span className="block text-xs text-slate mt-0.5">
                        Receive booking tips and workspace recommendations by email.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <ActionBar>
                <button
                  onClick={handleSavePrefs}
                  disabled={savingPrefs}
                  className="inline-flex items-center justify-center rounded-full bg-ink text-white px-5 py-2.5 text-sm hover:bg-ink/90 disabled:opacity-60"
                >
                  {savingPrefs ? "Saving..." : "Save preferences"}
                </button>

                <div className="text-xs text-slate max-w-[520px]">
                  These preferences help personalize search results and suggestions.
                </div>
              </ActionBar>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchRefundsBestEffort() {
  try {
    const res = await api.get("/refunds");
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.refunds || data?.items || [];
    return Array.isArray(list) ? list : [];
  } catch (e1) {
    try {
      const res = await api.get("/cases?kind=refund");
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.cases || data?.items || [];
      return Array.isArray(list) ? list : [];
    } catch (e2) {
      return [];
    }
  }
}

async function fetchBookingsBestEffort() {
  const candidates = [
    "/bookings?scope=me",
    "/bookings/mine",
    "/bookings",
    "/account/bookings",
  ];

  for (const path of candidates) {
    try {
      const res = await api.get(path);
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.bookings || data?.items || [];
      if (Array.isArray(list)) return list;
    } catch (e) {}
  }
  return [];
}

export default function ClientAccount() {
  const [active, setActive] = useState("about");
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);

  const headerBadgeTone =
    profile?.identityStatus === "verified"
      ? "success"
      : profile?.identityStatus === "pending"
      ? "warn"
      : profile?.identityStatus === "rejected"
      ? "danger"
      : "neutral";

  const reloadRefunds = async () => {
    const list = await fetchRefundsBestEffort();
    setRefunds(list);
  };

  useEffect(() => {
    let ignore = false;

    async function loadAccount() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/account");
        if (ignore) return;

        const data = res.data || {};
        setProfile(data.profile || null);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setTrips(Array.isArray(data.trips) ? data.trips : []);
        setPrefs(data.preferences || DEFAULT_PREFS);

        const [bk, rf] = await Promise.all([
          fetchBookingsBestEffort(),
          fetchRefundsBestEffort(),
        ]);

        if (ignore) return;
        setBookings(Array.isArray(bk) ? bk : []);
        setRefunds(Array.isArray(rf) ? rf : []);
      } catch (e) {
        if (!ignore) setError("Unable to load your account details right now.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAccount();
    return () => {
      ignore = true;
    };
  }, []);

  const handleRequestRefund = (tripItem) => {
    setRefundTarget(tripItem);
    setRefundModalOpen(true);
  };

  const submitRefund = async ({ bookingId, reason }) => {
    if (!bookingId) return;
    try {
      setRefundSubmitting(true);
      const payload = { bookingId, reason: String(reason || "").trim() };

      try {
        await api.post("/refunds", payload);
      } catch (e1) {
        await api.post("/cases", { ...payload, kind: "refund" });
      }

      setRefundModalOpen(false);
      setRefundTarget(null);
      await reloadRefunds();
      const bk = await fetchBookingsBestEffort();
      setBookings(Array.isArray(bk) ? bk : []);
    } catch (e) {
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="absolute inset-x-0 -top-14 h-80 bg-gradient-to-b from-brand/20 via-white/0 to-white/0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.05),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,204,0,0.12),transparent_40%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 backdrop-blur shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-slate uppercase">
                Account
              </div>

              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-ink truncate">
                  {profile?.name || "Your account"}
                </h1>
                <Pill tone={headerBadgeTone}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {profile?.identityStatus || "unverified"}
                </Pill>
              </div>

              <p className="text-sm text-slate mt-1">
                View your profile, trips, refunds, and manage how FlexiDesk works for you.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-charcoal/10 overflow-hidden flex items-center justify-center">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile?.name || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">
                  {profile?.name || "Client"}
                </div>
                <div className="text-xs text-slate truncate">
                  {profile?.location || "Add your city"}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 md:px-6 pb-5 md:pb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-charcoal/10 bg-slate-50/70 px-4 py-3 text-center">
                <div className="text-xl font-bold text-ink">{profile?.trips ?? 0}</div>
                <div className="text-[11px] text-slate mt-0.5">Trips</div>
              </div>

              <div className="rounded-2xl border border-charcoal/10 bg-slate-50/70 px-4 py-3 text-center">
                <div className="text-xl font-bold text-ink">{reviews.length}</div>
                <div className="text-[11px] text-slate mt-0.5">Reviews</div>
              </div>

              <div className="rounded-2xl border border-charcoal/10 bg-slate-50/70 px-4 py-3 text-center">
                <div className="text-xl font-bold text-ink">{refunds.length}</div>
                <div className="text-[11px] text-slate mt-0.5">Refunds</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <SidebarNav active={active} setActive={setActive} profile={profile} />

          <div className="min-w-0">
            {loading ? (
              <div className="rounded-3xl border border-charcoal/10 bg-white shadow-sm px-5 py-8 text-sm text-slate">
                Loading your account information
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : !profile && active !== "settings" ? (
              <div className="rounded-3xl border border-charcoal/10 bg-white shadow-sm px-5 py-8 text-sm text-slate">
                We could not find your account details.
              </div>
            ) : (
              <>
                {active === "about" && profile ? (
                  <AboutMe profile={profile} reviews={reviews} />
                ) : null}

                {active === "trips" ? (
                  <PastTrips
                    trips={trips}
                    bookings={bookings}
                    onRequestRefund={handleRequestRefund}
                  />
                ) : null}

                {active === "refunds" ? (
                  <Refunds
                    refunds={refunds}
                    onRefresh={reloadRefunds}
                    loading={loading}
                  />
                ) : null}

                {active === "settings" ? (
                  <AccountSettings
                    profile={profile}
                    setProfile={setProfile}
                    prefs={prefs}
                    setPrefs={setPrefs}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <RefundModal
        open={refundModalOpen}
        onClose={() => (refundSubmitting ? null : setRefundModalOpen(false))}
        booking={refundTarget}
        onSubmit={submitRefund}
        submitting={refundSubmitting}
      />
    </section>
  );
}