// src/components/FlagReviewModal.jsx
import { useState } from "react";
import { X, Flag, AlertTriangle } from "lucide-react";
import api from "@/services/api";

const FLAG_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Promotional content or irrelevant information' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Offensive language or inappropriate content' },
  { value: 'fake', label: 'Fake Review', description: 'Suspicious or fraudulent review' },
  { value: 'other', label: 'Other', description: 'Other policy violation' },
];

export default function FlagReviewModal({ open, onClose, reviewId, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Please select a reason for flagging this review.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/reviews/${reviewId}/flag`, {
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      // Success
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      handleClose();
    } catch (err) {
      console.error('[FlagReviewModal] Error flagging review:', err);
      setError(err.response?.data?.message || 'Failed to flag review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedReason('');
      setDetails('');
      setError('');
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 grid place-items-center">
              <Flag className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Flag Review</h2>
              <p className="text-xs text-slate-500">Help us maintain quality standards</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-slate-100 grid place-items-center transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Warning Message */}
          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Before you flag this review</p>
              <p className="text-xs">
                Please only flag reviews that violate our community guidelines. 
                Disagreeing with a review is not a valid reason to flag it.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Why are you flagging this review? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {FLAG_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedReason === reason.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                    disabled={loading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{reason.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{reason.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-2">
              Additional details (optional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context that might help us review this flag..."
              rows={3}
              maxLength={500}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:text-slate-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              {details.length} / 500 characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedReason}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Flagging...' : 'Flag Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
