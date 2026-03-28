"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  DollarSignIcon,
  PlusIcon,
  TrendingUpIcon,
  CreditCardIcon,
  RouterIcon,
  RefreshCwIcon,
  ClockIcon,
  FilterIcon,
  CalendarIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ViewMode = "sessions" | "router" | "local";

interface Sale {
  id: string;
  customerName: string;
  username: string;
  profileName: string;
  price: string;
  currency: string;
  method: string;
  notes: string | null;
  createdAt: string;
}

interface RouterPayment {
  user: string;
  price: string;
  profile: string;
  method: string;
}

interface SessionRecord {
  user: string;
  started: string;
  uptime: string;
  upload: string;
  download: string;
  nasPortId: string;
}

interface Summary {
  totalSales: number;
  totalRevenue: number;
  recentSales: Sale[];
  cards: { sold: number; unsold: number; total: number };
}

// Parse Mikrotik date format "MMM/dd/yyyy HH:mm:ss" or "yyyy-MM-dd HH:mm:ss" to Date
function parseSessionDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try ISO-like format first
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d;
  // Try "MMM/dd/yyyy HH:mm:ss"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const parts = dateStr.match(/^(\w+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)$/);
  if (parts) {
    const mon = months[parts[1]!.toLowerCase()];
    if (mon !== undefined) {
      return new Date(+parts[3]!, mon, +parts[2]!, +parts[4]!, +parts[5]!, +parts[6]!);
    }
  }
  return null;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export function SalesContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [sales, setSales] = useState<Sale[]>([]);
  const [routerPayments, setRouterPayments] = useState<RouterPayment[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [routerId, setRouterId] = useState<string | null>(null);

  // Filters
  const [nasPortFilter, setNasPortFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => formatDate(new Date()));
  const [dateTo, setDateTo] = useState(() => formatDate(new Date()));

  // New sale form state
  const [customerName, setCustomerName] = useState("");
  const [username, setUsername] = useState("");
  const [profileName, setProfileName] = useState("");
  const [price, setPrice] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const fetchRouterPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch("/api/mikrotik/payments");
      if (res.ok) {
        const data = await res.json();
        setRouterPayments(data);
      }
    } catch (err) {
      console.error("Failed to fetch router payments:", err);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/mikrotik/sessions/all");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!routerId) {
      setLoading(false);
      return;
    }

    try {
      const [salesRes, summaryRes] = await Promise.all([
        fetch(`/api/sales?routerId=${routerId}&limit=50`),
        fetch(`/api/sales/summary?routerId=${routerId}`),
      ]);

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data.sales || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  // Fetch available routers and pick the default
  useEffect(() => {
    async function loadRouter() {
      try {
        const res = await fetch("/api/routers");
        if (res.ok) {
          const routers = await res.json();
          if (routers.length > 0) {
            const def = routers.find((r: { isDefault: boolean }) => r.isDefault) || routers[0];
            setRouterId(def.id);
          }
        }
      } catch {
        // No routers configured yet
      }
    }
    loadRouter();
    fetchRouterPayments();
    fetchSessions();
  }, [fetchRouterPayments, fetchSessions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateSale() {
    if (!routerId || !customerName || !username || !profileName || !price) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routerId,
          customerName,
          username,
          profileName,
          price: Number.parseFloat(price),
          method,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setCustomerName("");
        setUsername("");
        setProfileName("");
        setPrice("");
        setMethod("cash");
        setNotes("");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to create sale:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // Build price map from payments: user → price (from payment records)
  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; profile: string }>();
    for (const p of routerPayments) {
      const rawPrice = p.price || "0";
      // Mobile app strips last 2 chars if length > 2 (removes decimals like ".00")
      const priceNum = Number.parseFloat(rawPrice) || 0;
      map.set(p.user, { price: priceNum, profile: p.profile });
    }
    return map;
  }, [routerPayments]);

  // NAS port options from all sessions
  const nasPortOptions = useMemo(() => {
    const ports = new Set(sessions.map((s) => s.nasPortId).filter(Boolean));
    return Array.from(ports).sort();
  }, [sessions]);

  // Session-based sales calculation (the core feature from mobile app)
  // 1. Filter sessions by date range and NAS port
  // 2. Deduplicate by username (unique sessions only)
  // 3. Look up price for each unique user from payment records
  // 4. Sum total revenue
  const sessionSales = useMemo(() => {
    const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

    // Filter by date range and NAS port
    const filtered = sessions.filter((s) => {
      // NAS port filter
      if (nasPortFilter !== "all" && s.nasPortId !== nasPortFilter) return false;
      // Date filter
      if (fromDate || toDate) {
        const sessionDate = parseSessionDate(s.started);
        if (!sessionDate) return true; // Include sessions with unparseable dates
        if (fromDate && sessionDate < fromDate) return false;
        if (toDate && sessionDate > toDate) return false;
      }
      return true;
    });

    // Deduplicate by username — only first session per user counts
    const seen = new Set<string>();
    const uniqueSessions: (SessionRecord & { price: number; profile: string })[] = [];
    let totalRevenue = 0;

    for (const s of filtered) {
      if (seen.has(s.user)) continue;
      seen.add(s.user);

      const paymentInfo = priceMap.get(s.user);
      const sessionPrice = paymentInfo?.price ?? 0;
      const sessionProfile = paymentInfo?.profile ?? "";
      totalRevenue += sessionPrice;

      uniqueSessions.push({ ...s, price: sessionPrice, profile: sessionProfile });
    }

    return {
      uniqueSessions,
      totalSessions: filtered.length,
      uniqueCount: uniqueSessions.length,
      totalRevenue,
    };
  }, [sessions, nasPortFilter, dateFrom, dateTo, priceMap]);

  // Router revenue from payments
  const routerRevenue = useMemo(() =>
    routerPayments.reduce((sum, p) => sum + (Number.parseFloat(p.price) || 0), 0),
    [routerPayments]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!routerId) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <DollarSignIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>No Router Configured</CardTitle>
          <CardDescription>
            Save a router configuration first to start tracking sales. Go to the
            Connect page and save your router.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Session Sales</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{sessionSales.uniqueCount}</div>
            <p className="text-muted-foreground text-xs">
              unique users ({sessionSales.totalSessions} total sessions)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Session Revenue</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${sessionSales.totalRevenue.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">
              from {sessionSales.uniqueCount} unique sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Local Sales</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{summary?.totalSales ?? 0}</div>
            <p className="text-muted-foreground text-xs">
              ${Number(summary?.totalRevenue ?? 0).toFixed(2)} revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{summary?.cards.sold ?? 0} sold</div>
            <p className="text-muted-foreground text-xs">
              {summary?.cards.unsold ?? 0} unsold of {summary?.cards.total ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {viewMode === "sessions"
                ? "Session-Based Sales"
                : viewMode === "router"
                  ? "Router Payments"
                  : "Local Sales"}
            </CardTitle>
            <CardDescription>
              {viewMode === "sessions"
                ? "Revenue calculated from unique user sessions × profile price"
                : viewMode === "router"
                  ? "All payment records from User Manager"
                  : "Locally recorded sales and transactions"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "sessions" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => {
                  setViewMode("sessions");
                  if (sessions.length === 0) fetchSessions();
                }}
              >
                <ClockIcon className="mr-1 h-4 w-4" />
                Sessions
              </Button>
              <Button
                variant={viewMode === "router" ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-x"
                onClick={() => setViewMode("router")}
              >
                <RouterIcon className="mr-1 h-4 w-4" />
                Payments
              </Button>
              <Button
                variant={viewMode === "local" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("local")}
              >
                <DollarSignIcon className="mr-1 h-4 w-4" />
                Local
              </Button>
            </div>

            {viewMode === "sessions" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { fetchSessions(); fetchRouterPayments(); }}
                disabled={sessionsLoading || paymentsLoading}
              >
                <RefreshCwIcon className={`mr-1 h-4 w-4 ${sessionsLoading || paymentsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : viewMode === "router" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={fetchRouterPayments}
                disabled={paymentsLoading}
              >
                <RefreshCwIcon className={`mr-1 h-4 w-4 ${paymentsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Record Sale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record a Sale</DialogTitle>
                    <DialogDescription>
                      Log a new sale for billing and reporting.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input id="customerName" value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="saleUsername">Username</Label>
                        <Input id="saleUsername" value={username}
                          onChange={(e) => setUsername(e.target.value)} placeholder="user001" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="saleProfile">Profile / Plan</Label>
                        <Input id="saleProfile" value={profileName}
                          onChange={(e) => setProfileName(e.target.value)} placeholder="1-Hour" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salePrice">Price</Label>
                        <Input id="salePrice" type="number" step="0.01" value={price}
                          onChange={(e) => setPrice(e.target.value)} placeholder="5.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="saleMethod">Payment Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                          <SelectTrigger id="saleMethod"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="voucher">Voucher</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="saleNotes">Notes</Label>
                        <Input id="saleNotes" value={notes}
                          onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSale}
                      disabled={submitting || !customerName || !username || !profileName || !price}>
                      {submitting ? "Saving..." : "Record Sale"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Sessions View (main sales view) ── */}
          {viewMode === "sessions" ? (
            sessionsLoading || paymentsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No sessions found. Make sure the router is connected and sessions are loaded.
              </div>
            ) : (
              <>
                {/* Filters Row */}
                <div className="mb-4 flex flex-wrap items-end gap-4">
                  {/* Date Range */}
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <CalendarIcon className="h-3 w-3" /> From
                      </Label>
                      <Input type="date" className="h-9 w-40" value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" className="h-9 w-40" value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  </div>

                  {/* NAS Port Filter */}
                  {nasPortOptions.length > 0 && (
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <FilterIcon className="h-3 w-3" /> NAS Port
                      </Label>
                      <Select value={nasPortFilter} onValueChange={setNasPortFilter}>
                        <SelectTrigger className="h-9 w-48">
                          <SelectValue placeholder="All Ports" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ports</SelectItem>
                          {nasPortOptions.map((port) => (
                            <SelectItem key={port} value={port}>{port}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Summary stats */}
                  <div className="ml-auto flex items-center gap-3">
                    <div className="rounded-md border px-3 py-1.5">
                      <p className="text-muted-foreground text-xs">Unique Users</p>
                      <p className="font-bold text-lg">{sessionSales.uniqueCount}</p>
                    </div>
                    <div className="rounded-md border bg-green-50 px-3 py-1.5 dark:bg-green-950/30">
                      <p className="text-muted-foreground text-xs">Revenue</p>
                      <p className="font-bold text-lg text-green-700 dark:text-green-400">
                        ${sessionSales.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Sales Table */}
                {sessionSales.uniqueSessions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No sessions found for the selected date range and filters.
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Profile</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Upload</TableHead>
                          <TableHead>Download</TableHead>
                          <TableHead>NAS Port</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionSales.uniqueSessions.map((session, idx) => (
                          <TableRow key={`${session.user}-${idx}`}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{session.user}</TableCell>
                            <TableCell>
                              {session.profile ? (
                                <Badge variant="secondary">{session.profile}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.price > 0 ? (
                                <span className="font-medium text-green-700 dark:text-green-400">
                                  ${session.price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">$0.00</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{session.started}</TableCell>
                            <TableCell>{session.upload}</TableCell>
                            <TableCell>{session.download}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{session.nasPortId || "—"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )
          ) : viewMode === "router" ? (
            /* ── Router Payments View ── */
            paymentsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : routerPayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No payment records found on the router.
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-md border px-3 py-1.5">
                    <p className="text-muted-foreground text-xs">Total Payments</p>
                    <p className="font-bold text-lg">{routerPayments.length}</p>
                  </div>
                  <div className="rounded-md border bg-green-50 px-3 py-1.5 dark:bg-green-950/30">
                    <p className="text-muted-foreground text-xs">Total Revenue</p>
                    <p className="font-bold text-lg text-green-700 dark:text-green-400">
                      ${routerRevenue.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routerPayments.map((payment, idx) => (
                      <TableRow key={`${payment.user}-${payment.profile}-${idx}`}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{payment.user}</TableCell>
                        <TableCell>{payment.profile}</TableCell>
                        <TableCell>${Number(payment.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.method || "—"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )
          ) : (
            /* ── Local Sales View ── */
            sales.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No sales recorded yet. Click &quot;Record Sale&quot; to add one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{sale.customerName}</TableCell>
                      <TableCell>{sale.username}</TableCell>
                      <TableCell>{sale.profileName}</TableCell>
                      <TableCell>${Number(sale.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sale.method}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
