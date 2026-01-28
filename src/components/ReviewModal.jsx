// src/components/ReviewModal.jsx
import React, { useState } from "react";
import { Star, Info, CheckCircle2, AlertCircle } from "lucide-react";
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
import PhotoUpload from "@/components/PhotoUpload";

const REVIEW_GUIDELINES = [
  "Be honest and constructive",
  "Focus on your experience, not personal attacks",
  "Mention specific details (cleanliness, amenities, location)",
  "Include both positives and areas for improvement",
  "Avoid profanity or discriminatory language",
  "Don't include personal contact information",
];

const CHARACTER_LIMIT = 500;
const MIN_CHARACTERS = 10;
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReviewModal({
  open,
  onClose,
  booking,
  onSubmit,
  submitting = false,
  editMode = false,
  existingReview = null,
  hoursRemaining = null,
}) {
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);

  // Update state when existingReview changes
  React.useEffect(() => {
    if (existingReview && editMode) {
      setRating(existingReview.rating || 5);
      setComment(existingReview.comment || "");
      // Convert existing photos to the format expected by PhotoUpload
      if (existingReview.photos && existingReview.photos.length > 0) {
        const existingPhotos = existingReview.photos.map((url, index) => ({
          id: `existing-${index}`,
          preview: url,
          url: url,
          isExisting: true
        }));
        setPhotos(existingPhotos);
      } else if (existingReview.images && existingReview.images.length > 0) {
        const existingPhotos = existingReview.images.map((img, index) => ({
          id: `existing-${index}`,
          preview: img.url || img,
          url: img.url || img,
          isExisting: true
        }));
        setPhotos(existingPhotos);
      }
    }
  }, [existingReview, editMode]);

  const listingName = booking?.listing?.venue || booking?.listing?.shortDesc || "this workspace";
  const remainingChars = CHARACTER_LIMIT - comment.length;
  const isCommentTooShort = comment.trim().length > 0 && comment.trim().length < MIN_CHARACTERS;
  const isCommentTooLong = comment.length > CHARACTER_LIMIT;

  const handlePhotoChange = (updatedPhotos, photoErrors) => {
    setPhotos(updatedPhotos);
    if (photoErrors) {
      setErrors({ ...errors, photos: Array.isArray(photoErrors) ? photoErrors.join(', ') : photoErrors });
    } else {
      const newErrors = { ...errors };
      delete newErrors.photos;
      setErrors(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!rating || rating < 1 || rating > 5) {
      newErrors.rating = "Please select a rating";
    }

    if (comment.trim().length > 0 && comment.trim().length < MIN_CHARACTERS) {
      newErrors.comment = `Review must be at least ${MIN_CHARACTERS} characters`;
    }

    if (comment.length > CHARACTER_LIMIT) {
      newErrors.comment = `Review cannot exceed ${CHARACTER_LIMIT} characters`;
    }

    if (photos.length > MAX_PHOTOS) {
      newErrors.photos = `Maximum ${MAX_PHOTOS} photos allowed`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      rating,
      comment: comment.trim(),
      photos: photos.filter(p => !p.isExisting).map(p => p.file), // Only send new photos
      existingPhotos: photos.filter(p => p.isExisting).map(p => p.url), // Keep existing photo URLs
    });
  };

  const handleClose = () => {
    if (!submitting) {
      if (!editMode) {
        setRating(5);
        setComment("");
        setPhotos([]);
      }
      setErrors({});
      setShowGuidelines(false);
      onClose();
    }
  };

  const getRatingLabel = (value) => {
    const labels = {
      5: "Excellent",
      4: "Good",
      3: "Okay",
      2: "Poor",
      1: "Terrible",
    };
    return labels[value] || "";
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editMode ? "Edit Review" : "Review"} <span className="text-brand">{listingName}</span>
          </DialogTitle>
          <DialogDescription>
            {editMode 
              ? `You can edit your review${hoursRemaining ? ` for the next ${hoursRemaining.toFixed(1)} hours` : ""}`
              : "Share your experience to help others make informed decisions"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">How was your experience?</Label>
              {errors.rating && (
                <span className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.rating}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded"
                    disabled={submitting}
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        value <= displayRating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-none text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-lg font-semibold text-ink">
                {getRatingLabel(displayRating)}
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="comment" className="text-base font-semibold">
                Tell us more (optional)
              </Label>
              <span
                className={`text-xs ${
                  isCommentTooLong
                    ? "text-rose-600 font-semibold"
                    : remainingChars < 50
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                {remainingChars} characters remaining
              </span>
            </div>

            <Textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike? How was the location, cleanliness, amenities, and overall experience?"
              className={`resize-none ${
                errors.comment ? "border-rose-500 focus-visible:ring-rose-500" : ""
              }`}
              disabled={submitting}
            />

            {errors.comment && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.comment}
              </p>
            )}

            {isCommentTooShort && !errors.comment && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Info className="h-3 w-3" />
                A few more characters would make your review more helpful
              </p>
            )}
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Add photos (optional)
              </Label>
              <span className="text-xs text-slate-500">
                {photos.length}/{MAX_PHOTOS} photos
              </span>
            </div>

            <PhotoUpload
              photos={photos}
              onChange={handlePhotoChange}
              disabled={submitting}
              maxPhotos={MAX_PHOTOS}
              error={errors.photos}
            />
          </div>

          {/* Guidelines Section */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <button
              type="button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="flex items-center gap-2 text-sm font-medium text-ink hover:text-brand transition-colors w-full"
              disabled={submitting}
            >
              <Info className="h-4 w-4" />
              <span>Review Guidelines</span>
              <span className="ml-auto text-xs text-slate-500">
                {showGuidelines ? "Hide" : "Show"}
              </span>
            </button>

            {showGuidelines && (
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {REVIEW_GUIDELINES.map((guideline, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{guideline}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preview Section */}
          {!editMode && comment.trim().length >= MIN_CHARACTERS && !isCommentTooLong && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Your review will be visible immediately</p>
                  <p className="text-blue-700">
                    It will appear on the listing page and help other users make informed decisions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Edit Time Warning */}
          {editMode && hoursRemaining !== null && hoursRemaining < 6 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">Limited time to edit</p>
                  <p className="text-amber-700">
                    You have {hoursRemaining.toFixed(1)} hours remaining to edit this review.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !rating || isCommentTooLong}
            className="min-w-[120px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {editMode ? "Updating..." : "Submitting..."}
              </span>
            ) : (
              editMode ? "Update Review" : "Submit Review"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
