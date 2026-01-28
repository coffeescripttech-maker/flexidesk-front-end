import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  CalendarDays,
  MapPin,
  Users,
  Loader2,
  XCircle,
  Download,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import CancelBookingModal from "@/components/CancelBookingModal";
import RefundDetailsModal from "@/components/RefundDetailsModal";
import ReviewModal from "@/components/ReviewModal";

const peso = (n) =>
  Number(n || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatRange = (start, end) => {
  if (!start && !end) return "—";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} → ${formatDate(end)}`;
};

const isUpcoming = (startDate) => {
  const now = new Date();
  return new Date(startDate) >= now;
};

const isQrAvailable = (startDate) => {
  if (!startDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startDate);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffMs = startDay.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 1 && diffDays >= 0;
};

const prettify = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

function caseBadgeClasses(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "refunded" || s === "resolved")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "rejected" || s === "denied")
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (s === "processing" || s === "in_review" || s === "in progress")
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function SectionShell({ title, subtitle, children, right }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 ring-1 ring-slate-200 px-3 py-2 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-slate font-semibold">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function EmptyState({ onExplore }) {
  return (
    <div className="rounded-2xl bg-white/85 ring-1 ring-slate-200 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-ink">No bookings yet</div>
          <p className="mt-1 text-sm text-slate max-w-xl">
            Once you reserve a workspace, your upcoming and past bookings will show up here
            along with QR access, payments, and reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="inline-flex items-center rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
          >
            Explore spaces
          </Link>
          {onExplore ? (
            <Button variant="outline" className="rounded-xl" onClick={onExplore}>
              Refresh
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ item, onCancel, onReview, onPay, onViewRefund, isPast }) {
  const id = item?._id || item?.id;
  const listing = item?.listing || {};
  const title = listing?.venue || listing?.title || item?.title || "Workspace";
  
  // Get image with proper fallback
  let img = null;
  if (listing?.cover) {
    img = listing.cover;
  } else if (listing?.images && Array.isArray(listing.images) && listing.images.length > 0) {
    img = listing.images[0];
  } else {
    img = "/images/hero.jpg"; // Fallback to placeholder
  }
  
  const status = item?.status || "confirmed";
  const start = item?.startDate || item?.from;
  const end = item?.endDate || item?.to;

  const isPendingPayment = status === "pending_payment" || status === "awaiting_payment";
  
  // Check if there's already a cancellation request
  const hasCancellationRequest = item?.hasCancellationRequest || false;
  const cancellationRequest = item?.cancellationRequest || null;

  const qrAvailable =
    !isPast && status !== "cancelled" && !isPendingPayment && isQrAvailable(start);

  const reviewed = Boolean(item?.hasReview || item?.reviewed || item?.reviewId);

  // Determine if booking is eligible for review
  // Can review if: (status is "completed") OR (booking is past AND status is "paid")
  const isCompleted = status === "completed";
  const isPaid = status === "paid";
  const canReview = (isCompleted || (isPast && isPaid)) && status !== "cancelled" && !isPendingPayment;

  const refundCase = item?.refundCase || null;

  const handleDownloadQr = async () => {
    if (!id || !start) return;
    try {
      const payload = {
        type: "booking-access",
        bookingId: id,
        listingId: listing?._id || listing?.id,
        title,
        startDate: start,
        endDate: end,
      };

      const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 512,
        margin: 1,
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `booking-${id}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Failed to generate QR code.");
    }
  };

  const statusLabel = prettify(status);

  let statusClasses = "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (status === "cancelled") statusClasses = "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  else if (status === "completed" || status === "paid")
    statusClasses = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  else if (isPendingPayment)
    statusClasses = "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

  const locationLabel = listing?.venue || listing?.city || "—";

  return (
    <div className="group overflow-hidden rounded-2xl bg-white/90 ring-1 ring-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[16/10] bg-slate-100">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(e) => {
            // If image fails to load, use placeholder
            if (e.target.src !== "/images/hero.jpg") {
              e.target.src = "/images/hero.jpg";
            }
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 via-black/0 to-transparent pointer-events-none" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClasses}`}>
            {statusLabel}
          </span>

          {reviewed && status !== "cancelled" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Reviewed
            </span>
          ) : null}
        </div>

        {status === "cancelled" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85">
            <div className="text-rose-700 font-semibold">Cancelled</div>
            {refundCase ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-slate-200 bg-white">
                <span className="text-slate">Refund request:</span>
                <span className={`px-2 py-0.5 rounded-full ${caseBadgeClasses(refundCase?.status)}`}>
                  {prettify(refundCase?.status || "open")}
                </span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate">No refund request found.</div>
            )}
          </div>
        ) : null}
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold text-ink">{title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{locationLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>{formatRange(start, end)}</span>
              </span>

              {item?.guests ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{item.guests} guest(s)</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate">Total</div>
            <div className="text-base font-semibold text-ink">{peso(item?.amount || 0)}</div>
          </div>
        </div>

        {status === "cancelled" && refundCase ? (
          <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-xs text-ink/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">Refund request</span>
              {refundCase?.referenceCode ? (
                <span className="font-mono text-ink/70">{refundCase.referenceCode}</span>
              ) : null}
              <span className={`px-2 py-0.5 rounded-full ${caseBadgeClasses(refundCase?.status)}`}>
                {prettify(refundCase?.status || "open")}
              </span>
              {typeof refundCase?.amountRequested !== "undefined" ? (
                <span className="text-slate">• {peso(refundCase.amountRequested)}</span>
              ) : null}
            </div>
            {refundCase?.summary ? (
              <div className="mt-1 text-slate line-clamp-2">{refundCase.summary}</div>
            ) : null}
            {onViewRefund ? (
              <button
                onClick={() => onViewRefund(item)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <FileText className="h-3 w-3" />
                View full details
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate">
            Booking ID:{" "}
            <span className="font-mono text-ink/90">{String(id || "—").slice(0, 10)}…</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {status === "cancelled" && onViewRefund ? (
              <button
                onClick={() => onViewRefund(item)}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <FileText className="h-4 w-4" />
                View Refund
              </button>
            ) : (
              <Link
                to={listing?._id ? `/app/spaces/${listing._id}` : "#"}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
              >
                View
              </Link>
            )}

            {!isPast && status !== "cancelled" && isPendingPayment && onPay ? (
              <button
                onClick={() => onPay(item)}
                className="inline-flex items-center gap-1 rounded-xl bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/90"
              >
                <CreditCard className="h-4 w-4" />
                Pay now
              </button>
            ) : null}

            {!isPast && status !== "cancelled" && !isPendingPayment && !hasCancellationRequest ? (
              <button
                onClick={() => onCancel?.(item)}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
            
            {!isPast && status !== "cancelled" && hasCancellationRequest && cancellationRequest ? (
              <div className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Cancellation {prettify(cancellationRequest.status)}
              </div>
            ) : null}

            {qrAvailable ? (
              <button
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                QR Code
              </button>
            ) : null}

            {canReview && onReview && !reviewed ? (
              <button
                onClick={() => onReview(item, id)}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
                disabled={!id}
                title={!id ? "Missing booking id" : ""}
              >
                Review
              </button>
            ) : null}
          </div>
        </div>

        {qrAvailable ? (
          <div className="mt-3 rounded-xl bg-emerald-50/70 ring-1 ring-emerald-200 px-3 py-2 text-xs text-emerald-800">
            QR access is available starting today (up to 1 day before check-in).
          </div>
        ) : null}

        {!isPast && isPendingPayment ? (
          <div className="mt-3 rounded-xl bg-amber-50/70 ring-1 ring-amber-200 px-3 py-2 text-xs text-amber-800">
            Payment required to confirm your booking. Tap “Pay now” to continue.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SegmentedTabs({ value, onChange, items = [] }) {
  return (
    <div className="inline-flex rounded-2xl bg-white/80 ring-1 ring-slate-200 p-1 shadow-sm">
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-3 py-1.5 text-sm rounded-2xl transition ${
              active ? "bg-ink text-white" : "text-ink hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

async function fetchRefundCasesByBookingIds(bookingIds) {
  const ids = (bookingIds || []).filter(Boolean).map(String);
  if (!ids.length) return new Map();

  const endpoints = [
    { url: "/cases/by-bookings", params: { bookingIds: ids.join(","), type: "refund_request" } },
    { url: "/cases/bookings", params: { bookingIds: ids.join(","), type: "refund_request" } },
    { url: "/cases", params: { bookingIds: ids.join(","), type: "refund_request" } },
    { url: "/cases", params: { bookingIds: ids.join(",") } },
  ];

  let res = null;
  for (const ep of endpoints) {
    try {
      res = await api.get(ep.url, { params: ep.params });
      if (res?.data) break;
    } catch {}
  }

  const data = res?.data;
  let rows = [];
  if (Array.isArray(data?.items)) rows = data.items;
  else if (Array.isArray(data?.data)) rows = data.data;
  else if (Array.isArray(data)) rows = data;
  else if (Array.isArray(data?.cases)) rows = data.cases;

  const m = new Map();

  for (const c of rows || []) {
    const bid = String(c?.bookingId || c?.bookingRef || c?.booking || c?.booking_id || "");
    const t = String(c?.type || "");
    if (!bid) continue;
    if (t && t !== "refund_request") continue;

    const current = m.get(bid);
    const pick = {
      _id: c?._id || c?.id,
      referenceCode: c?.referenceCode,
      status: c?.status || "open",
      priority: c?.priority,
      amountRequested: c?.amountRequested,
      summary: c?.summary,
      createdAt: c?.createdAt,
      updatedAt: c?.updatedAt,
    };

    if (!current) {
      m.set(bid, pick);
      continue;
    }

    const prevTime = new Date(current?.updatedAt || current?.createdAt || 0).getTime();
    const nextTime = new Date(pick?.updatedAt || pick?.createdAt || 0).getTime();
    if (nextTime >= prevTime) m.set(bid, pick);
  }

  return m;
}

export default function ClientBookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewTarget, setReviewTarget] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastVariant, setToastVariant] = useState("success");
  const [toastTitle, setToastTitle] = useState("");
  const [toastDesc, setToastDesc] = useState("");

  const [tab, setTab] = useState("upcoming");

  const navigate = useNavigate();

  const normalize = (data) => {
    if (!data) return [];
    if (Array.isArray(data?.items)) return data.items.map((x) => x.booking || x);
    if (Array.isArray(data?.data)) return data.data.map((x) => x.booking || x);
    if (Array.isArray(data)) return data.map((x) => x.booking || x);
    return [];
  };

  const showToast = (variant, title, desc) => {
    setToastVariant(variant);
    setToastTitle(title || "");
    setToastDesc(desc || "");
    setToastOpen(true);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      try {
        res = await api.get("/bookings/me");
      } catch {}
      if (!res) {
        try {
          res = await api.get("/users/me/bookings");
        } catch {}
      }
      if (!res) {
        res = await api.get("/bookings");
      }
      if (!res?.data) throw new Error("Unable to load bookings.");

      const base = normalize(res.data);

      const ids = base
        .map((b) => b?._id || b?.id)
        .filter(Boolean)
        .map(String);

      let reviewedSet = new Set();
      if (ids.length) {
        try {
          const r = await api.get("/reviews/my-reviewed-bookings", {
            params: { bookingIds: ids.join(",") },
          });
          const reviewedIds = (r?.data?.bookingIds || []).map(String);
          reviewedSet = new Set(reviewedIds);
        } catch {}
      }

      const merged = base.map((b) => {
        const bid = String(b?._id || b?.id || "");
        const hasReview = Boolean(b?.hasReview || b?.reviewed) || reviewedSet.has(bid);
        const reviewId = b?.reviewId || (reviewedSet.has(bid) ? "existing" : null);
        return { ...b, hasReview, reviewed: hasReview, reviewId };
      });

      const cancelledIds = merged
        .filter((b) => String(b?.status || "").toLowerCase() === "cancelled")
        .map((b) => String(b?._id || b?.id || ""))
        .filter(Boolean);

      let casesMap = new Map();
      if (cancelledIds.length) {
        try {
          casesMap = await fetchRefundCasesByBookingIds(cancelledIds);
        } catch {
          casesMap = new Map();
        }
      }

      const withCases = merged.map((b) => {
        const bid = String(b?._id || b?.id || "");
        const refundCase = casesMap.get(bid) || null;
        return { ...b, refundCase };
      });

      setItems(withCases);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load bookings.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openCancel = (booking) => {
    setCancelTarget(booking);
  };

  const closeCancel = () => {
    setCancelTarget(null);
  };

  const openRefundDetails = (booking) => {
    setRefundTarget(booking);
  };

  const closeRefundDetails = () => {
    setRefundTarget(null);
  };

  const handleCancelSuccess = async () => {
    showToast(
      "success",
      "Booking cancelled",
      "Your cancellation request has been submitted. You'll be notified about the refund status."
    );
    await load();
  };

  const handlePay = (booking) => {
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) {
      showToast("error", "Missing booking ID", "Cannot proceed to payment.");
      return;
    }
    navigate(`/app/bookings/${bookingId}/summary`);
  };

  const openReview = (booking, bookingId) => {
    const id = bookingId || booking?._id || booking?.id;
    if (!id) {
      showToast("error", "Missing booking ID", "Cannot open review form.");
      return;
    }
    setReviewTarget({ ...booking, __bookingId: id });
  };

  const closeReview = () => {
    setReviewTarget(null);
    setSubmittingReview(false);
  };

  const submitReview = async (reviewData) => {
    if (!reviewTarget) return;

    const bookingId = reviewTarget.__bookingId || reviewTarget._id || reviewTarget.id;

    if (!bookingId) {
      showToast("error", "Missing booking ID", "Cannot submit review.");
      return;
    }

    try {
      setSubmittingReview(true);

      // Create FormData for photo uploads
      const formData = new FormData();
      formData.append("rating", reviewData.rating);
      formData.append("comment", reviewData.comment || "");

      // Append photos if any
      if (reviewData.photos && reviewData.photos.length > 0) {
        reviewData.photos.forEach((photo) => {
          formData.append("photos", photo);
        });
      }

      const r = await api.post(`/reviews/booking/${bookingId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newReviewId = r?.data?.id || r?.data?._id || "new";

      setItems((prev) =>
        prev.map((x) => {
          const bid = String(x._id || x.id || "");
          if (bid !== String(bookingId)) return x;
          return { ...x, hasReview: true, reviewed: true, reviewId: newReviewId };
        })
      );

      closeReview();
      showToast(
        "success",
        "Review submitted",
        "Thanks for sharing your feedback. Your review is now visible on the listing."
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit review.";

      showToast("error", "Review failed", msg);
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upcoming = useMemo(() => items.filter((x) => isUpcoming(x.startDate || x.from)), [items]);
  const past = useMemo(() => items.filter((x) => !isUpcoming(x.startDate || x.from)), [items]);

  useEffect(() => {
    if (tab === "upcoming" && !upcoming.length && past.length) setTab("past");
    if (tab === "past" && !past.length && upcoming.length) setTab("upcoming");
  }, [tab, upcoming.length, past.length]);

  const visible = tab === "upcoming" ? upcoming : past;

  const totalSpent = useMemo(() => {
    const paid = items.filter((x) => {
      const s = String(x.status || "");
      return s === "paid" || s === "completed" || s === "confirmed";
    });
    return paid.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }, [items]);

  const ToastIcon = toastVariant === "success" ? CheckCircle2 : AlertTriangle;

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "upcoming", label: `Upcoming (${upcoming.length})` },
          { value: "past", label: `Past (${past.length})` },
        ]}
      />
      <button
        onClick={load}
        className="inline-flex items-center gap-2 rounded-2xl bg-white/80 ring-1 ring-slate-200 px-3 py-2 text-sm hover:bg-white shadow-sm"
      >
        <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
          <SectionShell
            title="My Bookings"
            subtitle="Manage your upcoming stays, payments, QR access, and leave reviews after your visit."
            right={headerRight}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatPill label="Upcoming" value={upcoming.length} />
              <StatPill label="Past" value={past.length} />
              <StatPill label="Total spent" value={peso(totalSpent)} />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white/85 ring-1 ring-slate-200 p-6 shadow-sm inline-flex items-center gap-2 text-slate">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                {error}
              </div>
            ) : !items.length ? (
              <EmptyState onExplore={load} />
            ) : visible.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((b) => (
                  <BookingCard
                    key={b._id || b.id}
                    item={b}
                    onCancel={!isUpcoming(b.startDate || b.from) ? undefined : openCancel}
                    onPay={handlePay}
                    onViewRefund={openRefundDetails}
                    isPast={!isUpcoming(b.startDate || b.from)}
                    onReview={openReview}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/85 ring-1 ring-slate-200 p-6 shadow-sm text-sm text-slate">
                No {tab} bookings right now.
              </div>
            )}
          </SectionShell>
        </div>
      </div>

      <ReviewModal
        open={!!reviewTarget}
        onClose={closeReview}
        booking={reviewTarget}
        onSubmit={submitReview}
        submitting={submittingReview}
      />

      <CancelBookingModal
        booking={cancelTarget}
        open={!!cancelTarget}
        onClose={closeCancel}
        onSuccess={handleCancelSuccess}
      />

      <RefundDetailsModal
        booking={refundTarget}
        refundCase={refundTarget?.refundCase}
        open={!!refundTarget}
        onClose={closeRefundDetails}
      />

      <Dialog open={toastOpen} onOpenChange={setToastOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ToastIcon className="h-5 w-5" />
              {toastTitle}
            </DialogTitle>
            {toastDesc ? <DialogDescription className="pt-1">{toastDesc}</DialogDescription> : null}
          </DialogHeader>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setToastOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
