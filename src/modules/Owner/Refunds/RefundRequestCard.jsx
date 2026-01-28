// src/modules/Owner/Refunds/RefundRequestCard.jsx
import {
  User,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export default function RefundRequestCard({ request, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);

  const {
    clientName,
    client,
    listingTitle,
    listing,
    bookingCode,
    booking,
    bookingStartDate,
    bookingAmount,
    refundCalculation,
    cancellationReason,
    cancellationReasonOther,
    status,
    requestedAt,
    isAutomatic,
  } = request;

  const guestName = clientName || client?.fullName || client?.name || "Guest";
  const workspaceName = listingTitle || listing?.shortDesc || listing?.title || "Workspace";
  const code = bookingCode || booking?.code || booking?.shortId || "—";
  const location = listing?.city && listing?.region
    ? `${listing.city}, ${listing.region}`
    : listing?.city || listing?.region || "—";

  const originalAmount = bookingAmount || refundCalculation?.originalAmount || 0;
  const refundPercentage = refundCalculation?.refundPercentage || 0;
  const refundAmount = refundCalculation?.refundAmount || 0;
  const processingFee = refundCalculation?.processingFee || 0;
  const finalRefund = refundCalculation?.finalRefund || 0;

  const reasonMap = {
    schedule_change: "Schedule changed",
    found_alternative: "Found alternative",
    emergency: "Emergency",
    other: cancellationReasonOther || "Other reason",
  };
  const reasonText = reasonMap[cancellationReason] || cancellationReason || "Not specified";

  const isPending = status === "pending";
  const isApproved = ["approved", "processing", "completed"].includes(status);
  const isRejected = status === "rejected";

  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Client & Listing */}
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-slate-600 flex-shrink-0" />
            <span className="font-semibold text-ink truncate">{guestName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 truncate">{workspaceName}</span>
          </div>

          {/* Location & Date */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(bookingStartDate)}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Booking #{code}</span>
          </div>

          {/* Refund Amount */}
          <div className="mt-3 flex items-baseline gap-2">
            <DollarSign className="h-4 w-4 text-slate-600" />
            <span className="text-2xl font-bold text-ink">PHP {fmtMoney(finalRefund)}</span>
            <span className="text-sm text-slate-500">({refundPercentage}% refund)</span>
          </div>

          {/* Automatic Badge */}
          {isAutomatic && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-200">
              <CheckCircle className="h-3 w-3" />
              Automatic Refund
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col items-end gap-2">
          <StatusPill status={status} />
          
          {isPending && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onApprove(request)}
                className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 inline-flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => onReject(request)}
                className="rounded-md border border-rose-300 text-rose-700 px-3 py-1.5 text-sm hover:bg-rose-50 inline-flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-slate-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50"
        >
          <span>View refund breakdown</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Refund Calculation Breakdown */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Refund Calculation
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Original Amount</span>
                <span className="font-medium">PHP {fmtMoney(originalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Refund Percentage</span>
                <span className="font-medium">{refundPercentage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Refund Amount</span>
                <span className="font-medium">PHP {fmtMoney(refundAmount)}</span>
              </div>
              {processingFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Processing Fee</span>
                  <span className="font-medium text-rose-600">-PHP {fmtMoney(processingFee)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold">
                <span className="text-ink">Final Refund</span>
                <span className="text-ink">PHP {fmtMoney(finalRefund)}</span>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Cancellation Reason
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{reasonText}</span>
              </div>
            </div>

            {/* Request Details */}
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Request Details
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Requested</span>
                  <span>{fmtDateTime(requestedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours until booking</span>
                  <span>{refundCalculation?.hoursUntilBooking?.toFixed(1) || "—"} hours</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const norm = (status || "").toLowerCase();
  const map = {
    pending: ["Pending", "bg-amber-100 text-amber-800 ring-amber-200", Clock],
    approved: ["Approved", "bg-emerald-100 text-emerald-800 ring-emerald-200", CheckCircle],
    processing: ["Processing", "bg-blue-100 text-blue-800 ring-blue-200", Clock],
    completed: ["Completed", "bg-emerald-100 text-emerald-800 ring-emerald-200", CheckCircle],
    rejected: ["Rejected", "bg-rose-100 text-rose-800 ring-rose-200", XCircle],
    failed: ["Failed", "bg-rose-100 text-rose-800 ring-rose-200", AlertCircle],
  };
  const [text, tone, Icon] = map[norm] || [status || "Unknown", "bg-slate-100 text-slate-700 ring-slate-200", Clock];
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 ${tone}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {text}
    </span>
  );
}

function fmtMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
