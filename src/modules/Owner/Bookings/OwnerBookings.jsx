// src/modules/Owner/Bookings/OwnerBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  ChevronDown,
  ExternalLink,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
} from "lucide-react";
import OwnerShell from "../components/OwnerShell";
import api from "@/services/api";

export default function OwnerBookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  const navigate = useNavigate();

  const openBookingModal = async (bookingId) => {
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await api.get(`/owner/bookings/${bookingId}`);
      setSelectedBooking(res.data);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load booking details';
      alert(msg);
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBooking(null);
  };

  const handleMarkComplete = async (bookingId) => {
    if (!confirm('Mark this booking as completed? This will allow the guest to write a review.')) {
      return;
    }

    try {
      await api.post(`/owner/bookings/${bookingId}/complete`);
      // Refresh the list and update modal
      setRefreshKey(k => k + 1);
      if (selectedBooking) {
        setSelectedBooking(prev => ({ ...prev, status: 'completed' }));
      }
      alert('Booking marked as completed!');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to mark booking as completed';
      alert(msg);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    const statusLabels = {
      pending_payment: 'Pending Payment',
      paid: 'Paid',
      awaiting_payment: 'Awaiting Payment',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    const confirmMsg = `Change booking status to "${statusLabels[newStatus] || newStatus}"?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setStatusChangeLoading(true);
    try {
      await api.patch(`/owner/bookings/${bookingId}/status`, { status: newStatus });
      
      // Refresh the list and update modal
      setRefreshKey(k => k + 1);
      if (selectedBooking) {
        setSelectedBooking(prev => ({ ...prev, status: newStatus }));
      }
      
      alert(`Booking status changed to ${statusLabels[newStatus] || newStatus}!`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to change booking status';
      alert(msg);
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const baseHeaders = { "Cache-Control": "no-cache", Pragma: "no-cache" };
  const validate = (s) => s >= 200 && s < 300;

  const reqRows = () => ({
    params: {
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 12,
      _ts: Date.now(),
    },
    headers: baseHeaders,
    validateStatus: validate,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/owner/bookings/mine", reqRows());
        const data = res?.data || {};
        const arr = Array.isArray(data.items) ? data.items : [];
        const normalized = arr.map((x) => ({ id: x.id || x._id, ...x }));
        if (!cancelled) {
          setItems(normalized);
          setNextCursor(data.nextCursor || null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.message || e.message || "Failed to load bookings";
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
  }, [statusFilter, refreshKey]);

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const res = await api.get("/owner/bookings/mine", {
        ...reqRows(),
        params: { ...(reqRows().params || {}), cursor: nextCursor },
      });
      const data = res?.data || {};
      const more = Array.isArray(data.items) ? data.items : [];
      const normalized = more.map((x) => ({ id: x.id || x._id, ...x }));
      setItems((prev) => [...prev, ...normalized]);
      setNextCursor(data.nextCursor || null);
    } catch (e) {
      setErr((s) => s || (e?.response?.data?.message || e.message));
    }
  };

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = [...items];

    if (q) {
      arr = arr.filter((b) => {
        const listing = b.listing || b.listingRef || {};
        const t1 = (listing.shortDesc || listing.title || "").toLowerCase();
        const city = [listing.city, listing.region, listing.country].filter(Boolean).join(", ").toLowerCase();
        const guest = getGuestName(b).toLowerCase();
        return t1.includes(q) || city.includes(q) || guest.includes(q);
      });
    }

    const ts = (x) => (x ? new Date(x).getTime() || 0 : 0);
    const amount = (x) => Number(x.totalAmount || x.amount || 0);

    if (sortBy === "created_desc") arr.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
    if (sortBy === "created_asc") arr.sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    if (sortBy === "checkin_asc") arr.sort((a, b) => ts(a.checkIn || a.checkInDate) - ts(b.checkIn || b.checkInDate));
    if (sortBy === "checkin_desc") arr.sort((a, b) => ts(b.checkIn || b.checkInDate) - ts(a.checkIn || a.checkInDate));
    if (sortBy === "amount_desc") arr.sort((a, b) => amount(b) - amount(a));
    if (sortBy === "amount_asc") arr.sort((a, b) => amount(a) - amount(b));

    return arr;
  }, [items, sortBy, query]);

  const totals = useMemo(() => {
    const count = items.length;
    let revenue = 0;
    let guests = 0;
    items.forEach((b) => {
      revenue += Number(b.totalAmount || b.amount || 0);
      guests += Number(b.guests || b.seats || 0);
    });
    return { count, revenue, guests };
  }, [items]);

  const headerProps = {
    query,
    onQueryChange: setQuery,
    onRefresh: () => setRefreshKey((x) => x + 1),
  };

  const sidebarProps = { active: "bookings" };

  return (
    <OwnerShell
      navOpen={navOpen}
      onToggleNav={() => setNavOpen((v) => !v)}
      onCloseNav={() => setNavOpen(false)}
      headerProps={headerProps}
      sidebarProps={sidebarProps}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Bookings" value={totals.count} icon={CalendarIcon} />
        <KPI label="Revenue" value={fmtMoney(totals.revenue)} icon={CreditCard} prefix="PHP " />
        <KPI label="Guests" value={totals.guests} icon={Users} />
      </div>

      <div className="mt-6 rounded-xl ring-1 ring-slate-200 bg-white p-3 md:p-4 sticky top-14 z-10">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["all", "All"],
            ["pending_payment", "Pending Payment"],
            ["awaiting_payment", "Awaiting Payment"],
            ["paid", "Paid"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
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
          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate" />
            <div className="relative">
              <select
                className="appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_desc">Newest created</option>
                <option value="created_asc">Oldest created</option>
                <option value="checkin_asc">Check-in: soonest</option>
                <option value="checkin_desc">Check-in: latest</option>
                <option value="amount_desc">Amount: high → low</option>
                <option value="amount_asc">Amount: low → high</option>
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

      <div className="mt-6 rounded-xl ring-1 ring-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="border-b border-slate-200">
                <Th>Booking</Th>
                <Th>Listing</Th>
                <Th>Location</Th>
                <Th>Dates</Th>
                <Th className="text-right">Guests</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th>Created</Th>
                <Th className="w-24 text-right">Actions</Th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            ) : filteredSorted.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate">
                    No bookings to display.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filteredSorted.map((b) => (
                  <BookingRow key={b.id} booking={b} onView={openBookingModal} />
                ))}
              </tbody>
            )}
          </table>
        </div>
        {nextCursor && (
          <div className="p-3 border-t border-slate-200 bg-white text-center">
            <button
              onClick={loadMore}
              className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <BookingDetailsModal
          booking={selectedBooking}
          loading={modalLoading}
          statusChangeLoading={statusChangeLoading}
          onClose={closeModal}
          onMarkComplete={handleMarkComplete}
          onStatusChange={handleStatusChange}
        />
      )}
    </OwnerShell>
  );
}

function KPI({ label, value, icon: Icon, prefix = "" }) {
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
          {prefix}
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}

function StatusPill({ status }) {
  const norm = (status || "").toLowerCase();
  const map = {
    pending_payment: ["Pending Payment", "bg-amber-100 text-amber-800 ring-amber-200"],
    awaiting_payment: ["Awaiting Payment", "bg-orange-100 text-orange-800 ring-orange-200"],
    paid: ["Paid", "bg-blue-100 text-blue-800 ring-blue-200"],
    completed: ["Completed", "bg-emerald-100 text-emerald-800 ring-emerald-200"],
    cancelled: ["Cancelled", "bg-rose-100 text-rose-800 ring-rose-200"],
  };
  const [text, tone] = map[norm] || [status || "Unknown", "bg-slate-100 text-slate-700 ring-slate-200"];
  return <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ring-1 ${tone}`}>{text}</span>;
}

function BookingRow({ booking, onView }) {
  const listing = booking.listing || booking.listingRef || {};
  const city = [listing.city, listing.region, listing.country].filter(Boolean).join(", ");
  const guestName = getGuestName(booking) || "Guest";
  const currency = booking.currency || listing.currency || "PHP";
  const amount = booking.totalAmount || booking.amount || 0;

  const checkIn = booking.checkIn || booking.checkInDate;
  const checkOut = booking.checkOut || booking.checkOutDate;
  const hours = booking.hours || booking.durationHours;
  const nights = booking.nights || booking.durationNights;

  const dateLabel = fmtBookingRange(checkIn, checkOut, { hours, nights });

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50/50">
      <td className="px-3 py-2">
        <div className="font-medium truncate max-w-[200px]">{guestName}</div>
        <div className="text-[11px] text-slate mt-0.5 truncate max-w-[200px]">
          #{booking.code || booking.shortId || booking.id?.slice(-6) || "—"}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="font-medium truncate max-w-[260px]">
          {listing.shortDesc || listing.title || "Untitled listing"}
        </div>
        <div className="text-[11px] text-slate mt-0.5 truncate max-w-[260px]">
          {listing.category || "—"} • {listing.scope || "—"}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-slate">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {city || "—"}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate">
        <span className="inline-flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" /> {dateLabel || "—"}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-xs text-slate">
        <span className="inline-flex items-center gap-1 justify-end">
          <Users className="h-3.5 w-3.5" /> {booking.guests ?? booking.seats ?? 1}
        </span>
      </td>
      <td className="px-3 py-2">
        <StatusPill status={booking.status} />
      </td>
      <td className="px-3 py-2 text-right font-medium">
        {amount != null ? `${currency} ${fmtMoney(amount)}` : "—"}
      </td>
      <td className="px-3 py-2 text-xs text-slate">{fmtDate(booking.createdAt) || "—"}</td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onView?.(booking.id)}
          className="text-xs inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-white"
          title="View booking details"
        >
          View <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-200">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-3 bg-slate-100 animate-pulse rounded w-3/4" />
        </td>
      ))}
    </tr>
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

