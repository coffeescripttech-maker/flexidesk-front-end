// src/components/PolicyDisplay.jsx
import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle } from "lucide-react";

/**
 * PolicyDisplay Component
 * 
 * Displays cancellation policy information to clients
 * Shows policy type badge, refund schedule, key points, and expandable details
 * 
 * @param {Object} policy - Cancellation policy object
 * @param {boolean} compact - Whether to show compact version (for booking flow)
 */
export default function PolicyDisplay({ policy, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!policy || !policy.allowCancellation) {
    return (
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-slate-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">No cancellation policy set</span>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          This workspace does not have a cancellation policy. Contact the host for details.
        </p>
      </div>
    );
  }

  const policyType = policy.type || "custom";
  const tiers = Array.isArray(policy.tiers) ? policy.tiers : [];
  const processingFee = policy.processingFeePercentage || 0;
  const automaticRefund = policy.automaticRefund || false;

  // Get policy badge color and label
  const getPolicyBadge = () => {
    switch (policyType) {
      case "flexible":
        return {
          label: "Flexible",
          color: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: "✓",
        };
      case "moderate":
        return {
          label: "Moderate",
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: "◐",
        };
      case "strict":
        return {
          label: "Strict",
          color: "bg-amber-100 text-amber-800 border-amber-300",
          icon: "⚠",
        };
      default:
        return {
          label: "Custom",
          color: "bg-slate-100 text-slate-800 border-slate-300",
          icon: "⚙",
        };
    }
  };

  const badge = getPolicyBadge();

  // Format hours to human-readable
  const formatHours = (hours) => {
    if (hours >= 168) {
      const weeks = Math.floor(hours / 168);
      return `${weeks} week${weeks > 1 ? "s" : ""}`;
    }
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  // Get key policy points for quick view
  const getKeyPoints = () => {
    const points = [];
    
    // Sort tiers by hours descending
    const sortedTiers = [...tiers].sort((a, b) => b.hoursBeforeBooking - a.hoursBeforeBooking);
    
    sortedTiers.forEach((tier) => {
      const timeLabel = formatHours(tier.hoursBeforeBooking);
      const refundLabel = tier.refundPercentage === 100 ? "Full refund" : 
                         tier.refundPercentage === 0 ? "No refund" :
                         `${tier.refundPercentage}% refund`;
      
      points.push({
        time: timeLabel,
        refund: tier.refundPercentage,
        label: refundLabel,
        description: tier.description || refundLabel,
      });
    });

    return points;
  };

  const keyPoints = getKeyPoints();

  if (compact) {
    return (
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Cancellation Policy</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
        </div>
        <div className="space-y-1">
          {keyPoints.slice(0, 2).map((point, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              {point.refund > 0 ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="text-slate-700">
                Cancel {point.time}+ before: <span className="font-medium">{point.label}</span>
              </span>
            </div>
          ))}
          {processingFee > 0 && (
            <div className="text-xs text-slate-600 mt-1">
              Processing fee: {processingFee}%
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4 md:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-ink">Cancellation Policy</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Refund Schedule */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-slate-700">Refund Schedule</h4>
        <div className="space-y-2">
          {keyPoints.map((point, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                point.refund > 0
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {point.refund > 0 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink">
                    Cancel {point.time}+ before booking
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      point.refund === 100
                        ? "bg-emerald-100 text-emerald-800"
                        : point.refund > 0
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {point.label}
                  </span>
                </div>
                {point.description && point.description !== point.label && (
                  <p className="text-xs text-slate-600 mt-1">{point.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Policy Points */}
      <div className="rounded-lg bg-slate-50 p-3 space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Important Details
        </h4>
        <ul className="space-y-1.5 text-sm text-slate-700">
          {processingFee > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>A {processingFee}% processing fee will be deducted from your refund</span>
            </li>
          )}
          {automaticRefund && (
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span>Eligible refunds are processed automatically</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>Refunds are calculated based on the time of cancellation request</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>Refunds are returned to your original payment method within 5-10 business days</span>
          </li>
        </ul>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-ink transition"
      >
        <span>{expanded ? "Hide" : "View"} Full Policy Details</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-ink mb-2">How Cancellations Work</h4>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="font-medium text-slate-900">1.</span>
                <span>
                  Request cancellation from your bookings page before your booking starts
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-slate-900">2.</span>
                <span>
                  Your refund amount is calculated based on how far in advance you cancel
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-slate-900">3.</span>
                <span>
                  {automaticRefund
                    ? "Eligible refunds are processed automatically, others require host approval"
                    : "The host will review and approve your refund request"}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-slate-900">4.</span>
                <span>
                  Once approved, the refund is processed and returned to your payment method
                </span>
              </li>
            </ol>
          </div>

          {policy.customNotes && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Additional Notes</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{policy.customNotes}</p>
            </div>
          )}

          <div className="text-xs text-slate-600">
            <p>
              <strong>Note:</strong> Cancellations must be requested before your booking start time.
              Once your booking has started, cancellations may not be eligible for refunds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
