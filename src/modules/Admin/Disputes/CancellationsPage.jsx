import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  RefreshCw,
  Download,
  Eye,
  User,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingDown,
} from "lucide-react";
import api from "@/services/api";

const STATUS_CONFIG = {
  pending: { label: "Pending", badge: "secondary", icon: Clock },
  approved: { label: "Approved", badge: "default", icon: CheckCircle },
  rejected: { label: "Rejected", badge: "destructive", icon: XCircle },
  processing: { label: "Processing", badge: "secondary", icon: Loader2 },
  completed: { label: "Completed", badge: "default", icon: CheckCircle },
  failed: { label: "Failed", badge: "destructive", icon: AlertCircle },
};

export default function AdminCancellationsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [filters, setFilters] = useState({
    status: "all",
    isAutomatic: "all",
    search: "",
    page: 1,
    limit: 20,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.append(key, value);
        }
      });

      const response = await api.get(`/admin/cancellations?${params.toString()}`);
      setRequests(response.data.items || []);
      setPagination({
        total: response.data.total || 0,
        pages: response.data.pages || 0,
      });
    } catch (error) {
      console.error("Failed to fetch cancellation requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/cancellations/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch cancellation stats:", error);
    }
  };

  const fetchRequestDetails = async (id) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/admin/cancellations/${id}`);
      setSelectedRequest(response.data);
      setDetailsOpen(true);
    } catch (error) {
      console.error("Failed to fetch request details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [filters.status, filters.isAutomatic, filters.search, filters.page, filters.limit]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Client Name",
      "Client Email",
      "Owner Name",
      "Listing",
      "Booking Start",
      "Booking End",
      "Original Amount",
      "Refund Amount",
      "Status",
      "Type",
      "Requested At",
    ];

    const rows = requests.map((req) => [
      req.id,
      req.client?.name || "N/A",
      req.client?.email || "N/A",
      req.owner?.name || "N/A",
      req.listing?.title || "N/A",
      formatDate(req.booking?.startDate),
      formatDate(req.booking?.endDate),
      req.refundCalculation?.originalAmount || 0,
      req.refundCalculation?.finalRefund || 0,
      req.status,
      req.isAutomatic ? "Automatic" : "Manual",
      formatDate(req.requestedAt),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancellations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cancellation Requests</h1>
          <p className="text-muted-foreground">
            Manage and monitor all cancellation requests and refunds
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="secondary">{stats.byStatus.pending} Pending</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.refunds.totalRefundAmount)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <TrendingDown className="w-3 h-3" />
                {stats.refunds.refundRate.toFixed(1)}% of original
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus.completed}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="default">{stats.byStatus.approved} Approved</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed/Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.byStatus.failed + stats.byStatus.rejected}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="destructive">{stats.byStatus.failed} Failed</Badge>
                <Badge variant="outline">{stats.byStatus.rejected} Rejected</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, booking..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.isAutomatic}
              onValueChange={(value) => handleFilterChange("isAutomatic", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="true">Automatic</SelectItem>
                <SelectItem value="false">Manual</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.limit.toString()}
              onValueChange={(value) => handleFilterChange("limit", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Per Page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cancellation requests found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Booking Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Refund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{req.client?.name || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {req.client?.email || "N/A"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{req.listing?.title || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {req.listing?.city || "N/A"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div className="text-sm">
                              <div>{formatDate(req.booking?.startDate)}</div>
                              <div className="text-xs text-muted-foreground">
                                to {formatDate(req.booking?.endDate)}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(req.refundCalculation?.originalAmount)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-green-600">
                            {formatCurrency(req.refundCalculation?.finalRefund)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {req.refundCalculation?.refundPercentage}% refund
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={statusConfig.badge} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={req.isAutomatic ? "default" : "outline"}>
                            {req.isAutomatic ? "Auto" : "Manual"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatDate(req.requestedAt)}
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchRequestDetails(req.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {requests.length} of {pagination.total} requests
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === 1}
                    onClick={() => handlePageChange(filters.page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      Page {filters.page} of {pagination.pages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= pagination.pages}
                    onClick={() => handlePageChange(filters.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cancellation Request Details</SheetTitle>
            <SheetDescription>
              Complete information about this cancellation request
            </SheetDescription>
          </SheetHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : selectedRequest ? (
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant={STATUS_CONFIG[selectedRequest.request?.status]?.badge}>
                    {STATUS_CONFIG[selectedRequest.request?.status]?.label}
                  </Badge>
                  {selectedRequest.request?.isAutomatic && (
                    <Badge variant="outline" className="ml-2">
                      Automatic
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Client Information</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{selectedRequest.request?.clientId?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{selectedRequest.request?.clientId?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm">{selectedRequest.request?.clientId?.phone || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Owner Information</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{selectedRequest.request?.ownerId?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{selectedRequest.request?.ownerId?.email}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Listing Information</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Title:</span>
                    <span className="text-sm">{selectedRequest.request?.listingId?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Venue:</span>
                    <span className="text-sm">{selectedRequest.request?.listingId?.venue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{selectedRequest.request?.listingId?.city}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Booking Details</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Start Date:</span>
                    <span className="text-sm">{formatDate(selectedRequest.request?.bookingStartDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">End Date:</span>
                    <span className="text-sm">{formatDate(selectedRequest.request?.bookingEndDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Original Amount:</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(selectedRequest.request?.bookingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Refund Calculation</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Original Amount:</span>
                    <span className="text-sm">
                      {formatCurrency(selectedRequest.request?.refundCalculation?.originalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Refund Percentage:</span>
                    <span className="text-sm">
                      {selectedRequest.request?.refundCalculation?.refundPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Refund Amount:</span>
                    <span className="text-sm">
                      {formatCurrency(selectedRequest.request?.refundCalculation?.refundAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Processing Fee:</span>
                    <span className="text-sm">
                      {formatCurrency(selectedRequest.request?.refundCalculation?.processingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-bold">Final Refund:</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(selectedRequest.request?.refundCalculation?.finalRefund)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Cancellation Reason</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {selectedRequest.request?.cancellationReason === "schedule_change" && "Schedule Change"}
                    {selectedRequest.request?.cancellationReason === "found_alternative" && "Found Alternative"}
                    {selectedRequest.request?.cancellationReason === "emergency" && "Emergency"}
                    {selectedRequest.request?.cancellationReason === "other" && "Other"}
                  </p>
                  {selectedRequest.request?.cancellationReasonOther && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedRequest.request?.cancellationReasonOther}
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.refundTransaction && (
                <div>
                  <Label className="text-xs text-muted-foreground">Refund Transaction</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Transaction ID:</span>
                      <span className="text-sm font-mono text-xs">
                        {selectedRequest.refundTransaction.refundTransactionId || "Pending"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Gateway:</span>
                      <span className="text-sm">{selectedRequest.refundTransaction.gatewayProvider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={STATUS_CONFIG[selectedRequest.refundTransaction.status]?.badge}>
                        {selectedRequest.refundTransaction.status}
                      </Badge>
                    </div>
                    {selectedRequest.refundTransaction.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Completed At:</span>
                        <span className="text-sm">
                          {formatDate(selectedRequest.refundTransaction.completedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Timeline</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Requested:</span>
                    <span>{formatDate(selectedRequest.request?.requestedAt)}</span>
                  </div>
                  {selectedRequest.request?.approvedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium">Approved:</span>
                      <span>{formatDate(selectedRequest.request?.approvedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.request?.rejectedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium">Rejected:</span>
                      <span>{formatDate(selectedRequest.request?.rejectedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.request?.processedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium">Processed:</span>
                      <span>{formatDate(selectedRequest.request?.processedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

 
