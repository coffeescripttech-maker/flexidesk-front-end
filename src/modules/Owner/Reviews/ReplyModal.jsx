// src/modules/Owner/Reviews/ReplyModal.jsx
import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/services/api";

export default function ReplyModal({ review, onClose, onSuccess }) {
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isEditing = review.ownerReply && review.ownerReply.text;
  const maxChars = 300;
  const remainingChars = maxChars - replyText.length;

  // Pre-fill with existing reply if editing
  useEffect(() => {
    if (isEditing) {
      setReplyText(review.ownerReply.text);
    }
  }, [isEditing, review]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!replyText.trim()) {
      setError("Reply text is required");
      return;
    }

    if (replyText.trim().length < 5) {
      setError("Reply must be at least 5 characters");
      return;
    }

    if (replyText.length > maxChars) {
      setError(`Reply must not exceed ${maxChars} characters`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = isEditing 
        ? `/reviews/${review._id}/reply`
        : `/reviews/${review._id}/reply`;
      
      const method = isEditing ? "put" : "post";

      await api[method](endpoint, { text: replyText.trim() });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to submit reply";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const listing = review.listingId || review.listing || {};
  const user = review.userId || review.user || {};
  const userName = user.name || user.fullName || user.firstName || "Anonymous";
  const listingName = listing.venue || listing.shortDesc || "Untitled Listing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">
            {isEditing ? "Edit Reply" : "Reply to Review"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-ink transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Review Context */}
          <div className="rounded-lg bg-slate-50 p-4 mb-6">
            <div className="text-sm font-medium text-ink mb-2">{listingName}</div>
            <div className="text-sm text-slate mb-2">
              Review by {userName} • {review.rating}★
            </div>
            <div className="text-sm text-slate-700">
              "{review.comment || "No comment provided."}"
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 rounded-md bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 px-4 py-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Reply {isEditing ? "updated" : "submitted"} successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-800 px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink mb-2">
                Your Reply
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank you for your feedback..."
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent resize-none"
                rows={6}
                disabled={loading || success}
                maxLength={maxChars}
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className={remainingChars < 0 ? "text-rose-600" : "text-slate"}>
                  {remainingChars} characters remaining
                </span>
                <span className="text-slate">
                  {replyText.length} / {maxChars}
                </span>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink mb-2">
                Preview
              </label>
              <div className="rounded-lg bg-slate-50 p-4 border-l-2 border-ink">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-ink">Owner Response</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-ink text-white">
                    Owner
                  </span>
                </div>
                <div className="text-sm text-slate-700">
                  {replyText || "Your reply will appear here..."}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 text-ink px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                disabled={loading || success}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-ink text-white px-4 py-2 text-sm hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || success || !replyText.trim() || remainingChars < 0}
              >
                {loading ? "Submitting..." : isEditing ? "Update Reply" : "Submit Reply"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
