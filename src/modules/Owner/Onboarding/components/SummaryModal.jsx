// components/SummaryModal.jsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Shield, ChevronDown, ChevronUp } from "lucide-react";
import SummaryCard from "./SummaryCard";

const POLICY_TEMPLATES = {
  flexible: {
    type: 'flexible',
    label: 'Flexible',
    description: 'Full refund if cancelled 24+ hours before',
    allowCancellation: true,
    automaticRefund: true,
    tiers: [
      { hoursBeforeBooking: 24, refundPercentage: 100, description: 'Full refund' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund' }
    ],
    processingFeePercentage: 0,
    customNotes: ''
  },
  moderate: {
    type: 'moderate',
    label: 'Moderate',
    description: 'Balanced protection for both parties',
    allowCancellation: true,
    automaticRefund: true,
    tiers: [
      { hoursBeforeBooking: 168, refundPercentage: 100, description: 'Full refund (7+ days)' },
      { hoursBeforeBooking: 48, refundPercentage: 50, description: '50% refund (2-7 days)' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund (<2 days)' }
    ],
    processingFeePercentage: 5,
    customNotes: ''
  },
  strict: {
    type: 'strict',
    label: 'Strict',
    description: 'Maximum revenue protection',
    allowCancellation: true,
    automaticRefund: false,
    tiers: [
      { hoursBeforeBooking: 336, refundPercentage: 50, description: '50% refund (14+ days)' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund (<14 days)' }
    ],
    processingFeePercentage: 10,
    customNotes: ''
  }
};

export default function SummaryModal({ open, onClose, onConfirm, draft, step, cancellationPolicy, onPolicyChange }) {
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);
  
  // lock background scroll while modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const handlePolicyTypeChange = (type) => {
    if (POLICY_TEMPLATES[type]) {
      onPolicyChange(POLICY_TEMPLATES[type]);
    }
  };

  const currentPolicyType = cancellationPolicy?.type || 'moderate';
  const currentTemplate = POLICY_TEMPLATES[currentPolicyType];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          {/* Centering layer with page-level scroll fallback */}
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overscroll-contain">
            {/* Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-title"
              className="
                w-full
                max-w-4xl          /* wider modal */
                md:max-w-5xl       /* even wider on md+ */
                bg-white rounded-2xl ring-1 ring-slate-200 shadow-xl
                flex flex-col overflow-hidden
                max-h-[88dvh]      /* cap height to viewport */
              "
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              {/* Sticky header (remains visible while content scrolls) */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-white sticky top-0 z-10">
                <h2 id="review-title" className="text-lg font-semibold">
                  Review your listing
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-5">
                <SummaryCard draft={draft} step={step} />
                
                {/* Cancellation Policy Section */}
                <div className="rounded-xl ring-1 ring-slate-200 p-4 bg-gradient-to-br from-blue-50/50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-ink">Cancellation Policy</h3>
                    <span className="text-xs text-slate-600">(You can change this later)</span>
                  </div>
                  
                  <p className="text-xs text-slate-700 mb-3">
                    Choose how you want to handle cancellations. This helps protect your revenue while being fair to clients.
                  </p>

                  {/* Policy Type Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    {Object.entries(POLICY_TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePolicyTypeChange(key)}
                        className={`p-3 rounded-lg border-2 text-left transition ${
                          currentPolicyType === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-ink">{template.label}</span>
                          {currentPolicyType === key && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{template.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Policy Details Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPolicyDetails(!showPolicyDetails)}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition"
                  >
                    <span>{showPolicyDetails ? 'Hide' : 'Show'} refund schedule</span>
                    {showPolicyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Policy Details */}
                  {showPolicyDetails && currentTemplate && (
                    <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                      <div className="text-xs font-medium text-slate-700 mb-2">Refund Schedule:</div>
                      {currentTemplate.tiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">
                            {tier.hoursBeforeBooking >= 168 
                              ? `${Math.floor(tier.hoursBeforeBooking / 168)}+ weeks before`
                              : tier.hoursBeforeBooking >= 24
                              ? `${Math.floor(tier.hoursBeforeBooking / 24)}+ days before`
                              : tier.hoursBeforeBooking > 0
                              ? `${tier.hoursBeforeBooking}+ hours before`
                              : 'Less than above'}
                          </span>
                          <span className={`font-medium ${
                            tier.refundPercentage === 100 ? 'text-emerald-600' :
                            tier.refundPercentage > 0 ? 'text-blue-600' :
                            'text-slate-500'
                          }`}>
                            {tier.refundPercentage}% refund
                          </span>
                        </div>
                      ))}
                      {currentTemplate.processingFeePercentage > 0 && (
                        <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                          Processing fee: {currentTemplate.processingFeePercentage}%
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                    💡 <strong>Tip:</strong> The Moderate policy is recommended for most workspaces. You can customize this later in your listing settings.
                  </div>
                </div>
              </div>

              {/* Sticky footer actions */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t bg-white sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Back to edit
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-md bg-brand text-ink px-4 py-2 text-sm font-semibold hover:opacity-95"
                >
                  Confirm & continue
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
