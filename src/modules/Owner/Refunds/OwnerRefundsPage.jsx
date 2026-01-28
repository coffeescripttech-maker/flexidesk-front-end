// src/modules/Owner/Refunds/OwnerRefundsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  ChevronDown,
  Download,
  Calendar as CalendarIcon,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import OwnerShell from "../components/OwnerShell";
import RefundRequestCard from "./RefundRequestCard";
import ApproveRefundModal from "./ApproveRefundModal";
import RejectRefundModal from "./RejectRefundModal";
import api from "@/services/api";

export default function OwnerRefundsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("requested_desc");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [listings, setListings] = useState([]);
  
  // Modal states
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const baseHeaders = { "Cache-Control": "no-cache", Pragma: "no-cache" };
  const validate = (s) => s >= 200 && s < 300;

  // Fetch refund requests
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = {
          _ts: Date.now(),
        };
        
        if (statusFilter !== "all") params.status = statusFilter;
        if (listingFilter !== "all") params.listingId = listingFilter;
        if (dateRange !== "all") {
          const now = new Date();
          if (dateRange === "today") {
            params.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          } else if (dateRange === "week") {
            params.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
          } else if (dateRange === "month") {
            params.startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
          }
        }

        const res = await api.get("/owner/refunds", {
          params,
          headers: baseHeaders,
          validateStatus: validate,
        });
        
        const data = res?.data || {};
        const arr = Array.isArray(data.requests) ? data.requests : [];
        const normalized = arr.map((x) => ({ id: x.id || x._id, ...x }));
        
        if (!cancelled) {
          setRequests(normalized);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.message || e.message || "Failed to load refund requests";
          setErr(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, listingFilter, dateRange, refreshKey]);

  // Fetch owner listings for filter
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
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = [...requests];

    if (q) {
      arr = arr.filter((r) => {
        const client = r.clientName || r.client?.fullName || "";
        const listing = r.listingTitle || r.listing?.title || "";
        const code = r.bookingCode || r.booking?.code || "";
        return (
          client.toLowerCase().includes(q) ||
          listing.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q)
        );
      });
    }

    const ts = (x) => (x ? new Date(x).getTime() || 0 : 0);
    const amount = (x) => Number(x.refundCalculation?.finalRefund || 0);

    if (sortBy === "requested_desc") arr.sort((a, b) => ts(b.requestedAt) - ts(a.requestedAt));
    if (sortBy === "requested_asc") arr.sort((a, b) => ts(a.requestedAt) - ts(b.requestedAt));
    if (sortBy === "amount_desc") arr.sort((a, b) => amount(b) - amount(a));
    if (sortBy === "amount_asc") arr.sort((a, b) => amount(a) - amount(b));

    return arr;
  }, [requests, sortBy, query]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => ["approved", "processing", "completed"].includes(r.status)).length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const total = approved + rejected;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    const totalRefunded = requests
      .filter((r) => ["approved", "processing", "completed"].includes(r.status))
      .reduce((sum, r) => sum + Number(r.refundCalculation?.finalRefund || 0), 0);

    return { pending, approvalRate, totalRefunded };
  }, [requests]);

  const handleApprove = (request) => {
    setApproveModal(request);
  };

  const handleReject = (request) => {
    setRejectModal(request);
  };

  const handleApproveSuccess = () => {
    setApproveModal(null);
    setRefreshKey((x) => x + 1);
  };

  const handleRejectSuccess = () => {
    setRejectModal(null);
    setRefreshKey((x) => x + 1);
  };

  const handleExport = () => {
    // Generate CSV export
    const headers = ["Date", "Client", "Listing", "Booking Code", "Amount", "Refund", "Status", "Reason"];
    const rows = filteredSorted.map((r) => [
      fmtDate(r.requestedAt),
      r.clientName || r.client?.fullName || "—",
      r.listingTitle || r.listing?.title || "—",
      r.bookingCode || r.booking?.code || "—",
      r.bookingAmount || 0,
      r.refundCalculation?.finalRefund || 0,
      r.status || "—",
      r.cancellationReason || "—",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund-requests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerProps = {
    query,
    onQueryChange: setQuery,
    onRefresh: () => setRefreshKey((x) => x + 1),
  };

  const sidebarProps = { active: "refunds" };

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
        <KPI label="Pending Requests" value={stats.pending} icon={Clock} color="amber" />
        <KPI label="Approval Rate" value={`${stats.approvalRate}%`} icon={TrendingUp} color="blue" />
        <KPI label="Total Refunded" value={fmtMoney(stats.totalRefunded)} icon={DollarSign} prefix="PHP " color="emerald" />
      </div>

      {/* Filter Bar */}
      <div className="mt-6 rounded-xl ring-1 ring-slate-200 bg-white p-3 md:p-4 sticky top-14 z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["processing", "Processing"],
              ["completed", "Completed"],
              ["rejected", "Rejected"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={[
                  "rounded-full px-3 py-1 text-sm ring-1 transition-colors",
                  statusFilter === val
                    ? "bg-ink text-white ring-ink"
                    : "bg-white text-ink ring-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Listing Filter */}
            <div className="relative">
              <select
                className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
                value={listingFilter}
                onChange={(e) => setListingFilter(e.target.value)}
              >
                <option value="all">All Listings</option>
                {listings.map((l) => (
                  <option key={l._id || l.id} value={l._id || l.id}>
                    {l.shortDesc || l.title || "Untitled"}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <select
                className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
            </div>

            {/* Sort */}
            <Filter className="h-4 w-4 text-slate" />
            <div className="relative">
              <select
                className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="requested_desc">Newest first</option>
                <option value="requested_asc">Oldest first</option>
                <option value="amount_desc">Amount: high → low</option>
                <option value="amount_asc">Amount: low → high</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* Refund Requests List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : filteredSorted.length === 0 ? (
          <div className="rounded-xl ring-1 ring-slate-200 bg-white p-10 text-center text-slate">
            No refund requests to display.
          </div>
        ) : (
          filteredSorted.map((request) => (
            <RefundRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {approveModal && (
        <ApproveRefundModal
          request={approveModal}
          onClose={() => setApproveModal(null)}
          onSuccess={handleApproveSuccess}
        />
      )}

      {rejectModal && (
        <RejectRefundModal
          request={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={handleRejectSuccess}
        />
      )}
    </OwnerShell>
  );
}

function KPI({ label, value, icon: Icon, prefix = "", color = "slate" }) {
  const colorMap = {
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 flex items-center gap-3">
      {Icon && (
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div>
        <div className="text-xs text-slate">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-ink">
          {prefix}
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
        <div className="h-8 w-24 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

function fmtMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
