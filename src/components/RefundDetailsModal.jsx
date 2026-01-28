// src/components/RefundDetailsModal.jsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Info, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import api from "@/services/api";

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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const prettify = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  
  let icon = Clock;
  let classes = "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  
  if (s === "approved" || s === "refunded" || s === "completed") {
    icon = CheckCircle2;
    classes = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  } else if (s === "rejected" || s === "denied") {
    icon = XCircle;
    classes = "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  } else if (s === "processing" || s === "in_review") {
    icon = Clock;
    classes = "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }
  
  const Icon = icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${classes}`}>
      <Icon className="w-4 h-4" />
      {prettify(status)}
    </span>
  );
}

/**
 * RefundDetailsModal Component
 * 
 * Modal for viewing cancellation request and refund details
 * Shows refund amount, status, timeline, and breakdown
 * 
 * @param {Object} booking - Cancelled booking
 * @param {Object} refundCase - Refund case data (optional, will fetch if not provided)
 * @param {boolean} open - Whether modal is open
 * @param {Function} onClose - Close handler
 */
export default function RefundDetailsModal({ booking, refundCase: initialRefundCase, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refundCase, setRefundCase] = useState(initialRefundCase || null);
  const [cancellationRequest, setCancellationRequest] = useState(null);

  const bookingId = booking?._id || booking?.id;

  // Fetch cancellation request details when modal opens
  useEffect(() => {
    if (!open || !bookingId) {
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      
      try {
        // Fetch cancellation request details filtered by bookingId
        const res = await api.get(`/client/cancellations`, {
          params: { bookingId }
        });
        
        const requests = res?.data?.requests || res?.data?.data || res?.data || [];
        
        // Get the first (most recent) request for this booking
        const request = Array.isArray(requests) && requests.length > 0 ? requests[0] : null;
        
        if (request) {
          setCancellationRequest(request);
          
          // If refund case wasn't provided, try to get it from the request
          if (!initialRefundCase && request.refundCase) {
            setRefundCase(request.refundCase);
          }
        } else {
          setError("No cancellation request found for this booking. The cancellation may still be processing.");
        }
      } catch (err) {
        console.error("Error fetching cancellation details:", err);
        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load cancellation details. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, bookingId, initialRefundCase]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setError("");
      if (!initialRefundCase) {
        setRefundCase(null);
        setCancellationRequest(null);
      }
    }
  }, [open, initialRefundCase]);

  const request = cancellationRequest;
  const refund = request?.refundCalculation || {};

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Refund Details</DialogTitle>
          <DialogDescription>
            View your cancellation request and refund information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading refund details...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* Booking Details */}
          {!loading && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-ink mb-2">Booking Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Workspace:</span>
                  <span className="font-medium text-ink">
                    {booking?.listing?.title || booking?.title || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Check-in:</span>
                  <span className="font-medium text-ink">
                    {formatDate(booking?.startDate || booking?.from)}
                  </span>
                </div>
                {booking?.endDate || booking?.to ? (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Check-out:</span>
                    <span className="font-medium text-ink">
                      {formatDate(booking?.endDate || booking?.to)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-600">Booking Amount:</span>
                  <span className="font-semibold text-ink">{peso(booking?.amount || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Status */}
          {!loading && request && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink">Cancellation Status</h4>
                  {request._id && (
                    <p className="text-xs text-slate-600 mt-1">
                      Reference: <span className="font-mono">{String(request._id).slice(-8).toUpperCase()}</span>
                    </p>
                  )}
                </div>
                <StatusBadge status={request.status} />
              </div>

              {request.cancellationReason && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Cancellation Reason:</p>
                  <p className="text-sm text-ink font-medium">
                    {prettify(request.cancellationReason)}
                    {request.cancellationReasonOther && ` - ${request.cancellationReasonOther}`}
                  </p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-600">Requested:</p>
                  <p className="text-ink font-medium">{formatDate(request.createdAt)}</p>
                </div>
                {request.updatedAt && request.updatedAt !== request.createdAt && (
                  <div>
                    <p className="text-slate-600">Last Updated:</p>
                    <p className="text-ink font-medium">{formatDate(request.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refund Breakdown */}
          {!loading && refund && Object.keys(refund).length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Refund Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Original Amount:</span>
                  <span className="font-medium text-ink">
                    {peso(refund.originalAmount || booking?.amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Refund Percentage:</span>
                  <span className="font-medium text-ink">
                    {refund.refundPercentage || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Refund Amount:</span>
                  <span className="font-medium text-ink">
                    {peso(refund.refundAmount || 0)}
                  </span>
                </div>
                {refund.processingFee > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Processing Fee:</span>
                    <span className="font-medium">
                      -{peso(refund.processingFee || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="font-semibold text-ink">Final Refund:</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    {peso(refund.finalRefund || 0)}
                  </span>
                </div>
              </div>

              {refund.hoursUntilBooking !== undefined && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <p>
                    Cancelled {Math.floor(refund.hoursUntilBooking)} hours before booking
                    ({Math.floor(refund.hoursUntilBooking / 24)} days)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status-specific messages */}
          {!loading && request && (
            <>
              {request.status === "pending" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Refund request is being processed</p>
                    <p className="mt-1">
                      Your cancellation request has been submitted. The refund will be processed
                      according to the cancellation policy. You'll receive an email notification
                      once it's approved.
                    </p>
                  </div>
                </div>
              )}

              {request.status === "approved" && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-800">
                    <p className="font-medium">Refund approved</p>
                    <p className="mt-1">
                      Your refund has been approved and will be processed to your original payment
                      method within 5-10 business days.
                    </p>
                  </div>
                </div>
              )}

              {request.status === "rejected" && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-rose-800">
                    <p className="font-medium">Refund request rejected</p>
                    <p className="mt-1">
                      Your refund request was not approved. Please contact support if you have
                      questions about this decision.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
