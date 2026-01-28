// src/modules/Owner/Analytics/OwnerAnalyticsPage.jsx
import { useEffect, useState, useMemo } from "react";
import { Clock, Percent, TrendingUp, Filter, X } from "lucide-react";
import api from "@/services/api";
import OwnerShell from "../components/OwnerShell";

// Recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export default function OwnerAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  
  // Filter states
  const [selectedListing, setSelectedListing] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load owner's listings for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/owner/listings/mine", { params: { limit: 100 } });
        setListings(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load listings", err);
      }
    })();
  }, []);

  // Load analytics data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {};
        if (selectedListing) params.listingId = selectedListing;
        if (selectedMonth) {
          params.month = selectedMonth;
          // If month is selected but no year, use current year
          if (!selectedYear) {
            params.year = new Date().getFullYear().toString();
          }
        }
        if (selectedYear) params.year = selectedYear;

        console.log('[Analytics] Fetching with params:', params);

        // Fetch all data in parallel
        const [summaryRes, predictionsRes, recommendationsRes] = await Promise.all([
          api.get("/owner/analytics/summary", { params }),
          api.get("/owner/analytics/predictions").catch(() => ({ data: null })),
          api.get("/owner/analytics/recommendations").catch(() => ({ data: null }))
        ]);

        setSummary(summaryRes.data);
        setPredictions(predictionsRes.data);
        setRecommendations(recommendationsRes.data);
      } catch (err) {
        console.error("Failed to load analytics summary", err);
        setError("Failed to load analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedListing, selectedMonth, selectedYear]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedListing("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const hasActiveFilters = selectedListing || selectedMonth || selectedYear;

  // Fallback values if API not implemented / empty
  const {
    totalEarnings = 0,
    occupancyRate = 0,
    avgDailyEarnings = 0,
    peakHours = [],
    listingStats = [],
    earningsSeries,
    hourlyOccupancy,
    dateRange,
    comparison = {},
    metrics = {},
    revenueByCategory = [],
  } = summary || {};

  // Chart data – prefer backend series, else build simple mock data
  const earningsData = useMemo(
    () =>
      earningsSeries && earningsSeries.length
        ? earningsSeries
        : buildMockEarningsSeries(avgDailyEarnings),
    [earningsSeries, avgDailyEarnings]
  );

  const occupancyData = useMemo(
    () =>
      hourlyOccupancy && hourlyOccupancy.length
        ? hourlyOccupancy
        : buildMockOccupancySeries(peakHours),
    [hourlyOccupancy, peakHours]
  );

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  // Get period label for display
  const getPeriodLabel = () => {
    if (selectedMonth && selectedYear) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;
    }
    if (selectedMonth && !selectedYear) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      return `${monthNames[parseInt(selectedMonth) - 1]} ${currentYear}`;
    }
    if (selectedYear && !selectedMonth) {
      return `Year ${selectedYear}`;
    }
    if (dateRange) {
      return `${dateRange.days} days`;
    }
    return "Last 30 days";
  };

  return (
    <OwnerShell title="Financial dashboard">
      <div className="space-y-6">
        {/* Header with Filters */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Financial dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Track your earnings, occupancy, peak hours, and performance analytics.
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">
                {[selectedListing, selectedMonth, selectedYear].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Filter Reports</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Workspace Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Workspace
                </label>
                <select
                  value={selectedListing}
                  onChange={(e) => setSelectedListing(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">All workspaces</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.venue || listing.shortDesc || "Untitled"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">All months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">All years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedListing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    Workspace: {listings.find(l => l.id === selectedListing)?.venue || "Selected"}
                    <button
                      onClick={() => setSelectedListing("")}
                      className="hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedMonth && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    Month: {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(selectedMonth) - 1]}
                    <button
                      onClick={() => setSelectedMonth("")}
                      className="hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedYear && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    Year: {selectedYear}
                    <button
                      onClick={() => setSelectedYear("")}
                      className="hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            label="Total earnings"
            value={
              loading
                ? "…"
                : `₱${Number(totalEarnings || 0).toLocaleString()}`
            }
            pill={getPeriodLabel()}
          />
          <KpiCard
            icon={Percent}
            label="Average occupancy"
            value={
              loading
                ? "…"
                : `${Number(occupancyRate || 0).toFixed(1)}%`
            }
            pill={getPeriodLabel()}
          />
          <KpiCard
            icon={Clock}
            label="Avg daily earnings"
            value={
              loading
                ? "…"
                : `₱${Number(avgDailyEarnings || 0).toLocaleString()}`
            }
            pill={getPeriodLabel()}
          />
          <KpiCard
            icon={Clock}
            label="Peak hours"
            value={
              loading
                ? "…"
                : peakHours && peakHours.length
                ? peakHours.join(", ")
                : "No data yet"
            }
            pill="Based on bookings"
          />
        </div>

        {/* PHASE 1: Period Comparison */}
        {comparison && comparison.current && !loading && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Period Comparison
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <ComparisonCard
                label="Total Earnings"
                current={comparison.current.earnings}
                previous={comparison.previous.earnings}
                change={comparison.change.earnings}
              />
              <ComparisonCard
                label="Bookings"
                current={comparison.current.bookings}
                previous={comparison.previous.bookings}
                change={comparison.change.bookings}
              />
              <ComparisonCard
                label="Occupancy Rate"
                current={comparison.current.occupancy}
                previous={comparison.previous.occupancy}
                change={comparison.change.occupancy}
              />
            </div>
          </div>
        )}

        {/* PHASE 1: Additional Metrics */}
        {metrics && metrics.totalCustomers !== undefined && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Customer & Booking Metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricBox label="Total Customers" value={metrics.totalCustomers || 0} />
              <MetricBox label="Repeat Customers" value={metrics.repeatCustomers || 0} />
              <MetricBox label="Retention Rate" value={`${metrics.retentionRate || 0}%`} />
              <MetricBox 
                label="Avg Booking Value" 
                value={`₱${Number(metrics.averageBookingValue || 0).toLocaleString()}`} 
              />
              <MetricBox label="Cancellation Rate" value={`${metrics.cancellationRate || 0}%`} />
            </div>
          </div>
        )}

        {/* PHASE 1: Revenue by Category */}
        {revenueByCategory && revenueByCategory.length > 0 && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Revenue by Category
            </h2>
            <div className="space-y-3">
              {revenueByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {cat.category}
                      </span>
                      <span className="text-sm text-slate-900">
                        ₱{Number(cat.revenue).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 min-w-[3rem] text-right">
                    {cat.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 2: Predictive Analytics */}
        {predictions && predictions.revenue && !loading && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              📈 Predictions & Forecasts
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Revenue Prediction */}
              <PredictionCard
                title="Revenue Forecast"
                subtitle="Next month prediction"
                value={`₱${Number(predictions.revenue.nextMonth || 0).toLocaleString()}`}
                trend={predictions.revenue.trend}
                confidence={predictions.revenue.confidence}
                details={[
                  `Range: ₱${Number(predictions.revenue.range?.min || 0).toLocaleString()} - ₱${Number(predictions.revenue.range?.max || 0).toLocaleString()}`,
                  predictions.revenue.basedOn
                ]}
              />

              {/* Occupancy Prediction */}
              {predictions.occupancy && predictions.occupancy.average && (
                <PredictionCard
                  title="Occupancy Forecast"
                  subtitle="Next week average"
                  value={`${predictions.occupancy.average}%`}
                  trend={predictions.occupancy.trend}
                  confidence={predictions.occupancy.confidence}
                  details={[
                    `Peak days: ${predictions.occupancy.peakDays?.join(", ") || "N/A"}`,
                    predictions.occupancy.recommendation
                  ]}
                />
              )}

              {/* Demand Prediction */}
              {predictions.demand && predictions.demand.nextMonth && (
                <PredictionCard
                  title="Demand Forecast"
                  subtitle="Expected bookings"
                  value={`${predictions.demand.nextMonth.expectedBookings} bookings`}
                  trend={predictions.demand.trend}
                  confidence={predictions.demand.nextMonth.confidence}
                  details={[
                    `Revenue: ₱${Number(predictions.demand.nextMonth.expectedRevenue || 0).toLocaleString()}`,
                    `Growth: ${predictions.demand.growthRate}%`
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: Prescriptive Analytics */}
        {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && !loading && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              💡 Smart Recommendations
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {recommendations.recommendations.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Charts section */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Earnings over time */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Earnings over time
                </h2>
                <p className="text-xs text-slate-500">
                  Daily/weekly earnings trend.
                </p>
              </div>
            </div>
            <div className="h-52 rounded-lg bg-slate-50 px-2 py-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      `₱${Number(value || 0).toLocaleString()}`
                    }
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0f172a"
                    fill="#e2e8f0"
                    strokeWidth={2}
                    name="Earnings"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Occupancy by hour */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Occupancy by hour
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              See when your spaces are busiest.
            </p>
            <div className="h-52 rounded-lg bg-slate-50 px-2 py-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occupancyData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => `${value}%`}
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="value"
                    name="Occupancy"
                    radius={[6, 6, 0, 0]}
                    fill="#0f172a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Listing performance table */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Listing performance
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 text-left font-medium">Listing</th>
                  <th className="py-2 px-3 text-right font-medium">Bookings</th>
                  <th className="py-2 px-3 text-right font-medium">Occupancy</th>
                  <th className="py-2 px-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-slate-400"
                    >
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && (!listingStats || listingStats.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-slate-400"
                    >
                      No performance data yet.
                    </td>
                  </tr>
                )}

                {!loading &&
                  listingStats &&
                  listingStats.length > 0 &&
                  listingStats.map((item) => (
                    <tr
                      key={item.listingId || item._id}
                      className="border-b border-slate-100"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-800">
                          {item.title || "Untitled listing"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.city || item.venue || ""}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.bookings ?? 0}
                      </td>
                      <td className="py-2 px-3 text-right">
                          {item.occupancyRate != null
                            ? `${item.occupancyRate.toFixed(1)}%`
                            : "—"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        ₱{Number(item.revenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}

function KpiCard({ icon: Icon, label, value, pill }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        {pill && (
          <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
            {pill}
          </span>
        )}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

/* ---------------- PHASE 1: New Components ---------------- */

function ComparisonCard({ label, current, previous, change }) {
  const isPositive = parseFloat(change) >= 0;
  const isNeutral = parseFloat(change) === 0;
  const changeColor = isNeutral ? "text-slate-500" : isPositive ? "text-emerald-600" : "text-rose-600";
  const changeBg = isNeutral ? "bg-slate-50" : isPositive ? "bg-emerald-50" : "bg-rose-50";
  const changeIcon = isNeutral ? "→" : isPositive ? "↑" : "↓";
  
  const formatValue = (val) => {
    if (label.includes("Earnings")) {
      return `₱${Number(val).toLocaleString()}`;
    }
    if (label.includes("Rate")) {
      return `${Number(val).toFixed(1)}%`;
    }
    return val;
  };
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500 mb-2">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-2xl font-semibold text-slate-900">
          {formatValue(current)}
        </div>
        <div className={`inline-flex items-center gap-0.5 text-sm font-medium px-2 py-0.5 rounded-full ${changeColor} ${changeBg}`}>
          <span>{changeIcon}</span>
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-xs text-slate-400">
        Previous: {formatValue(previous)}
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

/* ---------------- PHASE 2: Prediction Components ---------------- */

function PredictionCard({ title, subtitle, value, trend, confidence, details }) {
  const trendColors = {
    increasing: "text-emerald-600 bg-emerald-50",
    decreasing: "text-rose-600 bg-rose-50",
    stable: "text-slate-600 bg-slate-50",
    high: "text-emerald-600 bg-emerald-50",
    moderate: "text-amber-600 bg-amber-50",
    low: "text-slate-600 bg-slate-50",
    insufficient_data: "text-slate-400 bg-slate-50"
  };

  const trendIcons = {
    increasing: "↗",
    decreasing: "↘",
    stable: "→",
    high: "🔥",
    moderate: "📊",
    low: "📉"
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {trend && trend !== "insufficient_data" && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend] || trendColors.stable}`}>
            {trendIcons[trend] || "→"} {trend}
          </span>
        )}
      </div>
      
      <div className="text-2xl font-bold text-slate-900 mb-2">
        {value}
      </div>
      
      {confidence > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                confidence >= 80 ? "bg-emerald-500" :
                confidence >= 60 ? "bg-amber-500" :
                "bg-slate-400"
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      )}
      
      {details && details.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-slate-100">
          {details.map((detail, idx) => (
            <p key={idx} className="text-xs text-slate-600">
              {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- PHASE 3: Recommendation Components ---------------- */

function RecommendationCard({ recommendation }) {
  const priorityColors = {
    high: "border-rose-200 bg-rose-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-slate-200 bg-slate-50"
  };

  const priorityBadges = {
    high: "bg-rose-100 text-rose-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600"
  };

  return (
    <div className={`rounded-xl border p-4 ${priorityColors[recommendation.priority] || priorityColors.low}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {recommendation.icon && (
            <span className="text-xl">{recommendation.icon}</span>
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {recommendation.title}
            </h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${priorityBadges[recommendation.priority]}`}>
              {recommendation.priority} priority
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-slate-700 mb-3">
        {recommendation.description}
      </p>
      
      {recommendation.expectedImpact && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 mb-3">
          <span className="text-emerald-600">📊</span>
          Expected impact: {recommendation.expectedImpact}
        </div>
      )}
      
      {recommendation.actionDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-700 mb-2">Action steps:</p>
          {recommendation.actionDetails.steps && (
            <ul className="space-y-1">
              {recommendation.actionDetails.steps.map((step, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}
          {recommendation.actionDetails.suggestions && (
            <ul className="space-y-1">
              {recommendation.actionDetails.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
          {recommendation.actionDetails.channels && (
            <div className="mt-2">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Channels:</span>{" "}
                {Array.isArray(recommendation.actionDetails.channels)
                  ? recommendation.actionDetails.channels.join(", ")
                  : recommendation.actionDetails.channels}
              </p>
            </div>
          )}
          {recommendation.actionDetails.budget && (
            <div className="mt-2">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Budget:</span> {recommendation.actionDetails.budget}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- helpers for mock data ---------------- */

function buildMockEarningsSeries(avgDailyEarnings) {
  const base = Number(avgDailyEarnings || 0);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (!base) {
    // basic flat sequence if no data yet
    return labels.map((label, i) => ({
      label,
      value: (i + 1) * 1000,
    }));
  }

  return labels.map((label, i) => {
    const factor = 0.8 + 0.4 * Math.sin((i / labels.length) * Math.PI * 2);
    return {
      label,
      value: Math.max(0, Math.round(base * factor)),
    };
  });
}

function buildMockOccupancySeries(peakHours) {
  if (peakHours && peakHours.length) {
    // Higher bar for earlier peak, just to visualize order
    return peakHours.map((hour, idx) => ({
      hour,
      value: 70 - idx * 10, // 70%, 60%, 50%, ...
    }));
  }

  const hours = ["09:00", "12:00", "15:00", "18:00"];
  return hours.map((h, idx) => ({
    hour: h,
    value: 40 + idx * 10, // 40-70%
  }));
}
