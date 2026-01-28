import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, EyeOff, Trash2, Star, AlertTriangle } from "lucide-react";

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "—";
  }
}

// Review Detail Modal with Moderation Actions
export function ReviewDetailModal({ open, onOpenChange, review, onModerate, loading }) {
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState("");

  if (!review) return null;

  const handleSubmit = async () => {
    if (!action) return;
    await onModerate(review._id, action, notes);
    setAction(null);
    setNotes("");
  };

  const handleCancel = () => {
    setAction(null);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Details & Moderation</DialogTitle>
          <DialogDescription>
            Review the flagged content and take appropriate action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Review Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">User</Label>
                <div className="font-medium">{review.userId?.name || "Anonymous"}</div>
                <div className="text-sm text-muted-foreground">
                  {review.userId?.email || "—"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Listing</Label>
                <div className="font-medium">
                  {review.listingId?.title || review.listingId?.venue || review.listingId?.name || "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Rating</Label>
                <div className="mt-1">
                  <StarRating rating={review.rating} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      review.status === "visible"
                        ? "default"
                        : review.status === "flagged"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {review.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Comment</Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {review.comment || "No comment"}
              </div>
            </div>

            {review.photos && review.photos.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Photos ({review.photos.length})</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {review.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Review photo ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}

            {review.ownerReply && review.ownerReply.text && (
              <div>
                <Label className="text-muted-foreground">Owner Reply</Label>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  {review.ownerReply.text}
                </div>
              </div>
            )}
          </div>

          {/* Flag Information */}
          {review.status === "flagged" && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <Label className="text-lg font-semibold">Flag Information</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Flag Reason</Label>
                  <div className="font-medium capitalize">
                    {typeof review.flagReason === 'string' ? review.flagReason.replace(/_/g, " ") : "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Flagged By</Label>
                  <div className="font-medium">
                    {review.flaggedBy?.email || review.flaggedBy?.name || (review.flaggedBy ? "User" : "System")}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Flagged At</Label>
                  <div className="font-medium">{formatDate(review.flaggedAt)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <div className="font-medium">{formatDate(review.createdAt)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Moderation History */}
          {review.moderatedBy && (
            <div className="border-t pt-4">
              <Label className="text-lg font-semibold">Moderation History</Label>
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Moderated By</Label>
                    <div className="font-medium">
                      {review.moderatedBy?.email || review.moderatedBy?.name || "Admin"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Moderated At</Label>
                    <div className="font-medium">{formatDate(review.moderatedAt)}</div>
                  </div>
                </div>
                {review.moderationNotes && (
                  <div>
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {review.moderationNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Selection */}
          {!action && (
            <div className="border-t pt-4">
              <Label className="text-lg font-semibold mb-3 block">Take Action</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAction("approve")}
                >
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Approve</span>
                  <span className="text-xs text-muted-foreground">Make visible</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAction("hide")}
                >
                  <EyeOff className="h-6 w-6 text-orange-600" />
                  <span>Hide</span>
                  <span className="text-xs text-muted-foreground">Keep but hide</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => setAction("delete")}
                >
                  <Trash2 className="h-6 w-6" />
                  <span>Delete</span>
                  <span className="text-xs">Permanent removal</span>
                </Button>
              </div>
            </div>
          )}

          {/* Action Confirmation */}
          {action && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                {action === "approve" && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <Label className="text-lg font-semibold">Approve Review</Label>
                  </>
                )}
                {action === "hide" && (
                  <>
                    <EyeOff className="h-5 w-5 text-orange-600" />
                    <Label className="text-lg font-semibold">Hide Review</Label>
                  </>
                )}
                {action === "delete" && (
                  <>
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <Label className="text-lg font-semibold">Delete Review</Label>
                  </>
                )}
              </div>

              <div className="p-3 bg-muted rounded-md text-sm">
                {action === "approve" &&
                  "This review will be marked as visible and will appear on the listing page."}
                {action === "hide" &&
                  "This review will be hidden from public view but kept in the database for records."}
                {action === "delete" &&
                  "⚠️ This review will be permanently deleted. This action cannot be undone."}
              </div>

              <div>
                <Label htmlFor="moderationNotes">
                  Admin Notes {action === "hide" || action === "delete" ? "(Required)" : "(Optional)"}
                </Label>
                <Textarea
                  id="moderationNotes"
                  rows={3}
                  placeholder="Add notes about this moderation action..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || ((action === "hide" || action === "delete") && !notes.trim())}
                  variant={action === "delete" ? "destructive" : "default"}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm {action === "approve" ? "Approval" : action === "hide" ? "Hide" : "Deletion"}
                </Button>
                <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Approve Review Modal (Simple confirmation)
export function ApproveReviewModal({ open, onOpenChange, review, onConfirm, loading }) {
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    await onConfirm(review._id, "approve", notes);
    setNotes("");
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Review
          </DialogTitle>
          <DialogDescription>
            This review will be marked as visible and appear on the listing page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="font-medium mb-1">Review by {review.userId?.name || "Anonymous"}</div>
            <div className="text-muted-foreground line-clamp-2">{review.comment}</div>
          </div>

          <div>
            <Label htmlFor="approveNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="approveNotes"
              rows={2}
              placeholder="Add notes about this approval..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Approve Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hide Review Modal
export function HideReviewModal({ open, onOpenChange, review, onConfirm, loading }) {
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert("Please provide a reason for hiding this review");
      return;
    }
    await onConfirm(review._id, "hide", notes);
    setNotes("");
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-orange-600" />
            Hide Review
          </DialogTitle>
          <DialogDescription>
            This review will be hidden from public view but kept in the database for records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="font-medium mb-1">Review by {review.userId?.name || "Anonymous"}</div>
            <div className="text-muted-foreground line-clamp-2">{review.comment}</div>
          </div>

          <div>
            <Label htmlFor="hideReason">Reason for Hiding (Required)</Label>
            <Textarea
              id="hideReason"
              rows={3}
              placeholder="Explain why this review is being hidden..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !notes.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Hide Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Review Modal
export function DeleteReviewModal({ open, onOpenChange, review, onConfirm, loading }) {
  const [notes, setNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert("Please provide a reason for deleting this review");
      return;
    }
    if (confirmText !== "DELETE") {
      alert('Please type "DELETE" to confirm');
      return;
    }
    await onConfirm(review._id, "delete", notes);
    setNotes("");
    setConfirmText("");
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Review
          </DialogTitle>
          <DialogDescription>
            ⚠️ This action cannot be undone. The review will be permanently deleted from the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
            <div className="font-medium mb-1">Review by {review.userId?.name || "Anonymous"}</div>
            <div className="text-muted-foreground line-clamp-2">{review.comment}</div>
          </div>

          <div>
            <Label htmlFor="deleteReason">Reason for Deletion (Required)</Label>
            <Textarea
              id="deleteReason"
              rows={3}
              placeholder="Explain why this review is being permanently deleted..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="confirmDelete">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <input
              id="confirmDelete"
              type="text"
              className="mt-2 w-full px-3 py-2 border rounded-md"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !notes.trim() || confirmText !== "DELETE"}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
