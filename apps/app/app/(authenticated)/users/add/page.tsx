"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Loader2Icon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  TrashIcon,
  SettingsIcon,
  SaveIcon,
  UploadIcon,
  ImageIcon,
  MapPinIcon,
  EyeIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/page-header";

interface Profile {
  id: string;
  name: string;
}

interface Customer {
  login: string;
}

interface SalesPoint {
  id: string;
  name: string;
}

interface PrintProfile {
  id: string;
  name: string;
  columns: number;
  rows: number;
  fontSize: number;
  showUsername: boolean;
  showPassword: boolean;
  showProfile: boolean;
  showSalesPoint: boolean;
  imageUrl: string | null;
  userX: number;
  userY: number;
  passX: number;
  passY: number;
  cardWidth: number | null;
  cardHeight: number | null;
}

interface BatchResult {
  success: string[];
  failed: { username: string; error: string }[];
  generated: { username: string; password: string }[];
}

const DEFAULT_CARD_SETTINGS = {
  columns: 3,
  rows: 10,
  fontSize: 10,
  showUsername: true,
  showPassword: true,
  showProfile: false,
  showSalesPoint: false,
  imageUrl: null as string | null,
  userX: 3,
  userY: 10,
  passX: 3,
  passY: 18,
  cardWidth: null as number | null,
  cardHeight: null as number | null,
};

