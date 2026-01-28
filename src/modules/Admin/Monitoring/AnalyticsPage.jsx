import React, { useEffect, useMemo, useState } from "react";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Download,
  Activity,
  CalendarDays,
  CreditCard,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  Percent,
  Info,
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip as UiTooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import api from "@/services/api";

const fmtNumber = (n) => (n ?? 0).toLocaleString("en-PH");
const fmtPercent = (n) => `${Math.round(n ?? 0)}%`;

function rangeLabel(v) {
  if (v === "1d") return "Last 1 day";
  if (v === "30d") return "Last 1 month";
  if (v === "1y") return "Last 1 year";
  return "Custom";
}

function normalizePercentMaybe(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v <= 1.5 ? v * 100 : v;
  const n = Number(String(v).replace("%", "").trim());
  if (!Number.isFinite(n)) return 0;
  return n <= 1.5 ? n * 100 : n;
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const [overview, setOverview] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [prescriptive, setPrescriptive] = useState(null);
  const [demographics, setDemographics] = useState(null);

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("30d");
  const [sortBy, setSortBy] = useState("recent");
  
  // Enhanced filters
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [openSheet, setOpenSheet] = useState(false);
  const [active, setActive] = useState(null);

  const [yearUnavailable, setYearUnavailable] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [prescriptiveUnavailable, setPrescriptiveUnavailable] = useState(false);
  
  // Available filter options (will be populated from data)
  const [availableCities, setAvailableCities] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  const reload = async (rangeOverride) => {
    const range = rangeOverride || datePreset;

    try {
      setLoading(true);
      setPermissionError(false);
      setRangeError("");
      setPrescriptiveUnavailable(false);

      // Build query params with filters
      const params = { range };
      if (cityFilter && cityFilter !== "all") params.city = cityFilter;
      if (categoryFilter && categoryFilter !== "all") params.category = categoryFilter;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;

      const requests = [
        api.get("/admin/analytics/overview", { params }),
        api.get("/admin/analytics/forecast", { params }),
        api.get("/admin/analytics/prescriptive", { params }),
        api.get("/admin/analytics/demographics", { params }),
      ];

      const [resOverview, resForecast, resPrescriptive, resDemographics] =
        await Promise.allSettled(requests);

      const ov =
        resOverview.status === "fulfilled" ? resOverview.value?.data : null;
      const fc =
        resForecast.status === "fulfilled" ? resForecast.value?.data : null;

      const pr =
        resPrescriptive.status === "fulfilled"
          ? resPrescriptive.value?.data
          : null;

      const dm =
        resDemographics.status === "fulfilled"
          ? resDemographics.value?.data?.data
          : null;

      const any403 =
        (resOverview.status === "rejected" &&
          resOverview.reason?.response?.status === 403) ||
        (resForecast.status === "rejected" &&
          resForecast.reason?.response?.status === 403) ||
        (resPrescriptive.status === "rejected" &&
          resPrescriptive.reason?.response?.status === 403) ||
        ov?.permissionError ||
        fc?.permissionError ||
        pr?.permissionError;

      if (any403) setPermissionError(true);

      setOverview(ov || null);
      setForecast(fc || null);
      setDemographics(dm || null);

      const prescriptiveOk =
        pr &&
        (Array.isArray(pr.insights) ||
          Array.isArray(pr.recommendations) ||
          Array.isArray(pr.actions));

      if (prescriptiveOk) {
        setPrescriptive(pr);
      } else {
        setPrescriptive(null);
        if (
          resPrescriptive.status === "rejected" ||
          (resPrescriptive.status === "fulfilled" && !prescriptiveOk)
        ) {
          setPrescriptiveUnavailable(true);
        }
      }

      const series = ov?.occupancySeries || fc?.occupancySeries || [];

      if (range === "1y") {
        const empty = !Array.isArray(series) || series.length === 0;
        setYearUnavailable(empty);
      } else {
        setYearUnavailable(false);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load analytics";
      setRangeError(String(msg));
      if (status === 403) setPermissionError(true);

      if (range === "1y") {
        setYearUnavailable(true);
        setDatePreset("30d");
        try {
          const requests = [
            api.get("/admin/analytics/overview", { params: { range: "30d" } }),
            api.get("/admin/analytics/forecast", { params: { range: "30d" } }),
            api.get("/admin/analytics/prescriptive", {
              params: { range: "30d" },
            }),
          ];
          const [resOverview, resForecast, resPrescriptive] =
            await Promise.allSettled(requests);

          const ov =
            resOverview.status === "fulfilled" ? resOverview.value?.data : null;
          const fc =
            resForecast.status === "fulfilled" ? resForecast.value?.data : null;

          const pr =
            resPrescriptive.status === "fulfilled"
              ? resPrescriptive.value?.data
              : null;

          setOverview(ov || null);
          setForecast(fc || null);

          const prescriptiveOk =
            pr &&
            (Array.isArray(pr.insights) ||
              Array.isArray(pr.recommendations) ||
              Array.isArray(pr.actions));

          if (prescriptiveOk) {
            setPrescriptive(pr);
            setPrescriptiveUnavailable(false);
          } else {
            setPrescriptive(null);
            setPrescriptiveUnavailable(true);
          }
        } catch {
          setOverview(null);
          setForecast(null);
          setPrescriptive(null);
          setPrescriptiveUnavailable(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [datePreset, cityFilter, categoryFilter, statusFilter]);

  // Extract available filter options from data
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch all listings to get available cities and categories
        const response = await api.get("/admin/listings", { 
          params: { limit: 1000, status: "active" } 
        });
        
        if (response.data?.listings) {
          const listings = response.data.listings;
          
          // Extract unique cities
          const cities = [...new Set(listings.map(l => l.city).filter(Boolean))];
          setAvailableCities(cities.sort());
          
          // Extract unique categories
          const categories = [...new Set(listings.map(l => l.category).filter(Boolean))];
          setAvailableCategories(categories.sort());
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    
    fetchFilterOptions();
  }, []);

  const occupancySeries = useMemo(
    () => overview?.occupancySeries || forecast?.occupancySeries || [],
    [overview, forecast]
  );

  const bookingsByType = useMemo(
    () => overview?.bookingsByType || [],
    [overview]
  );

  const demandCycles = useMemo(
    () => forecast?.demandCycles || [],
    [forecast]
  );

  const demandSummary = useMemo(() => {
    if (!demandCycles || demandCycles.length === 0) return null;
    let peak = demandCycles[0];
    let low = demandCycles[0];
    demandCycles.forEach((d) => {
      if (d.value > peak.value) peak = d;
      if (d.value < low.value) low = d;
    });
    return { peakLabel: peak.label, lowLabel: low.label };
  }, [demandCycles]);

  const highRiskPeriods = useMemo(
    () => forecast?.highRiskPeriods || [],
    [forecast]
  );

  const descriptiveKpi = {
    avgOccupancy: overview?.avgOccupancy || "0%",
    totalBookings: overview?.totalBookings || 0,
    totalRevenue: overview?.totalRevenueFormatted || "₱0",
    activeUsers: overview?.activeUsers || 0,
  };

  const predictiveKpi = {
    nextPeakDay: forecast?.nextPeakDay || "-",
    nextPeakHour: forecast?.nextPeakHour || "",
    projectedOccupancy: forecast?.projectedOccupancy || "0%",
    projectedPeakDemandIndex:
      demandCycles && demandCycles.length
        ? Math.max(...demandCycles.map((d) => Number(d.value) || 0))
        : 0,
  };

  const prescriptiveFromDb = useMemo(() => {
    const list =
      prescriptive?.insights ||
      prescriptive?.recommendations ||
      prescriptive?.actions ||
      [];
    if (!Array.isArray(list)) return [];
    return list
      .map((x, idx) => {
        const key = x.key || x.id || `db-${idx + 1}`;
        const severity =
          (x.severity || x.level || x.priority || "").toString().toLowerCase() ||
          "medium";
        const title = x.title || x.name || "Recommendation";
        const description = x.description || x.rationale || x.summary || "";
        const actions = Array.isArray(x.actions)
          ? x.actions
          : Array.isArray(x.steps)
          ? x.steps
          : Array.isArray(x.items)
          ? x.items
          : [];
        const tags = Array.isArray(x.tags) ? x.tags : [];
        const kpis = x.kpis && typeof x.kpis === "object" ? x.kpis : null;
        return { key, severity, title, description, actions, tags, kpis };
      })
      .filter((x) => x.title || x.description || (x.actions || []).length);
  }, [prescriptive]);

  const prescriptiveKpisFromDb = useMemo(() => {
    const summary = prescriptive?.summary || prescriptive?.kpis || null;
    if (!summary || typeof summary !== "object") return null;
    const recommendedActions =
      summary.recommendedActions ?? summary.actionsCount ?? summary.count ?? null;
    const estimatedRevenueLift =
      summary.estimatedRevenueLift ?? summary.revenueLift ?? null;
    const estimatedOccupancyLift =
      summary.estimatedOccupancyLift ?? summary.occupancyLift ?? null;
    const riskScore = summary.riskScore ?? summary.risk ?? null;
    return {
      recommendedActions:
        recommendedActions == null ? null : Number(recommendedActions),
      estimatedRevenueLift,
      estimatedOccupancyLift,
      riskScore,
    };
  }, [prescriptive]);

  const prescriptiveKpiCards = useMemo(() => {
    const actionsCount =
      prescriptiveKpisFromDb?.recommendedActions != null
        ? prescriptiveKpisFromDb.recommendedActions
        : prescriptiveFromDb.length;

    const revLift =
      prescriptiveKpisFromDb?.estimatedRevenueLift != null
        ? prescriptiveKpisFromDb.estimatedRevenueLift
        : null;

    const occLift =
      prescriptiveKpisFromDb?.estimatedOccupancyLift != null
        ? prescriptiveKpisFromDb.estimatedOccupancyLift
        : null;

    const riskScore =
      prescriptiveKpisFromDb?.riskScore != null
        ? prescriptiveKpisFromDb.riskScore
        : null;

    return { actionsCount, revLift, occLift, riskScore };
  }, [prescriptiveFromDb.length, prescriptiveKpisFromDb]);

  const rows = useMemo(
    () =>
      occupancySeries.map((d, index) => {
        const rawOcc = Number(d.occupancy ?? 0);
        const rawFc = Number(d.forecast ?? rawOcc);
        const isFraction = Math.max(rawOcc, rawFc) <= 1.5;

        const occ = isFraction ? rawOcc * 100 : rawOcc;
        const fc = isFraction ? rawFc * 100 : rawFc;

        return {
          id: index + 1,
          label: d.label,
          occupancy: occ,
          forecast: fc,
          delta: fc - occ,
        };
      }),
    [occupancySeries]
  );

  const filteredRows = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (r) =>
          String(r.label ?? "").toLowerCase().includes(q) ||
          String(r.id).toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "occDesc":
        list.sort((a, b) => b.occupancy - a.occupancy);
        break;
      case "forecastDesc":
        list.sort((a, b) => b.forecast - a.forecast);
        break;
      case "deltaDesc":
        list.sort((a, b) => b.delta - a.delta);
        break;
      default:
        break;
    }

    return list;
  }, [rows, search, sortBy]);

  const exportCSV = () => {
    const headers = [
      "Day",
      "Actual occupancy (%)",
      "Forecast occupancy (%)",
      "Gap (forecast - actual)",
    ];
    const body = filteredRows.map((r) => [
      r.label,
      r.occupancy,
      r.forecast,
      r.delta,
    ]);

    const csv = [headers, ...body]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin_analytics_descriptive_predictive.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 pb-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
            <div className="mt-1 text-xs text-muted-foreground">
              {rangeLabel(datePreset)}
              {datePreset === "1y" && yearUnavailable
                ? " • Yearly analytics is not available"
                : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:flex">
              {filteredRows.length} day(s)
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => reload()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reload
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={exportCSV}
                  disabled={!filteredRows.length}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full md:w-64">
                <Input
                  placeholder="Search day…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                <BarChart3 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>

              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Time filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 1 day</SelectItem>
                  <SelectItem value="30d">Last 1 month</SelectItem>
                  <SelectItem value="1y">Last 1 year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="City filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {availableCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Category filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Original order</SelectItem>
                  <SelectItem value="occDesc">
                    Highest actual occupancy
                  </SelectItem>
                  <SelectItem value="forecastDesc">Highest forecast</SelectItem>
                  <SelectItem value="deltaDesc">Largest forecast gap</SelectItem>
                </SelectContent>
              </Select>
              
              {(cityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCityFilter("all");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {datePreset === "1y" && yearUnavailable ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Yearly analytics is not available. Showing last 1 month data
                instead.
              </div>
            ) : null}

            {rangeError && !permissionError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {rangeError}
              </div>
            ) : null}
            
            {(cityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {cityFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    City: {cityFilter}
                  </Badge>
                )}
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {categoryFilter}
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="descriptive" className="space-y-4">
          <TabsList className="bg-slate-100/80">
            <TabsTrigger
              value="descriptive"
              className="data-[state=active]:bg-white"
            >
              Descriptive analytics
            </TabsTrigger>
            <TabsTrigger
              value="predictive"
              className="data-[state=active]:bg-white"
            >
              Predictive analytics
            </TabsTrigger>
            <TabsTrigger
              value="prescriptive"
              className="data-[state=active]:bg-white"
            >
              Prescriptive analytics
            </TabsTrigger>
            <TabsTrigger
              value="demographics"
              className="data-[state=active]:bg-white"
            >
              Demographics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="descriptive" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                icon={<Activity className="h-5 w-5 text-brand" />}
                label="Average occupancy"
                value={descriptiveKpi.avgOccupancy}
              />
              <Kpi
                icon={<CalendarDays className="h-5 w-5 text-brand" />}
                label="Total bookings"
                value={fmtNumber(descriptiveKpi.totalBookings)}
              />
              <Kpi
                icon={<CreditCard className="h-5 w-5 text-brand" />}
                label="Payments recorded"
                value={descriptiveKpi.totalRevenue}
              />
              <Kpi
                icon={<Users className="h-5 w-5 text-brand" />}
                label="Active users"
                value={fmtNumber(descriptiveKpi.activeUsers)}
              />
            </div>

            <Card>
              <CardContent className="py-3 text-xs sm:text-sm text-muted-foreground">
                This view summarizes what has already happened in the selected
                time filter. Occupancy is normalized from 0 to 100 where 100
                represents the busiest day.
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm text-muted-foreground">
                      Daily occupancy trend
                    </CardTitle>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300"
                          aria-label="How is this calculated?"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Occupancy is based on bookings per day within the
                        selected range. If values are provided as fractions
                        (0–1), they are converted to percent (0–100).
                      </TooltipContent>
                    </UiTooltip>
                  </div>
                  <div className="flex items-center gap-3 pr-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex h-2 w-4 rounded-full bg-brand" />
                      <span>Actual</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex h-2 w-4 rounded-full bg-slate-400" />
                      <span>Forecast</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-4">
                  <div className="h-[260px] text-slate-700">
                    <LineChartPercent
                      data={occupancySeries}
                      xKey="label"
                      actualKey="occupancy"
                      forecastKey="forecast"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Bookings by workspace type
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground pr-2">
                    By booking count
                  </span>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-4">
                  <div className="h-[260px] text-slate-700">
                    <BarChartCount
                      data={bookingsByType}
                      xKey="type"
                      yKey="bookings"
                      valueLabel="Bookings"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                icon={<TrendingUp className="h-5 w-5 text-brand" />}
                label="Next peak day"
                value={predictiveKpi.nextPeakDay}
              />
              <Kpi
                icon={<Clock className="h-5 w-5 text-brand" />}
                label="Peak demand window"
                value={predictiveKpi.nextPeakHour}
              />
              <Kpi
                icon={<Percent className="h-5 w-5 text-brand" />}
                label="Projected occupancy"
                value={predictiveKpi.projectedOccupancy}
              />
              <Kpi
                icon={<Activity className="h-5 w-5 text-brand" />}
                label="Peak demand index"
                value={fmtNumber(predictiveKpi.projectedPeakDemandIndex)}
              />
            </div>

            <Card>
              <CardContent className="py-3 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                <p>
                  Forecasts are generated from recent booking history in the
                  selected time filter. Values are normalized and converted to
                  percent when needed.
                </p>
                <p>
                  Based on this data, demand is expected to peak on{" "}
                  <span className="font-medium">{predictiveKpi.nextPeakDay}</span>{" "}
                  between{" "}
                  <span className="font-medium">
                    {predictiveKpi.nextPeakHour}
                  </span>{" "}
                  at roughly{" "}
                  <span className="font-medium">
                    {predictiveKpi.projectedOccupancy}
                  </span>{" "}
                  occupancy.
                  {demandSummary && (
                    <>
                      {" "}
                      Within a day,{" "}
                      <span className="font-medium">
                        {demandSummary.peakLabel}
                      </span>{" "}
                      is typically the busiest window, while{" "}
                      <span className="font-medium">{demandSummary.lowLabel}</span>{" "}
                      tends to be the quietest.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1 flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Demand cycles by time of day
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground pr-2">
                    Demand index
                  </span>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-4">
                  <div className="h-[260px] text-slate-700">
                    <BarChartCount
                      data={demandCycles}
                      xKey="label"
                      yKey="value"
                      valueLabel="Demand index"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    High-risk periods
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    {highRiskPeriods.map((p, idx) => {
                      const isOver = p.kind === "over";
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            isOver ? "bg-rose-50" : "bg-amber-50"
                          }`}
                        >
                          <div>
                            <p
                              className={`text-xs font-semibold ${
                                isOver ? "text-rose-800" : "text-amber-800"
                              }`}
                            >
                              {p.label}
                            </p>
                            <p
                              className={`text-[11px] ${
                                isOver ? "text-rose-700" : "text-amber-700"
                              }`}
                            >
                              {p.description}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${
                              isOver
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {p.level}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base">
                      Day-level occupancy and forecast
                    </CardTitle>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300"
                          aria-label="Forecast methodology"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Each row shows how busy a specific day was and how the
                        forecast compares.
                      </TooltipContent>
                    </UiTooltip>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {filteredRows.length} day(s)
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="rounded-md border border-charcoal/20 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-20">
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox />
                        </TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Actual occupancy</TableHead>
                        <TableHead>Forecast occupancy</TableHead>
                        <TableHead>Forecast gap</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No data.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((r) => (
                          <TableRow key={r.id} className="hover:bg-brand/10">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell className="font-medium">{r.label}</TableCell>
                            <TableCell>{fmtPercent(r.occupancy)}</TableCell>
                            <TableCell>{fmtPercent(r.forecast)}</TableCell>
                            <TableCell
                              className={
                                r.delta >= 0
                                  ? "text-emerald-700 text-sm"
                                  : "text-rose-700 text-sm"
                              }
                            >
                              {r.delta >= 0 ? "+" : ""}
                              {fmtPercent(Math.abs(r.delta))}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActive(r);
                                  setOpenSheet(true);
                                }}
                              >
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {permissionError && (
                  <div className="mt-4 text-sm text-red-600">
                    Missing or insufficient permissions.
                  </div>
                )}

                {!loading && filteredRows.length > 0 && (
                  <div className="flex items-center justify-between py-3 text-xs text-muted-foreground">
                    <div>0 row(s) hidden by filters</div>
                    <Button size="sm" variant="outline" onClick={exportCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptive" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi
                icon={<TrendingUp className="h-5 w-5 text-brand" />}
                label="Recommended actions"
                value={fmtNumber(prescriptiveKpiCards.actionsCount)}
              />
              <Kpi
                icon={<Percent className="h-5 w-5 text-brand" />}
                label="Projected occupancy (context)"
                value={forecast?.projectedOccupancy || "0%"}
              />
              <Kpi
                icon={<Clock className="h-5 w-5 text-brand" />}
                label="Peak window (context)"
                value={predictiveKpi.nextPeakHour || "-"}
              />
              <Kpi
                icon={<Activity className="h-5 w-5 text-brand" />}
                label="Risk score (if provided)"
                value={
                  prescriptiveKpiCards.riskScore == null
                    ? "-"
                    : fmtNumber(prescriptiveKpiCards.riskScore)
                }
              />
            </div>

            <Card>
              <CardContent className="py-3 text-xs sm:text-sm text-muted-foreground">
                Prescriptive analytics is generated from database signals (bookings,
                occupancy, revenue, cancellations, and utilization patterns) for the
                selected time filter.
              </CardContent>
            </Card>

            {prescriptiveUnavailable ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Prescriptive analytics endpoint is not available. Add
                /admin/analytics/prescriptive on the backend to return
                recommendations derived from database data.
              </div>
            ) : null}

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Action plan</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {prescriptiveFromDb.length} item(s)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Loading recommendations…
                  </div>
                ) : prescriptiveFromDb.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No prescriptive recommendations for the selected time filter.
                  </div>
                ) : (
                  prescriptiveFromDb.map((i) => (
                    <div
                      key={i.key}
                      className={`rounded-xl border px-4 py-3 ${
                        i.severity === "high"
                          ? "border-rose-200 bg-rose-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-semibold ${
                              i.severity === "high"
                                ? "text-rose-800"
                                : "text-amber-800"
                            }`}
                          >
                            {i.title}
                          </div>
                          {i.description ? (
                            <div
                              className={`mt-1 text-xs ${
                                i.severity === "high"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {i.description}
                            </div>
                          ) : null}

                          {i.kpis ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {Object.entries(i.kpis).slice(0, 4).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="rounded-lg border border-black/5 bg-white/60 px-2 py-1"
                                >
                                  <div className="text-[10px] text-muted-foreground">
                                    {k}
                                  </div>
                                  <div className="text-xs font-medium text-ink">
                                    {typeof v === "number"
                                      ? fmtNumber(v)
                                      : String(v)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[11px] ${
                            i.severity === "high"
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-amber-300 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {String(i.severity || "").toUpperCase()}
                        </Badge>
                      </div>

                      {Array.isArray(i.tags) && i.tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {i.tags.slice(0, 6).map((t, idx) => (
                            <Badge key={`${i.key}-t-${idx}`} variant="secondary">
                              {String(t)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      {Array.isArray(i.actions) && i.actions.length ? (
                        <div className="mt-3 rounded-lg border border-black/5 bg-white/60 px-3 py-2">
                          <div className="text-[11px] font-medium text-ink">
                            Suggested steps
                          </div>
                          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground space-y-1">
                            {i.actions.map((a, idx) => (
                              <li key={`${i.key}-a-${idx}`}>{String(a)}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {(prescriptiveKpiCards.revLift != null ||
              prescriptiveKpiCards.occLift != null) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Estimated impact</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <KpiSmall
                    label="Estimated revenue lift"
                    value={
                      typeof prescriptiveKpiCards.revLift === "number"
                        ? `₱${fmtNumber(prescriptiveKpiCards.revLift)}`
                        : String(prescriptiveKpiCards.revLift ?? "-")
                    }
                  />
                  <KpiSmall
                    label="Estimated occupancy lift"
                    value={
                      typeof prescriptiveKpiCards.occLift === "number"
                        ? fmtPercent(normalizePercentMaybe(prescriptiveKpiCards.occLift))
                        : String(prescriptiveKpiCards.occLift ?? "-")
                    }
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="demographics" className="space-y-4">
            {demographics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Kpi
                    icon={<Users className="h-5 w-5 text-brand" />}
                    label="Listings with demographics"
                    value={`${demographics.metrics?.listingsWithDemographics || 0} / ${demographics.metrics?.totalListings || 0}`}
                  />
                  <Kpi
                    icon={<TrendingUp className="h-5 w-5 text-brand" />}
                    label="Most popular target"
                    value={demographics.metrics?.mostPopularIdealFor || "None"}
                  />
                  <Kpi
                    icon={<Activity className="h-5 w-5 text-brand" />}
                    label="Most popular work style"
                    value={demographics.metrics?.mostPopularWorkStyle || "None"}
                  />
                  <Kpi
                    icon={<BarChart3 className="h-5 w-5 text-brand" />}
                    label="Top industry"
                    value={demographics.metrics?.topIndustry || "None"}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Target Audience Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(demographics.bookingsByIdealFor || {})
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{key.replace(/-/g, ' ')}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-brand"
                                    style={{
                                      width: `${Math.min(100, (value / Math.max(...Object.values(demographics.bookingsByIdealFor))) * 100)}%`
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-semibold w-12 text-right">{value}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Work Style Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(demographics.bookingsByWorkStyle || {})
                          .sort((a, b) => b[1] - a[1])
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{key}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${Math.min(100, (value / Math.max(...Object.values(demographics.bookingsByWorkStyle))) * 100)}%`
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-semibold w-12 text-right">{value}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {demographics.topIndustries && demographics.topIndustries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Industries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Industry</TableHead>
                            <TableHead className="text-right">Listings</TableHead>
                            <TableHead className="text-right">Bookings</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {demographics.topIndustries.map((industry, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{industry.name}</TableCell>
                              <TableCell className="text-right">{industry.listingCount}</TableCell>
                              <TableCell className="text-right">{industry.bookingCount}</TableCell>
                              <TableCell className="text-right">₱{fmtNumber(industry.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue by Target Audience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(demographics.revenueByIdealFor || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{key.replace(/-/g, ' ')}</span>
                            <span className="text-sm font-semibold">₱{fmtNumber(value)}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No demographics data available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
          <SheetContent className="w-[420px] sm:w-[480px]">
            <SheetHeader>
              <SheetTitle>Day details</SheetTitle>
            </SheetHeader>

            {!active ? (
              <div className="py-10 text-center text-muted-foreground">
                No day selected.
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div>
                  <div className="text-sm text-muted-foreground">Day</div>
                  <div className="text-lg font-semibold">{active.label}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <KpiSmall
                    label="Actual occupancy"
                    value={fmtPercent(active.occupancy)}
                  />
                  <KpiSmall
                    label="Forecast occupancy"
                    value={fmtPercent(active.forecast)}
                  />
                  <KpiSmall
                    label="Forecast gap"
                    value={`${active.delta >= 0 ? "+" : ""}${fmtPercent(
                      Math.abs(active.delta)
                    )}`}
                  />
                </div>
              </div>
            )}

            <SheetFooter className="mt-2">
              <Button variant="outline" onClick={() => setOpenSheet(false)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <div className="rounded-xl bg-brand/20 p-2">{icon}</div>
        <div>
          <div className="text-2xl font-semibold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSmall({ label, value }) {
  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function LineChartPercent({
  data = [],
  xKey = "label",
  actualKey = "occupancy",
  forecastKey = "forecast",
}) {
  const allValues = data.flatMap((d) => [
    Number(d[actualKey] ?? 0),
    Number(d[forecastKey] ?? d[actualKey] ?? 0),
  ]);
  const maxRaw = allValues.length ? Math.max(...allValues) : 0;
  const isFraction = maxRaw > 0 && maxRaw <= 1.5;

  const normalized = data.map((d) => {
    const actual = Number(d[actualKey] ?? 0);
    const forecastRaw =
      d[forecastKey] === undefined || d[forecastKey] === null
        ? actual
        : Number(d[forecastKey]);
    const actualPct = isFraction ? actual * 100 : actual;
    const forecastPct = isFraction ? forecastRaw * 100 : forecastRaw;
    return { ...d, __actual: actualPct, __forecast: forecastPct };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={normalized}
        margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
        <XAxis
          dataKey={xKey}
          tickMargin={8}
          tickLine={false}
          axisLine={{ strokeOpacity: 0.4 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => fmtPercent(v)}
          tickMargin={8}
          width={52}
          tickLine={false}
          axisLine={{ strokeOpacity: 0.4 }}
          tick={{ fontSize: 11 }}
        />
        <RechartsTooltip
          formatter={(value, name) =>
            name === "Actual"
              ? [fmtPercent(value), "Actual"]
              : [fmtPercent(value), "Forecast"]
          }
          labelFormatter={(label) => label}
        />
        <Line
          type="monotone"
          dataKey="__actual"
          name="Actual"
          stroke="#2563EB"
          strokeWidth={2.4}
          dot={{ r: 3 }}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="__forecast"
          name="Forecast"
          stroke="#9CA3AF"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 2 }}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartCount({
  data = [],
  xKey = "label",
  yKey = "value",
  valueLabel = "Value",
}) {
  const values = data.map((d) => +d[yKey] || 0);
  const max = Math.max(...values, 1);
  const maxIndex = values.indexOf(max);

  const withFlags = data.map((d, i) => ({
    ...d,
    __value: +d[yKey] || 0,
    __isMax: i === maxIndex,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={withFlags}
        margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
        <XAxis
          dataKey={xKey}
          tickMargin={8}
          tickLine={false}
          axisLine={{ strokeOpacity: 0.4 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => fmtNumber(v)}
          tickMargin={8}
          width={60}
          tickLine={false}
          axisLine={{ strokeOpacity: 0.4 }}
          tick={{ fontSize: 11 }}
        />
        <RechartsTooltip
          formatter={(value) => [fmtNumber(value), valueLabel]}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="__value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {withFlags.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.__isMax ? "#2563EB" : "#6B7280"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}