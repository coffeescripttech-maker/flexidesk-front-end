import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  EyeOff,
  Trash2,
  AlertTriangle,
  Star,
} from "lucide-react";
import api from "@/services/api";
import { ReviewDetailModal } from "./ModerationModals";

const PAGE_SIZE = 20;

const REVIEW_STATUS = {
  visible: { label: "Visible", badge: "default" },
  hidden: { label: "Hidden", badge: "secondary" },
  flagged: { label: "Flagged", badge: "destructive" },
  deleted: { label: "Deleted", badge: "outline" },
};

const FLAG_REASONS = {
  spam: "Spam",
  inappropriate: "Inappropriate Content",
  fake: "Fake Review",
  profanity: "Profanity",
  external_links: "External Links",
  contact_info: "Contact Information",
  other: "Other",
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function downloadCSV(filename, rows) {
  const escape = (val) => {
    if (val == null) return "";
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };
  const headers = Object.keys(rows[0] || { id: "ID" });
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )}
        />
      ))}
    </div>
  );
}

export default function AdminModerationPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    status: "flagged",
    reason: "all",
    sort: "flaggedAt_desc",
  });

  const [selectedReview, setSelectedReview] = useState(null);
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [moderating, setModerating] = useState(false);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line
  }, [filters.status, filters.reason, filters.sort, page]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sort: filters.sort,
      };

      if (filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.reason !== "all") {
        params.reason = filters.reason;
      }

      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      const response = await api.get("/admin/reviews/flagged", { params });
      
      setReviews(response.data.reviews || []);
      setTotalPages(response.data.pages || 1);
      setTotalReviews(response.data.total || 0);
    } catch (err) {
      console.error("[AdminModeration] Failed to load reviews:", err);
      setError(err.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setPage(1);
    loadReviews();
  };

  const handleModerate = async (reviewId, action, notes = "") => {
    setModerating(true);
    try {
      await api.post(`/admin/reviews/${reviewId}/moderate`, {
        action,
        notes,
      });
      
      // Refresh the list
      await loadReviews();
      
      // Close modal if open
      setModerationModalOpen(false);
      setSelectedReview(null);
    } catch (err) {
      console.error("[AdminModeration] Failed to moderate review:", err);
      alert(err.response?.data?.message || "Failed to moderate review");
    } finally {
      setModerating(false);
    }
  };

  const onBulkExport = () => {
    if (!reviews.length) return;
    const rows = reviews.map((r) => ({
      id: r._id,
      listing: r.listingId?.name || r.listingId || "",
      user: r.userId?.email || r.userId || "",
      rating: r.rating,
      comment: r.comment || "",
      status: r.status,
      flagReason: r.flagReason || "",
      flaggedBy: r.flaggedBy?.email || r.flaggedBy || "",
      flaggedAt: r.flaggedAt || "",
      createdAt: r.createdAt || "",
    }));
    downloadCSV(`flagged_reviews_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const toolbar = (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            className="pl-8"
            placeholder="Search user, listing, comment..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
          />
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={filters.status}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {Object.keys(REVIEW_STATUS).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {REVIEW_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.reason}
          onValueChange={(v) => setFilters((f) => ({ ...f, reason: v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Flag Reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {Object.entries(FLAG_REASONS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flaggedAt_desc">Recently flagged</SelectItem>
            <SelectItem value="flaggedAt_asc">Oldest flagged</SelectItem>
            <SelectItem value="createdAt_desc">Recently created</SelectItem>
            <SelectItem value="rating_asc">Lowest rating</SelectItem>
            <SelectItem value="rating_desc">Highest rating</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Bulk actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
              <div>
                <CardTitle className="text-2xl">Review Moderation</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Manage flagged reviews, approve or hide inappropriate content
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalReviews} total</Badge>
                <Badge variant="outline">
                  Page {page} of {totalPages}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {toolbar}

            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.length > 0 && selected.length === reviews.length}
                        onCheckedChange={(v) =>
                          setSelected(v ? reviews.map((r) => r._id) : [])
                        }
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flag Reason</TableHead>
                    <TableHead>Flagged By</TableHead>
                    <TableHead>Flagged At</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !reviews.length ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10">
                        <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />
                        Loading reviews…
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!loading && !reviews.length ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No reviews found. Try adjusting filters.
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {reviews.map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(review._id)}
                          onCheckedChange={(v) =>
                            setSelected((prev) =>
                              v ? [...prev, review._id] : prev.filter((x) => x !== review._id)
                            )
                          }
                          aria-label={`Select review ${review._id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {review.userId?.name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {review.userId?.email || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="line-clamp-2">
                          {review.listingId?.title || review.listingId?.venue || review.listingId?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StarRating rating={review.rating} />
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="line-clamp-2 text-sm">{review.comment || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={REVIEW_STATUS[review.status]?.badge || "secondary"}>
                          {REVIEW_STATUS[review.status]?.label || review.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {review.flagReason === "profanity" ||
                          review.flagReason === "inappropriate" ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : null}
                          <span className="text-sm">
                            {FLAG_REASONS[review.flagReason] || (typeof review.flagReason === 'string' ? review.flagReason : "—")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {review.flaggedBy?.email || review.flaggedBy?.name || (review.flaggedBy ? "User" : "System")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(review.flaggedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReview(review);
                                setModerationModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleModerate(review._id, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleModerate(review._id, "hide")}
                            >
                              <EyeOff className="h-4 w-4 mr-2 text-orange-600" />
                              Hide
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this review? This action cannot be undone."
                                  )
                                ) {
                                  handleModerate(review._id, "delete");
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {selected.length
                  ? `${selected.length} selected`
                  : `${reviews.length} row(s)`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>

            {error ? (
              <div className="text-sm text-destructive">{String(error)}</div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      <ReviewDetailModal
        open={moderationModalOpen}
        onOpenChange={setModerationModalOpen}
        review={selectedReview}
        onModerate={handleModerate}
        loading={moderating}
      />
    </div>
  );
}
