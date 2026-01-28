// src/components/CancelBookingModal.jsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Info } from "lucide-react";
import PolicyDisplay from "@/components/PolicyDisplay";
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

/**
 * CancelBookingModal Component
 * 
 * Modal for cancelling a booking with refund calculation preview
 * 
 * Requirements:
 * - 4.2: Display cancellation policy
 * - 5.5: Show refund calculation breakdown
 * - 11.1: Add cancellation reason selector
 * - 11.2: Add "other" reason text input
 * 
 * @param {Object} booking - Booking to cancel
 * @param {boolean} open - Whether modal is open
 * @param {Function} onClose - Close handler
 * @param {Function} onSuccess - Success callback after cancellation
 */
export default function CancelBookingModal({ booking, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Policy and refund calculation
  const [policy, setPolicy] = useState(null);
  const [refundCalculation, setRefundCalculation] = useState(null);
  
  // Cancellation reason
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");

  const bookingId = booking?._id || booking?.id;
  const listingId = booking?.listing?._id || booking?.listing?.id || booking?.listingId;

  // Fetch policy and calculate refund when modal opens
  useEffect(() => {
    if (!open || !bookingId || !listingId) {
      return;
    }

    const fetchPolicyAndCalculateRefund = async () => {
      setLoading(true);
      setError("");
      
      try {
        // Fetch cancellation policy
        const policyRes = await api.get(`/listings/${listingId}/cancellation-policy`);
        const fetchedPolicy = policyRes?.data?.policy || policyRes?.data;
        setPolicy(fetchedPolicy);

        // Calculate refund
        const refundRes = await api.post(`/bookings/${bookingId}/calculate-refund`);
        const calculation = refundRes?.data?.calculation || refundRes?.data;
        setRefundCalculation(calculation);
      } catch (err) {
        console.error("Error fetching policy/refund:", err);
        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load cancellation details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyAndCalculateRefund();
  }, [open, bookingId, listingId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setReason("");
      setReasonOther("");
      setError("");
      setPolicy(null);
      setRefundCalculation(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a cancellation reason");
      return;
    }

    if (reason === "other" && !reasonOther.trim()) {
      setError("Please provide details for 'Other' reason");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        reason,
        reasonOther: reason === "other" ? reasonOther : undefined,
      };

      await api.post(`/bookings/${bookingId}/cancel`, payload);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to cancel booking. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = reason && (reason !== "other" || reasonOther.trim()) && !submitting;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Review the cancellation policy and refund details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Booking Details */}
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

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading cancellation details...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* Policy Display */}
          {!loading && policy && (
            <div>
              <h4 className="text-sm font-semibold text-ink mb-3">Cancellation Policy</h4>
              <PolicyDisplay policy={policy} compact={false} />
            </div>
          )}

          {/* Refund Calculation Breakdown */}
          {!loading && refundCalculation && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Refund Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Original Amount:</span>
                  <span className="font-medium text-ink">
                    {peso(refundCalculation.originalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Refund Percentage:</span>
                  <span className="font-medium text-ink">
                    {refundCalculation.refundPercentage || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Refund Amount:</span>
                  <span className="font-medium text-ink">
                    {peso(refundCalculation.refundAmount || 0)}
                  </span>
                </div>
                {refundCalculation.processingFee > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Processing Fee:</span>
                    <span className="font-medium">
                      -{peso(refundCalculation.processingFee || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="font-semibold text-ink">Final Refund:</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    {peso(refundCalculation.finalRefund || 0)}
                  </span>
                </div>
              </div>

              {refundCalculation.hoursUntilBooking !== undefined && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <p>
                    Time until booking: {Math.floor(refundCalculation.hoursUntilBooking)} hours
                    ({Math.floor(refundCalculation.hoursUntilBooking / 24)} days)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Reason */}
          {!loading && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reason">Cancellation Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule_change">Schedule changed</SelectItem>
                    <SelectItem value="found_alternative">Found alternative</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reason === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="reasonOther">Please specify *</Label>
                  <Textarea
                    id="reasonOther"
                    rows={3}
                    value={reasonOther}
                    onChange={(e) => setReasonOther(e.target.value)}
                    placeholder="Please provide details about your cancellation reason..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          {!loading && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">This action cannot be undone</p>
                <p className="mt-1">
                  Once you confirm, your booking will be cancelled and a refund request will be
                  submitted based on the cancellation policy.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Go Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