export default function AddUserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single user form
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    username: "",
    userPassword: "",
    profile: "",
    customer: "admin",
  });

  // Batch form state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchForm, setBatchForm] = useState({
    count: "10",
    prefix: "",
    suffix: "",
    usernameLength: "6",
    passwordMode: "same",
    passwordLength: "6",
    charset: "alphanumeric",
    profile: "",
    customer: "admin",
  });

  // Sales points, print profiles, expired
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("");
  const [printProfiles, setPrintProfiles] = useState<PrintProfile[]>([]);
  const [selectedPrintProfile, setSelectedPrintProfile] = useState("");
  const [deletingExpired, setDeletingExpired] = useState(false);
  const [expiredCount, setExpiredCount] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Card template inline settings
  const [cardSettings, setCardSettings] = useState({ ...DEFAULT_CARD_SETTINGS });

  // Save profile dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/mikrotik/profiles").then((r) => r.json()),
      fetch("/api/mikrotik/customers").then((r) => r.json()),
      fetch("/api/sales-points").then((r) => r.json()).catch(() => []),
      fetch("/api/print-profiles").then((r) => r.json()).catch(() => []),
      fetch("/api/mikrotik/users/expired").then((r) => r.json()).catch(() => []),
    ]).then(([p, c, sp, pp, expired]) => {
      if (Array.isArray(p)) setProfiles(p);
      if (Array.isArray(c)) setCustomers(c);
      if (Array.isArray(sp)) setSalesPoints(sp);
      if (Array.isArray(pp)) setPrintProfiles(pp);
      if (Array.isArray(expired)) setExpiredCount(expired.length);
    });
  }, []);

  // Load a print profile into inline settings
  const loadProfile = (profileId: string) => {
    setSelectedPrintProfile(profileId);
    const profile = printProfiles.find((p) => p.id === profileId);
    if (profile) {
      setCardSettings({
        columns: profile.columns,
        rows: profile.rows,
        fontSize: profile.fontSize,
        showUsername: profile.showUsername,
        showPassword: profile.showPassword,
        showProfile: profile.showProfile,
        showSalesPoint: profile.showSalesPoint,
        imageUrl: profile.imageUrl,
        userX: profile.userX,
        userY: profile.userY,
        passX: profile.passX,
        passY: profile.passY,
        cardWidth: profile.cardWidth,
        cardHeight: profile.cardHeight,
      });
    }
  };

  // Save current card settings as a new print profile
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/print-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, ...cardSettings }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPrintProfiles((prev) => [saved, ...prev]);
        setSelectedPrintProfile(saved.id);
        setSaveDialogOpen(false);
        setProfileName("");
      }
    } catch {
      alert("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload background image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setCardSettings((prev) => ({ ...prev, imageUrl: data.url }));
      }
    } catch {
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mikrotik/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add user");
        return;
      }
      router.push("/users");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    setBatchError("");
    setBatchResult(null);

    try {
      const res = await fetch("/api/mikrotik/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: Number(batchForm.count),
          prefix: batchForm.prefix,
          suffix: batchForm.suffix,
          usernameLength: Number(batchForm.usernameLength),
          passwordMode: batchForm.passwordMode,
          passwordLength: Number(batchForm.passwordLength),
          charset: batchForm.charset,
          profile: batchForm.profile,
          customer: batchForm.customer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchError(data.error || "Batch creation failed");
        return;
      }
      setBatchResult(data);
    } catch {
      setBatchError("Network error");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDeleteExpired = async () => {
    if (!confirm(`Delete all ${expiredCount} expired users? This cannot be undone.`)) return;
    setDeletingExpired(true);
    try {
      const res = await fetch("/api/mikrotik/users/expired", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setExpiredCount(0);
        alert(`Deleted ${data.deleted} expired users.${data.failed?.length ? ` ${data.failed.length} failed.` : ""}`);
      } else {
        alert(data.error || "Failed to delete expired users");
      }
    } catch {
      alert("Network error while deleting expired users");
    } finally {
      setDeletingExpired(false);
    }
  };

  const handlePrintBatchResult = async () => {
    if (!batchResult) return;
    setPrinting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      const s = cardSettings;
      const cols = s.columns;
      const rowsPerPage = s.rows;
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const gapX = 3;
      const gapY = 3;
      const cw = s.cardWidth || Math.floor((pageWidth - margin * 2 - (cols - 1) * gapX) / cols);
      const ch = s.cardHeight || Math.floor((pageHeight - margin * 2 - (rowsPerPage - 1) * gapY) / rowsPerPage);
      const cardsPerPage = cols * rowsPerPage;

      const cards = batchResult.generated.filter((u) =>
        batchResult.success.includes(u.username)
      );

      if (cards.length === 0) {
        alert("No successfully created cards to print.");
        setPrinting(false);
        return;
      }

      for (let i = 0; i < cards.length; i++) {
        const posOnPage = i % cardsPerPage;
        const row = Math.floor(posOnPage / cols);
        const col = posOnPage % cols;

        if (i > 0 && posOnPage === 0) doc.addPage();

        const x = margin + col * (cw + gapX);
        const y = margin + row * (ch + gapY);

        // Draw card background
        if (s.imageUrl) {
          try {
            doc.addImage(s.imageUrl, "JPEG", x, y, cw, ch);
          } catch {
            doc.setDrawColor(180);
            doc.rect(x, y, cw, ch);
          }
        } else {
          doc.setDrawColor(180);
          doc.rect(x, y, cw, ch);
        }

        const card = cards[i];
        if (!card) continue;
        doc.setFontSize(s.fontSize);
        doc.setTextColor(0, 0, 0);

        if (s.showUsername) {
          doc.text(card.username, x + s.userX, y + s.userY);
        }
        if (s.showPassword) {
          doc.text(card.password || card.username, x + s.passX, y + s.passY);
        }
        // Profile text below user/pass
        const baseY = Math.max(s.userY, s.passY);
        if (s.showProfile && batchForm.profile) {
          doc.text(batchForm.profile, x + s.userX, y + baseY + 7);
        }
        if (s.showSalesPoint && selectedSalesPoint) {
          const spName = salesPoints.find((sp) => sp.id === selectedSalesPoint)?.name || "";
          const spY = baseY + (s.showProfile && batchForm.profile ? 14 : 7);
          doc.text(spName, x + s.userX, y + spY);
        }
      }

      doc.save("batch-cards.pdf");
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  // Live card preview data
  const previewCards = batchResult
    ? batchResult.generated.filter((u) => batchResult.success.includes(u.username)).slice(0, 6)
    : [
        { username: "user001", password: "pass001" },
        { username: "user002", password: "pass002" },
        { username: "user003", password: "pass003" },
      ];

  return (
    <>
      <PageHeader page="Add User" pages={["MUMS", "User Manager"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

        {/* Expired Users Banner */}
        {expiredCount !== null && expiredCount > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <TrashIcon className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {expiredCount} expired user{expiredCount !== 1 ? "s" : ""} found on the router
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteExpired}
                disabled={deletingExpired}
              >
                {deletingExpired ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="mr-2 h-4 w-4" />
                )}
                Delete All Expired
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single User</TabsTrigger>
            <TabsTrigger value="batch">
              <UsersIcon className="mr-1 h-4 w-4" />
              Batch Generate
            </TabsTrigger>
          </TabsList>

          {/* ── Single User Tab ── */}
          <TabsContent value="single">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
                <CardDescription>
                  Create a new User Manager user on the router
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.userPassword}
                      onChange={(e) => setForm({ ...form, userPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile">Profile</Label>
                    <Select value={form.profile} onValueChange={(v) => setForm({ ...form, profile: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select value={form.customer} onValueChange={(v) => setForm({ ...form, customer: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.login} value={c.login}>{c.login}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                      Add User
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/users")}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Batch Generate Tab ── */}
          <TabsContent value="batch">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">

              {/* Left Column: Batch Form */}
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Batch Generate Users</CardTitle>
                    <CardDescription>
                      Generate multiple users with random usernames. Format: PREFIX + random + SUFFIX
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Count</Label>
                          <Input
                            type="number" min="1" max="500"
                            value={batchForm.count}
                            onChange={(e) => setBatchForm({ ...batchForm, count: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prefix</Label>
                          <Input placeholder="e.g. wifi-" value={batchForm.prefix}
                            onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Suffix</Label>
                          <Input placeholder="e.g. -user" value={batchForm.suffix}
                            onChange={(e) => setBatchForm({ ...batchForm, suffix: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Username Length</Label>
                          <Input type="number" min="3" max="20" value={batchForm.usernameLength}
                            onChange={(e) => setBatchForm({ ...batchForm, usernameLength: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Character Set</Label>
                          <Select value={batchForm.charset}
                            onValueChange={(v) => setBatchForm({ ...batchForm, charset: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="digits">Digits Only (0-9)</SelectItem>
                              <SelectItem value="alpha">Letters Only (a-z)</SelectItem>
                              <SelectItem value="alphanumeric">Both (a-z, 0-9)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Password Mode</Label>
                          <Select value={batchForm.passwordMode}
                            onValueChange={(v) => setBatchForm({ ...batchForm, passwordMode: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="same">Same as username</SelectItem>
                              <SelectItem value="random">Random</SelectItem>
                              <SelectItem value="empty">Empty</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {batchForm.passwordMode === "random" && (
                        <div className="max-w-[200px] space-y-2">
                          <Label>Password Length</Label>
                          <Input type="number" min="3" max="20" value={batchForm.passwordLength}
                            onChange={(e) => setBatchForm({ ...batchForm, passwordLength: e.target.value })} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Profile</Label>
                          <Select value={batchForm.profile}
                            onValueChange={(v) => setBatchForm({ ...batchForm, profile: v })}>
                            <SelectTrigger><SelectValue placeholder="Select a profile" /></SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Customer</Label>
                          <Select value={batchForm.customer}
                            onValueChange={(v) => setBatchForm({ ...batchForm, customer: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.login} value={c.login}>{c.login}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {salesPoints.length > 0 && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <MapPinIcon className="h-4 w-4" /> Sales Point
                          </Label>
                          <Select value={selectedSalesPoint} onValueChange={setSelectedSalesPoint}>
                            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                            <SelectContent>
                              {salesPoints.map((sp) => (
                                <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {batchError && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{batchError}</div>
                      )}

                      <Button type="submit" disabled={batchLoading} className="w-full">
                        {batchLoading ? (
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UsersIcon className="mr-2 h-4 w-4" />
                        )}
                        Generate {batchForm.count} Users
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Batch Result */}
                {batchResult && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          Result
                          <Badge variant="secondary">{batchResult.success.length} created</Badge>
                          {batchResult.failed.length > 0 && (
                            <Badge variant="destructive">{batchResult.failed.length} failed</Badge>
                          )}
                        </CardTitle>
                        <Button size="sm" onClick={handlePrintBatchResult}
                          disabled={printing || batchResult.success.length === 0}>
                          {printing ? (
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PrinterIcon className="mr-2 h-4 w-4" />
                          )}
                          Print Cards
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Password</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchResult.generated.map((u) => {
                              const ok = batchResult.success.includes(u.username);
                              const fail = batchResult.failed.find((f) => f.username === u.username);
                              return (
                                <TableRow key={u.username}>
                                  <TableCell className="font-mono text-sm">{u.username}</TableCell>
                                  <TableCell className="font-mono text-sm">{u.password || "—"}</TableCell>
                                  <TableCell>
                                    {ok ? (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircleIcon className="h-4 w-4" /> Created
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-600">
                                        <XCircleIcon className="h-4 w-4" /> {fail?.error || "Failed"}
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Card Template Designer */}
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <SettingsIcon className="h-4 w-4" />
                        Card Template
                      </CardTitle>
                      <div className="flex gap-2">
                        {printProfiles.length > 0 && (
                          <Select value={selectedPrintProfile} onValueChange={loadProfile}>
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue placeholder="Load template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {printProfiles.map((pp) => (
                                <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8">
                              <SaveIcon className="mr-1 h-3 w-3" /> Save
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save Card Template</DialogTitle>
                              <DialogDescription>Save current settings as a reusable template.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                              <Label>Template Name</Label>
                              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                                placeholder="e.g. Hotspot Cards A4" />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()}>
                                {savingProfile && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Layout */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Columns</Label>
                        <Select value={String(cardSettings.columns)}
                          onValueChange={(v) => setCardSettings((s) => ({ ...s, columns: Number(v) }))}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rows</Label>
                        <Input type="number" min="1" max="20" className="h-8"
                          value={cardSettings.rows}
                          onChange={(e) => setCardSettings((s) => ({ ...s, rows: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Font Size</Label>
                        <Input type="number" min="6" max="24" className="h-8"
                          value={cardSettings.fontSize}
                          onChange={(e) => setCardSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))} />
                      </div>
                    </div>

                    {/* Text positioning */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">User X</Label>
                        <Input type="number" className="h-8" value={cardSettings.userX}
                          onChange={(e) => setCardSettings((s) => ({ ...s, userX: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">User Y</Label>
                        <Input type="number" className="h-8" value={cardSettings.userY}
                          onChange={(e) => setCardSettings((s) => ({ ...s, userY: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pass X</Label>
                        <Input type="number" className="h-8" value={cardSettings.passX}
                          onChange={(e) => setCardSettings((s) => ({ ...s, passX: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pass Y</Label>
                        <Input type="number" className="h-8" value={cardSettings.passY}
                          onChange={(e) => setCardSettings((s) => ({ ...s, passY: Number(e.target.value) }))} />
                      </div>
                    </div>

                    {/* Card size override */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Card Width (mm)</Label>
                        <Input type="number" placeholder="Auto" className="h-8"
                          value={cardSettings.cardWidth ?? ""}
                          onChange={(e) => setCardSettings((s) => ({
                            ...s, cardWidth: e.target.value ? Number(e.target.value) : null,
                          }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Card Height (mm)</Label>
                        <Input type="number" placeholder="Auto" className="h-8"
                          value={cardSettings.cardHeight ?? ""}
                          onChange={(e) => setCardSettings((s) => ({
                            ...s, cardHeight: e.target.value ? Number(e.target.value) : null,
                          }))} />
                      </div>
                    </div>

                    {/* Visibility toggles */}
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={cardSettings.showUsername}
                          onChange={(e) => setCardSettings((s) => ({ ...s, showUsername: e.target.checked }))} />
                        Username
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={cardSettings.showPassword}
                          onChange={(e) => setCardSettings((s) => ({ ...s, showPassword: e.target.checked }))} />
                        Password
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={cardSettings.showProfile}
                          onChange={(e) => setCardSettings((s) => ({ ...s, showProfile: e.target.checked }))} />
                        Profile
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={cardSettings.showSalesPoint}
                          onChange={(e) => setCardSettings((s) => ({ ...s, showSalesPoint: e.target.checked }))} />
                        Sales Point
                      </label>
                    </div>

                    {/* Background Image */}
                    <div className="space-y-2">
                      <Label className="text-xs">Background Image</Label>
                      <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={handleImageUpload} />
                        <Button variant="outline" size="sm" className="h-8"
                          onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2Icon className="mr-1 h-3 w-3 animate-spin" /> : <UploadIcon className="mr-1 h-3 w-3" />}
                          Upload
                        </Button>
                        {cardSettings.imageUrl && (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              <ImageIcon className="mr-1 h-3 w-3" /> Set
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-8"
                              onClick={() => setCardSettings((s) => ({ ...s, imageUrl: null }))}>
                              <TrashIcon className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                      {cardSettings.imageUrl && (
                        <img src={cardSettings.imageUrl} alt="Card background" className="h-16 rounded border object-contain" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Card Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <EyeIcon className="h-4 w-4" />
                      Card Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2" style={{
                      gridTemplateColumns: `repeat(${Math.min(cardSettings.columns, 3)}, 1fr)`,
                    }}>
                      {previewCards.slice(0, Math.min(cardSettings.columns, 3) * 2).map((card, i) => (
                        <div
                          key={i}
                          className="relative overflow-hidden rounded border bg-white text-black"
                          style={{
                            minHeight: "80px",
                            fontSize: `${Math.max(cardSettings.fontSize * 0.8, 8)}px`,
                          }}
                        >
                          {cardSettings.imageUrl && (
                            <img src={cardSettings.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                          )}
                          <div className="relative p-2 space-y-0.5">
                            {cardSettings.showUsername && (
                              <div className="font-mono font-bold truncate">{card.username}</div>
                            )}
                            {cardSettings.showPassword && (
                              <div className="font-mono text-gray-700 truncate">{card.password}</div>
                            )}
                            {cardSettings.showProfile && batchForm.profile && (
                              <div className="text-gray-500 truncate">{batchForm.profile}</div>
                            )}
                            {cardSettings.showSalesPoint && selectedSalesPoint && (
                              <div className="text-gray-500 truncate">
                                {salesPoints.find((sp) => sp.id === selectedSalesPoint)?.name || ""}
                              </div>
                            )}
                            {!cardSettings.showUsername && !cardSettings.showPassword && (
                              <div className="text-gray-400 italic text-xs">No content selected</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Preview shows sample cards. Actual PDF uses mm positioning settings above.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
