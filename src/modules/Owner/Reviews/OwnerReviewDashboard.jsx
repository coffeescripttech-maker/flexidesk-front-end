// src/modules/Owner/Reviews/OwnerReviewDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  ChevronDown,
  Star,
  MessageSquare,
  TrendingUp,
  Calendar as CalendarIcon,
} from "lucide-react";
import OwnerShell from "../components/OwnerShell";
import api from "@/services/api";
import ReplyModal from "./ReplyModal";

export default function OwnerReviewDashboard() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState(null);
  const [listingFilter, setListingFilter] = useState("all");
  const [replyFilter, setReplyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [listings, setListings] = useState([]);
  
  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const baseHeaders = { "Cache-Control": "no-cache", Pragma: "no-cache" };
  const validate = (s) => s >= 200 && s < 300;

  // Fetch owner's listings for filter
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/owner/listings/mine", {
          headers: baseHeaders,
          validateStatus: validate,
        });
        const data = res?.data || {};
        const arr = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setListings(arr);
        }
      } catch (e) {
        console.error("Failed to load listings:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch reviews
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = {
          status: "visible",
          sort: sortBy,
          limit: 50,
          _ts: Date.now(),
        };

        if (listingFilter !== "all") {
          params.listingId = listingFilter;
        }

        if (replyFilter === "replied") {
          params.hasReply = "true";
        } else if (replyFilter === "unreplied") {
          params.hasReply = "false";
        }

        const res = await api.get("/reviews/owner/my-reviews", {
          params,
          headers: baseHeaders,
          validateStatus: validate,
        });

        const data = res?.data || {};
        const arr = Array.isArray(data.reviews) ? data.reviews : [];
        
        if (!cancelled) {
          setReviews(arr);
          setStats(data.stats || null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.message || e.message || "Failed to load reviews";
          setErr(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingFilter, replyFilter, sortBy, refreshKey]);

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;

    return reviews.filter((r) => {
      const listing = r.listingId || r.listing || {};
      const user = r.userId || r.user || {};
      const listingName = (listing.venue || listing.shortDesc || "").toLowerCase();
      const userName = (user.name || user.fullName || user.firstName || "").toLowerCase();
      const comment = (r.comment || "").toLowerCase();
      
      return listingName.includes(q) || userName.includes(q) || comment.includes(q);
    });
  }, [reviews, query]);

  const handleReply = (review) => {
    setSelectedReview(review);
    setReplyModalOpen(true);
  };

  const handleReplySuccess = () => {
    setReplyModalOpen(false);
    setSelectedReview(null);
    setRefreshKey((x) => x + 1);
  };

  const headerProps = {
    query,
    onQueryChange: setQuery,
    onRefresh: () => setRefreshKey((x) => x + 1),
  };

  const sidebarProps = { active: "reviews" };

  return (
    <OwnerShell
      navOpen={navOpen}
      onToggleNav={() => setNavOpen((v) => !v)}
      onCloseNav={() => setNavOpen(false)}
      headerProps={headerProps}
      sidebarProps={sidebarProps}
    >
      {/* Statistics Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KPI 
          label="Total Reviews" 
          value={stats?.totalReviews || 0} 
          icon={MessageSquare} 
        />
        <KPI 
          label="Average Rating" 
          value={stats?.averageRating ? `${stats.averageRating}★` : "—"} 
          icon={Star} 
        />
        <KPI 
          label="Reply Rate" 
          value={stats?.replyRate ? `${stats.replyRate}%` : "—"} 
          icon={TrendingUp} 
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-xl ring-1 ring-slate-200 bg-white p-3 md:p-4 sticky top-14 z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Listing Filter */}
          <div className="relative">
            <select
              className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value)}
            >
              <option value="all">All Listings</option>
              {listings.map((listing) => (
                <option key={listing._id || listing.id} value={listing._id || listing.id}>
                  {listing.venue || listing.shortDesc || "Untitled"}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
          </div>

          {/* Reply Status Filter */}
          {[
            ["all", "All Reviews"],
            ["unreplied", "Needs Reply"],
            ["replied", "Replied"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setReplyFilter(val)}
              className={[
                "rounded-full px-3 py-1 text-sm ring-1 transition-colors",
                replyFilter === val
                  ? "bg-ink text-white ring-ink"
                  : "bg-white text-ink ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate" />
            <div className="relative">
              <select
                className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* Reviews List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-xl ring-1 ring-slate-200 bg-white p-10 text-center text-slate">
            No reviews to display.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard 
              key={review._id || review.id} 
              review={review} 
              onReply={handleReply}
            />
          ))
        )}
      </div>

      {/* Reply Modal */}
      {replyModalOpen && selectedReview && (
        <ReplyModal
          review={selectedReview}
          onClose={() => {
            setReplyModalOpen(false);
            setSelectedReview(null);
          }}
          onSuccess={handleReplySuccess}
        />
      )}
    </OwnerShell>
  );
}

function KPI({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 flex items-center gap-3">
      {Icon && (
        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
      )}
      <div>
        <div className="text-xs text-slate">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-ink">
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, onReply }) {
  const listing = review.listingId || review.listing || {};
  const user = review.userId || review.user || {};
  const userName = user.name || user.fullName || user.firstName || "Anonymous";
  const listingName = listing.venue || listing.shortDesc || "Untitled Listing";
  
  const hasReply = review.ownerReply && review.ownerReply.text;
  const canEditReply = hasReply && review.ownerReply.createdAt && 
    (Date.now() - new Date(review.ownerReply.createdAt).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-ink">{listingName}</div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate">
            <span>{userName}</span>
            <span>•</span>
            <StarRating rating={review.rating} />
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {fmtDate(review.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Review Comment */}
      <div className="mt-3 text-sm text-slate-700">
        {review.comment || "No comment provided."}
      </div>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.images.slice(0, 3).map((img, idx) => (
            <img
              key={idx}
              src={img.url || img}
              alt={`Review ${idx + 1}`}
              className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200"
            />
          ))}
          {review.images.length > 3 && (
            <div className="h-16 w-16 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate">
              +{review.images.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Owner Reply */}
      {hasReply && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 border-l-2 border-ink">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-ink">Owner Response</span>
            {review.ownerReply.isEdited && (
              <span className="text-xs text-slate">(Edited)</span>
            )}
          </div>
          <div className="text-sm text-slate-700">
            {review.ownerReply.text}
          </div>
          <div className="mt-2 text-xs text-slate">
            {fmtDate(review.ownerReply.createdAt)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {!hasReply ? (
          <button
            onClick={() => onReply(review)}
            className="rounded-md bg-ink text-white px-4 py-2 text-sm hover:bg-ink/90 transition-colors"
          >
            Reply
          </button>
        ) : canEditReply ? (
          <button
            onClick={() => onReply(review)}
            className="rounded-md border border-slate-200 text-ink px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            Edit Reply
          </button>
        ) : (
          <div className="text-xs text-slate flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Replied
          </div>
        )}
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4">
      <div className="h-4 bg-slate-100 animate-pulse rounded w-1/3" />
      <div className="mt-2 h-3 bg-slate-100 animate-pulse rounded w-1/2" />
      <div className="mt-3 h-16 bg-slate-100 animate-pulse rounded" />
      <div className="mt-4 h-8 bg-slate-100 animate-pulse rounded w-24" />
    </div>
  );
}

function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
