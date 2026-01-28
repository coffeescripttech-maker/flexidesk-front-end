import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  SheetDescription,
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
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Clock3,
  Download,
  Flame,
  Info,
  Loader2,
  MoreHorizontal,
  Percent,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import api from "@/services/api";

async function loadData({ brand, branch, type, status, datePreset, dateFrom, dateTo }) {
  const res = await api.get("/admin/analytics/occupancy", {
    params: { brand, branch, type, status, datePreset, dateFrom, dateTo },
  });
  return res.data;
}

const pct = (n) => `${Math.round((n ?? 0) * 100)}%`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "Not available");

const DEFAULT_SUMMARY = {
  avgOccupancy: 0,
  peakHour: "",
  peakDay: "",
  underutilizedCount: 0,
  healthyCount: 0,
  totalCapacity: 0,
};

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function occBucket(avgOcc) {
  const v = avgOcc ?? 0;
  if (v < 0.25) return { key: "critical", label: "Critical", tone: "destructive" };
  if (v < 0.4) return { key: "low", label: "Low", tone: "secondary" };
  if (v < 0.7) return { key: "healthy", label: "Healthy", tone: "secondary" };
  return { key: "hot", label: "Hot", tone: "secondary" };
}

function recTextFromOcc(avgOcc) {
  const v = avgOcc ?? 0;
  if (v < 0.25) return "Consider promos, price adjustment, or repurpose to a smaller unit.";
  if (v < 0.4) return "Improve visibility, bundle amenities, or offer off-peak discounts.";
  if (v < 0.7) return "Maintain current setup; explore small pricing tests.";
  return "Consider dynamic pricing, capacity controls, or waitlist rules during peak hours.";
}

