import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Star,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  TrendingUp,
  MessageSquare,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import api from "@/services/api";

function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RatingDistributionChart({ distribution }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-3">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution[rating] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={rating} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-16">
              <span className="text-sm font-medium">{rating}</span>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right">
              {count} ({percentage.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlagReasonsChart({ flagReasons }) {
  const total = flagReasons.reduce((sum, item) => sum + item.count, 0);

  const reasonLabels = {
    spam: "Spam",
    inappropriate: "Inappropriate Content",
    fake: "Fake Review",
    profanity: "Profanity",
    external_links: "External Links",
    contact_info: "Contact Information",
    other: "Other",
  };

  return (
    <div className="space-y-3">
      {flagReasons.map((item) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        const label = reasonLabels[item._id] || item._id;

        return (
          <div key={item._id} className="flex items-center gap-3">
            <div className="w-40 text-sm font-medium truncate">{label}</div>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right">
              {item.count} ({percentage.toFixed(0)}%)
            </span>
          </div>
        );
      })}
      {flagReasons.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No flagged reviews in this period
        </p>
      )}
    </div>
  );
}

export default function ReviewAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await api.get("/admin/reviews/analytics", { params });
      setAnalytics(response.data);
    } catch (err) {
      console.error("[ReviewAnalytics] Failed to load analytics:", err);
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateRange = () => {
    loadAnalytics();
  };

  const handleClearDateRange = () => {
    setDateRange({ startDate: "", endDate: "" });
    setTimeout(() => loadAnalytics(), 100);
  };

  if (loading && !analytics) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>{error}</p>
              <Button onClick={loadAnalytics} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Review Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Platform-wide review statistics and trends
            </p>
          </div>
          <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApplyDateRange} disabled={loading}>
                  Apply
                </Button>
                <Button variant="outline" onClick={handleClearDateRange} disabled={loading}>
                  Clear
                </Button>
              </div>
            </div>
            {analytics.period.startDate || analytics.period.endDate ? (
              <p className="text-sm text-muted-foreground mt-3">
                Showing data from{" "}
                {analytics.period.startDate
                  ? new Date(analytics.period.startDate).toLocaleDateString()
                  : "beginning"}{" "}
                to{" "}
                {analytics.period.endDate
                  ? new Date(analytics.period.endDate).toLocaleDateString()
                  : "now"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Showing all-time data</p>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Reviews"
            value={analytics.totalReviews.toLocaleString()}
            subtitle={`${analytics.visibleReviews} visible`}
            icon={MessageSquare}
          />
          <StatCard
            title="Average Rating"
            value={analytics.averageRating.toFixed(2)}
            subtitle="Across all visible reviews"
            icon={Star}
          />
          <StatCard
            title="Flagged Reviews"
            value={analytics.flaggedCount.toLocaleString()}
            subtitle={`${((analytics.flaggedCount / analytics.totalReviews) * 100 || 0).toFixed(1)}% of total`}
            icon={AlertTriangle}
          />
          <StatCard
            title="With Photos"
            value={analytics.reviewsWithPhotos.toLocaleString()}
            subtitle={`${((analytics.reviewsWithPhotos / analytics.totalReviews) * 100 || 0).toFixed(1)}% of total`}
            icon={ImageIcon}
          />
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Review Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Visible</p>
                  <p className="text-2xl font-bold">{analytics.statusCounts.visible}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Hidden</p>
                  <p className="text-2xl font-bold">{analytics.statusCounts.hidden}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Flagged</p>
                  <p className="text-2xl font-bold">{analytics.statusCounts.flagged}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                  <p className="text-2xl font-bold">{analytics.statusCounts.deleted}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingDistributionChart distribution={analytics.ratingDistribution} />
          </CardContent>
        </Card>

        {/* Flag Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Flag Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <FlagReasonsChart flagReasons={analytics.flagReasons} />
          </CardContent>
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Owner Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Reviews with Owner Replies</span>
                    <Badge variant="secondary">{analytics.reviewsWithReplies}</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${((analytics.reviewsWithReplies / analytics.visibleReviews) * 100 || 0).toFixed(1)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((analytics.reviewsWithReplies / analytics.visibleReviews) * 100 || 0).toFixed(1)}% reply rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Richness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Reviews with Photos</span>
                    <Badge variant="secondary">{analytics.reviewsWithPhotos}</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${((analytics.reviewsWithPhotos / analytics.totalReviews) * 100 || 0).toFixed(1)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((analytics.reviewsWithPhotos / analytics.totalReviews) * 100 || 0).toFixed(1)}% include photos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