function fmtBookingRange(checkIn, checkOut, { hours, nights } = {}) {
  if (!checkIn && !checkOut) return null;
  const dIn = checkIn ? new Date(checkIn) : null;
  const dOut = checkOut ? new Date(checkOut) : null;

  const sameDay =
    dIn &&
    dOut &&
    dIn.getFullYear() === dOut.getFullYear() &&
    dIn.getMonth() === dOut.getMonth() &&
    dIn.getDate() === dOut.getDate();

  const fmt = (d, opts = {}) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          ...opts,
        })
      : null;

  if (hours && sameDay) {
    const tIn = fmt(dIn, { hour: "2-digit", minute: "2-digit" });
    const tOut = fmt(dOut, { hour: "2-digit", minute: "2-digit" });
    return `${fmt(dIn)} • ${tIn}–${tOut} (${hours}h)`;
  }

  if (dIn && dOut && !sameDay) {
    const lbl = `${fmt(dIn)} → ${fmt(dOut)}`;
    if (nights) return `${lbl} (${nights} nights)`;
    return lbl;
  }

  if (dIn && !dOut) return `From ${fmt(dIn)}`;
  if (!dIn && dOut) return `Until ${fmt(dOut)}`;
  return null;
}

function getGuestName(b) {
  if (!b) return "";
  return (
    b.guestName ||
    b.customerName ||
    b.clientName ||
    b.user?.fullName ||
    b.user?.name ||
    b.customer?.name ||
    ""
  );
}

