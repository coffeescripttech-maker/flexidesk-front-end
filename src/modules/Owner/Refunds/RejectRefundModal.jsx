// src/modules/Owner/Refunds/RejectRefundModal.jsx
import { useState } from "react";
import { X, XCircle, AlertTriangle } from "lucide-react";
import api from "@/services/api";

export default function RejectRefundModal({ request, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const {
    clientName,
    client,
    listingTitle,
    listing,
    bookingAmount,
    refundCalculation,
  } = request;

  const guestName = clientName || client?.fullName || client?.name || "Guest";
  const workspaceName = listingTitle || listing?.shortDesc || listing?.title || "Workspace";
  const originalAmount = bookingAmount || refundCalculation?.originalAmount || 0;
  const calculatedRefund = refundCalculation?.finalRefund || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rejectionReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setLoading(true);

    try {
      await api.post(`/owner/refunds/${request.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to reject refund";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-semibold text-ink">Reject Refund Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-700">Request Summary</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Client</span>
                <span className="font-medium">{guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Workspace</span>
                <span className="font-medium">{workspaceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Original Amount</span>
                <span className="font-medium">PHP {fmtMoney(originalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Requested Refund</span>
                <span className="font-medium text-rose-600">PHP {fmtMoney(calculatedRefund)}</span>
              </div>
            </div>
          </div>

          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why you're rejecting this refund request..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              disabled={loading}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              This reason will be shared with the client. Please be clear and professional.
            </p>
          </div>

          {/* Impact Warning */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Impact to Client</p>
                <ul className="mt-2 space-y-1 text-amber-700 list-disc list-inside">
                  <li>Client will not receive a refund</li>
                  <li>Booking will remain active or be marked as cancelled without refund</li>
                  <li>Client will be notified of your decision and reason</li>
                  <li>This may affect your ratings and reviews</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
              <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800">
                <p className="font-medium">This action cannot be undone</p>
                <p className="mt-1 text-rose-700">
                  Once rejected, the client will need to contact support to dispute this decision.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Reject Refund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