function isoToday() {
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminOccupancyReportPage() {
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [byHour, setByHour] = useState([]);
  const [byBranch, setByBranch] = useState([]);

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const [datePreset, setDatePreset] = useState("last30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortBy, setSortBy] = useState("recent");

  const [brandOptions, setBrandOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  const [openSheet, setOpenSheet] = useState(false);
  const [active, setActive] = useState(null);

  const invalidRange = useMemo(() => {
    if (datePreset !== "custom") return false;
    if (!dateFrom || !dateTo) return false;
    return new Date(dateFrom).getTime() > new Date(dateTo).getTime();
  }, [datePreset, dateFrom, dateTo]);

  const dateRangeLabel = useMemo(() => {
    if (datePreset !== "custom") return datePresetLabel(datePreset);
    const a = dateFrom || "—";
    const b = dateTo || "—";
    return `${a} to ${b}`;
  }, [datePreset, dateFrom, dateTo]);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setPermissionError(false);

      const data = await loadData({
        brand,
        branch,
        type,
        status,
        datePreset,
        dateFrom: datePreset === "custom" ? dateFrom : undefined,
        dateTo: datePreset === "custom" ? dateTo : undefined,
      });

      const incomingRows = data.rows || [];
      const computedTotalCap = incomingRows.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
      const computedHealthy = incomingRows.filter((r) => (r.avgOcc ?? 0) >= 0.4).length;

      setRows(incomingRows);
      setSummary({
        ...DEFAULT_SUMMARY,
        ...(data.summary || {}),
        totalCapacity: data?.summary?.totalCapacity ?? computedTotalCap,
        healthyCount: data?.summary?.healthyCount ?? computedHealthy,
      });
      setByHour(data.byHour || []);
      setByBranch(data.byBranch || []);
      setBrandOptions(data.brandOptions || []);
      setBranchOptions(data.branchOptions || []);
      setTypeOptions(data.typeOptions || []);
      setStatusOptions(data.statusOptions || []);
      setPermissionError(!!data.permissionError);
    } catch (err) {
      console.error("Failed to load occupancy report", err);
      setPermissionError(err?.response?.status === 403);
      setRows([]);
      setByHour([]);
      setByBranch([]);
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [brand, branch, type, status, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.brand?.toLowerCase().includes(q) ||
          r.branch?.toLowerCase().includes(q) ||
          r.id?.toLowerCase().includes(q)
      );
    }
    if (brand !== "all") list = list.filter((r) => r.brand === brand);
    if (branch !== "all") list = list.filter((r) => r.branch === branch);
    if (type !== "all") list = list.filter((r) => r.type === type);
    if (status !== "all") list = list.filter((r) => r.status === status);

    if (datePreset === "custom" && (dateFrom || dateTo)) {
      const fromMs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
      const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
      list = list.filter((r) => {
        const t = r?.updatedAt ? new Date(r.updatedAt).getTime() : null;
        if (!t) return false;
        if (fromMs && t < fromMs) return false;
        if (toMs && t > toMs) return false;
        return true;
      });
    }

    switch (sortBy) {
      case "occDesc":
        list.sort((a, b) => (b.avgOcc ?? 0) - (a.avgOcc ?? 0));
        break;
      case "occAsc":
        list.sort((a, b) => (a.avgOcc ?? 0) - (b.avgOcc ?? 0));
        break;
      case "capacityDesc":
        list.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
        break;
      default:
        list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }
    return list;
  }, [rows, search, brand, branch, type, status, sortBy, datePreset, dateFrom, dateTo]);

  const hiddenCount = useMemo(
    () => Math.max(0, rows.length - filtered.length),
    [rows.length, filtered.length]
  );

  const counts = useMemo(() => {
    const c = { critical: 0, low: 0, healthy: 0, hot: 0 };
    for (const r of filtered) {
      const b = occBucket(r.avgOcc);
      c[b.key] += 1;
    }
    return c;
  }, [filtered]);

  const focusList = useMemo(() => {
    const low = filtered
      .filter((r) => (r.avgOcc ?? 0) < 0.4)
      .sort((a, b) => (a.avgOcc ?? 0) - (b.avgOcc ?? 0))
      .slice(0, 5);
    const hot = filtered
      .filter((r) => (r.avgOcc ?? 0) >= 0.7)
      .sort((a, b) => (b.avgOcc ?? 0) - (a.avgOcc ?? 0))
      .slice(0, 5);
    return { low, hot };
  }, [filtered]);

  const exportCSV = () => {
    const headers = [
      "ID",
      "Workspace",
      "Brand",
      "Branch",
      "Type",
      "Capacity",
      "Avg Occupancy",
      "Peak Hour",
      "Status",
      "Updated",
    ];
    const body = filtered.map((r) => [
      r.id,
      r.name,
      r.brand,
      r.branch,
      r.type,
      r.capacity,
      pct(r.avgOcc),
      r.peak,
      r.status,
      fmtDate(r.updatedAt),
    ]);
    const csv = [headers, ...body]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "occupancy_report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setBrand("all");
    setBranch("all");
    setType("all");
    setStatus("all");
    setSortBy("recent");
    setDatePreset("last30");
    setDateFrom("");
    setDateTo("");
  };

  const showDetails = (r) => {
    setActive(r);
    setOpenSheet(true);
  };

  const pill = (label, value) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 bg-white px-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </span>
  );

  const onChangeDatePreset = (v) => {
    setDatePreset(v);
    if (v !== "custom") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    setDateFrom(isoDaysAgo(29));
    setDateTo(isoToday());
  };

  return (
    <div className="space-y-4">
      <HeaderBar
        title="Occupancy"
        subtitle="Monitor utilization across workspaces to optimize availability, pricing, and capacity planning."
        loading={loading}
        filteredCount={filtered.length}
        hiddenCount={hiddenCount}
        onReload={reload}
        onExport={exportCSV}
        exportDisabled={!filtered.length}
      />

      <Card className="border-charcoal/15">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate" />
                <Input
                  placeholder="Search workspace, brand, branch, ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pill("Range", dateRangeLabel)}
                {brand !== "all" && pill("Brand", brand)}
                {branch !== "all" && pill("Branch", branch)}
                {type !== "all" && pill("Type", type)}
                {status !== "all" && pill("Status", status)}
                {(search ||
                  brand !== "all" ||
                  branch !== "all" ||
                  type !== "all" ||
                  status !== "all" ||
                  sortBy !== "recent" ||
                  datePreset !== "last30" ||
                  (datePreset === "custom" && (dateFrom || dateTo))) && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-full">
                    Clear
                  </Button>
                )}
              </div>
              {invalidRange && (
                <div className="mt-2 text-xs text-red-600">
                  Invalid date range: From must be earlier than To.
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Select value={datePreset} onValueChange={onChangeDatePreset}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7">Last 7 days</SelectItem>
                    <SelectItem value="last30">Last 30 days</SelectItem>
                    <SelectItem value="last90">Last 90 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>

                {datePreset === "custom" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-charcoal/15 bg-white px-3 py-2">
                      <span className="text-xs text-muted-foreground">From</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-transparent text-sm outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-charcoal/15 bg-white px-3 py-2">
                      <span className="text-xs text-muted-foreground">To</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-transparent text-sm outline-none"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={loading || invalidRange}
                      onClick={reload}
                    >
                      Apply
                    </Button>
                  </div>
                )}

                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brandOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branchOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently updated</SelectItem>
                    <SelectItem value="occDesc">Highest occupancy</SelectItem>
                    <SelectItem value="occAsc">Lowest occupancy</SelectItem>
                    <SelectItem value="capacityDesc">Largest capacity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 lg:justify-end">
                <Badge variant="secondary" className="rounded-full">
                  {filtered.length} shown
                </Badge>
                {!loading && !permissionError && (
                  <>
                    <Badge className="rounded-full bg-red-50 text-red-700 hover:bg-red-50">
                      {counts.critical + counts.low} attention
                    </Badge>
                    <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      {counts.healthy + counts.hot} healthy
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {permissionError ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm text-red-700">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <div className="font-medium">Insufficient permissions</div>
                <div className="text-red-700/80">
                  You don’t have access to occupancy analytics. Ask an admin to grant the required role/permission.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <Kpi icon={<Percent className="h-5 w-5 text-brand" />} label="Avg Occupancy" value={pct(summary.avgOccupancy)} sub="Weighted across workspaces" />
        <Kpi icon={<Clock3 className="h-5 w-5 text-brand" />} label="Peak Hour" value={summary.peakHour || "—"} sub="Highest utilization hour" />
        <Kpi icon={<Flame className="h-5 w-5 text-brand" />} label="Peak Day" value={summary.peakDay || "—"} sub="Busiest day in range" />
        <Kpi icon={<TrendingDown className="h-5 w-5 text-brand" />} label="Underutilized" value={summary.underutilizedCount} sub="Below 40% avg occupancy" />
        <Kpi icon={<BarChart3 className="h-5 w-5 text-brand" />} label="Total Capacity" value={summary.totalCapacity || 0} sub="Seats/slots tracked" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <Card className="xl:col-span-7 min-h-[280px] border-charcoal/15">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm text-muted-foreground">Utilization by Hour</CardTitle>
                <div className="text-[11px] text-muted-foreground">
                  Percentage of occupied capacity per hour (aggregated)
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4" />
                Best for staffing and operating hours
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[220px]">
            <MiniLineChart data={byHour} xKey="hour" yKey="rate" />
          </CardContent>
        </Card>

        <Card className="xl:col-span-5 min-h-[280px] border-charcoal/15">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm text-muted-foreground">Average Occupancy by Branch</CardTitle>
                <div className="text-[11px] text-muted-foreground">
                  Branch-level average for the selected period
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Compare branch performance
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[220px]">
            <MiniBarChart data={byBranch} xKey="branch" yKey="occ" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <Card className="xl:col-span-5 border-charcoal/15">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm">Actionable Insights</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Focus list aligns with utilization goals: reduce low-usage spaces and protect peak availability.
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {focusList.low.length + focusList.hot.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <FocusBlock
              title="Needs attention (lowest occupancy)"
              icon={<TrendingDown className="h-4 w-4" />}
              items={focusList.low}
              emptyText="No underutilized workspaces in the current selection."
              onSelect={showDetails}
            />
            <FocusBlock
              title="High demand (protect availability)"
              icon={<Flame className="h-4 w-4" />}
              items={focusList.hot}
              emptyText="No high-demand workspaces in the current selection."
              onSelect={showDetails}
              hot
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-7 border-charcoal/15">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">By Workspace</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Review utilization per workspace and drill down for operational decisions.
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length} result(s)</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border border-charcoal/20 max-h-[560px] overflow-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox disabled />
                    </TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Avg Occ</TableHead>
                    <TableHead className="text-right">Peak Hour</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">
                        <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                        Loading
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        No workspaces found. Try adjusting filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const bucket = occBucket(r.avgOcc);
                      const tone =
                        bucket.key === "critical"
                          ? "destructive"
                          : (r.avgOcc ?? 0) < 0.4
                          ? "secondary"
                          : "secondary";

                      return (
                        <TableRow key={r.id} className="hover:bg-brand/10">
                          <TableCell>
                            <Checkbox />
                          </TableCell>

                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="rounded bg-brand/20 px-2 py-0.5 text-[11px] text-brand">
                                {r.id}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate">{r.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {r.status || "—"}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>{r.brand}</TableCell>
                          <TableCell>{r.branch}</TableCell>
                          <TableCell>{r.type}</TableCell>

                          <TableCell className="text-right tabular-nums">
                            {r.capacity ?? 0}
                          </TableCell>

                          <TableCell className="text-right tabular-nums">
                            {pct(r.avgOcc)}
                          </TableCell>

                          <TableCell className="text-right tabular-nums">
                            {r.peak || "—"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={tone}
                              className={cx(
                                "rounded-full",
                                bucket.key === "hot" && "bg-amber-50 text-amber-800 hover:bg-amber-50",
                                bucket.key === "healthy" && "bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
                                bucket.key === "low" && "bg-slate-50 text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {bucket.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(r.updatedAt)}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => showDetails(r)}
                              className="rounded-full"
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3 text-xs text-muted-foreground">
                <div>{hiddenCount} row(s) hidden by filters</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={exportCSV} disabled={!filtered.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent className="w-[520px] sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Workspace Occupancy</SheetTitle>
            <SheetDescription>Operational signals and recommendations for the selected period.</SheetDescription>
          </SheetHeader>

          {!active ? (
            <div className="py-10 text-center text-muted-foreground">No workspace selected.</div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-charcoal/15 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Workspace</div>
                    <div className="text-lg font-semibold truncate">{active.name}</div>
                    <div className="text-xs text-muted-foreground">{active.id}</div>
                  </div>
                  <Badge
                    className={cx(
                      "rounded-full",
                      (active.avgOcc ?? 0) < 0.25 && "bg-red-50 text-red-700 hover:bg-red-50",
                      (active.avgOcc ?? 0) >= 0.25 && (active.avgOcc ?? 0) < 0.4 && "bg-slate-50 text-slate-700 hover:bg-slate-50",
                      (active.avgOcc ?? 0) >= 0.4 && (active.avgOcc ?? 0) < 0.7 && "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
                      (active.avgOcc ?? 0) >= 0.7 && "bg-amber-50 text-amber-800 hover:bg-amber-50"
                    )}
                  >
                    {occBucket(active.avgOcc).label}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <KpiSmall label="Avg Occupancy" value={pct(active.avgOcc)} />
                  <KpiSmall label="Peak Hour" value={active.peak || "—"} />
                  <KpiSmall label="Branch" value={active.branch || "—"} />
                  <KpiSmall label="Type" value={active.type || "—"} />
                  <KpiSmall label="Capacity" value={active.capacity ?? 0} />
                  <KpiSmall label="Status" value={active.status || "—"} />
                </div>
              </div>

              <div className="rounded-xl border border-charcoal/15 bg-white p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">Recommendation</div>
                    <div className="text-xs text-muted-foreground">
                      {recTextFromOcc(active.avgOcc)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-charcoal/10 bg-brand/5 p-3 text-xs text-muted-foreground">
                  <Info className="inline h-4 w-4 mr-1 text-brand" />
                  Last updated {fmtDate(active.updatedAt)}
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpenSheet(false)} className="rounded-full">
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HeaderBar({ title, subtitle, loading, filteredCount, hiddenCount, onReload, onExport, exportDisabled }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-full">
            {filteredCount} shown
          </Badge>
          <span>{hiddenCount} hidden by filters</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReload} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </>
          )}
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
            <DropdownMenuItem onClick={onExport} disabled={exportDisabled}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function datePresetLabel(v) {
  if (v === "last7") return "Last 7 days";
  if (v === "last30") return "Last 30 days";
  if (v === "last90") return "Last 90 days";
  return "Custom";
}

function Kpi({ icon, label, value, sub }) {
  return (
    <Card className="overflow-hidden border-charcoal/15">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand/20 p-2">{icon}</div>
          <div>
            <div className="text-2xl font-semibold">{value}</div>
            {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSmall({ label, value }) {
  return (
    <Card className="border-charcoal/15">
      <CardHeader className="py-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FocusBlock({ title, icon, items, emptyText, onSelect, hot }) {
  return (
    <div className="rounded-xl border border-charcoal/15 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cx(
              "inline-flex items-center justify-center rounded-lg p-1.5",
              hot ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"
            )}
          >
            {icon}
          </span>
          {title}
        </div>
        <Badge variant="secondary" className="rounded-full">
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              className="w-full text-left rounded-lg border border-charcoal/10 bg-white hover:bg-brand/5 transition px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.branch} • {r.type} • cap {r.capacity ?? 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{pct(r.avgOcc)}</div>
                  <div className="text-[11px] text-muted-foreground">{r.peak || "—"}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniLineChart({ data = [], xKey = "x", yKey = "y" }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Not enough data for this period yet.
      </div>
    );
  }

  const percentFormatter = (value) => `${Math.round((value ?? 0) * 100)}%`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="occ-line-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10 }}
          tickMargin={8}
          tickFormatter={(v) => String(v).replace(":00", "")}
        />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={percentFormatter} width={40} domain={[0, 1]} />
        <Tooltip formatter={(value) => percentFormatter(value)} labelFormatter={(label) => `Hour: ${label}`} />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke="#4f46e5"
          fill="url(#occ-line-area)"
          strokeWidth={2}
          dot={{ r: 2, fill: "#4f46e5" }}
          activeDot={{ r: 3, fill: "#4f46e5" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MiniBarChart({ data = [], xKey = "x", yKey = "y" }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Not enough data for this period yet.
      </div>
    );
  }

  const percentFormatter = (value) => `${Math.round((value ?? 0) * 100)}%`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
        <CartesianGrid stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 10 }} tickMargin={8} interval={0} angle={-25} textAnchor="end" />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={percentFormatter} width={40} domain={[0, 1]} />
        <Tooltip formatter={(value) => percentFormatter(value)} labelFormatter={(label) => `Branch: ${label}`} />
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]} fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}