function BookingDetailsModal({ booking, loading, statusChangeLoading, onClose, onMarkComplete, onStatusChange }) {
  if (!booking && !loading) return null;

  const listing = booking?.listing || booking?.listingRef || {};
  const user = booking?.user || {};
  const guestName = booking ? getGuestName(booking) || "Guest" : "Guest";
  const currency = booking?.currency || listing.currency || "PHP";
  const amount = booking?.totalAmount || booking?.amount || 0;

  const checkIn = booking?.checkIn || booking?.checkInDate;
  const checkOut = booking?.checkOut || booking?.checkOutDate;
  const hours = booking?.hours || booking?.durationHours;
  const nights = booking?.nights || booking?.durationNights;

  const dateLabel = fmtBookingRange(checkIn, checkOut, { hours, nights });
  const city = [listing.city, listing.region, listing.country].filter(Boolean).join(", ");

  const canComplete = booking?.status === 'paid' || booking?.status === 'confirmed' || booking?.status === 'checked_in';
  const currentStatus = booking?.status || 'pending';

  // Available status transitions based on current status
  const getAvailableStatuses = (current) => {
    const statuses = {
      paid: ['completed', 'cancelled'], // Paid bookings can be completed or cancelled
      pending_payment: ['cancelled'], // Pending payment can only be cancelled
      awaiting_payment: ['cancelled'], // Awaiting payment can only be cancelled
      completed: [], // Cannot change from completed
      cancelled: [], // Cannot change from cancelled
    };
    return statuses[current] || [];
  };

  const availableStatuses = getAvailableStatuses(currentStatus);

  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Booking Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-slate">Loading booking details...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status Badge and Change Status */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate">Current Status:</span>
                <StatusPill status={booking?.status} />
              </div>
              <div className="text-sm text-slate">
                #{booking?.code || booking?.shortId || booking?.id?.slice(-6) || "—"}
              </div>
            </div>

            {/* Status Change Section */}
            {availableStatuses.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">Change Booking Status</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate">Change to:</label>
                  <select
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onStatusChange(booking.id, e.target.value);
                        e.target.value = ''; // Reset selection
                      }
                    }}
                    disabled={statusChangeLoading}
                  >
                    <option value="">Select new status...</option>
                    {statusOptions
                      .filter(opt => availableStatuses.includes(opt.value))
                      .map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    }
                  </select>
                  {statusChangeLoading && (
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                  )}
                </div>
                <p className="text-xs text-slate mt-2">
                  {currentStatus === 'paid' && 'Mark the booking as completed when the guest checks out, or cancel it.'}
                  {currentStatus === 'pending_payment' && 'This booking is awaiting payment and can only be cancelled.'}
                  {currentStatus === 'awaiting_payment' && 'This booking is awaiting payment and can only be cancelled.'}
                </p>
              </div>
            )}

            {(currentStatus === 'completed' || currentStatus === 'cancelled') && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate">
                  This booking is {currentStatus} and cannot be changed.
                </p>
              </div>
            )}

            {/* Guest Information */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Guest Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Name:</span>
                  <span className="font-medium text-ink">{guestName}</span>
                </div>
                {user.email && (
                  <div className="flex justify-between">
                    <span className="text-slate">Email:</span>
                    <span className="font-medium text-ink">{user.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate">Guests:</span>
                  <span className="font-medium text-ink">{booking?.guests ?? booking?.seats ?? 1}</span>
                </div>
              </div>
            </div>

            {/* Listing Information */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Listing Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Title:</span>
                  <span className="font-medium text-ink">{listing.shortDesc || listing.title || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Category:</span>
                  <span className="font-medium text-ink">{listing.category || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Scope:</span>
                  <span className="font-medium text-ink">{listing.scope || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Location:</span>
                  <span className="font-medium text-ink">{city || "—"}</span>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Dates:</span>
                  <span className="font-medium text-ink">{dateLabel || "—"}</span>
                </div>
                {booking?.checkInTime && (
                  <div className="flex justify-between">
                    <span className="text-slate">Check-in Time:</span>
                    <span className="font-medium text-ink">{booking.checkInTime}</span>
                  </div>
                )}
                {booking?.checkOutTime && (
                  <div className="flex justify-between">
                    <span className="text-slate">Check-out Time:</span>
                    <span className="font-medium text-ink">{booking.checkOutTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate">Created:</span>
                  <span className="font-medium text-ink">{fmtDate(booking?.createdAt) || "—"}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Total Amount:</span>
                  <span className="font-semibold text-ink text-lg">{currency} {fmtMoney(amount)}</span>
                </div>
                {booking?.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-slate">Payment Method:</span>
                    <span className="font-medium text-ink">{booking.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
