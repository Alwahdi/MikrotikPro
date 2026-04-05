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
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Loader2Icon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  TrashIcon,
  SaveIcon,
  MapPinIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/page-header";
import { useDictionary } from "@/i18n/dictionary-provider";
import { CardDesigner, DEFAULT_CARD_DESIGN, migrateOldProfile } from "../../components/card-designer";
import type { CardDesign } from "../../components/card-designer";
import { generateCardsPDF } from "../../components/card-pdf";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";

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
  elements?: unknown;
  backgroundTemplate?: string | null;
  backgroundColor?: string | null;
}

interface BatchResult {
  success: string[];
  failed: { username: string; error: string }[];
  generated: { username: string; password: string }[];
}

export default function AddUserPage() {
  const router = useRouter();
  const { t } = useDictionary();

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
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; percent: number; lastUser: string } | null>(null);
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
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Card designer state
  const [cardDesign, setCardDesign] = useState<CardDesign>({ ...DEFAULT_CARD_DESIGN });

  // Delete expired dialog
  const [deleteExpiredDialogOpen, setDeleteExpiredDialogOpen] = useState(false);

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

  // Load a print profile into the card designer
  const loadProfile = (profileId: string) => {
    setSelectedPrintProfile(profileId);
    const profile = printProfiles.find((p) => p.id === profileId);
    if (profile) {
      setCardDesign(migrateOldProfile(profile));
    }
  };

  // Save current card design as a new print profile
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const body = {
        name: profileName,
        columns: cardDesign.columns,
        rows: cardDesign.rows,
        fontSize: cardDesign.elements[0]?.fontSize || 10,
        showUsername: cardDesign.elements.some((e) => e.type === "username"),
        showPassword: cardDesign.elements.some((e) => e.type === "password"),
        showProfile: cardDesign.elements.some((e) => e.type === "profile"),
        showSalesPoint: cardDesign.elements.some((e) => e.type === "salespoint"),
        imageUrl: cardDesign.backgroundImage,
        userX: cardDesign.elements.find((e) => e.type === "username")?.x || 3,
        userY: cardDesign.elements.find((e) => e.type === "username")?.y || 10,
        passX: cardDesign.elements.find((e) => e.type === "password")?.x || 3,
        passY: cardDesign.elements.find((e) => e.type === "password")?.y || 18,
        cardWidth: cardDesign.cardWidth,
        cardHeight: cardDesign.cardHeight,
        elements: cardDesign.elements,
        backgroundTemplate: cardDesign.backgroundTemplate,
        backgroundColor: cardDesign.backgroundColor,
      };
      const res = await fetch("/api/print-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const saved = await res.json();
        setPrintProfiles((prev) => [saved, ...prev]);
        setSelectedPrintProfile(saved.id);
        setSaveDialogOpen(false);
        setProfileName("");
      }
    } catch {
      toast.error(t("usersAdd.failedToSaveProfile"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload background image (used by CardDesigner callback)
  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } finally {
      setUploading(false);
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
        setError(data.error || t("usersAdd.failedToAddUser"));
        return;
      }
      router.push("/users");
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    setBatchError("");
    setBatchResult(null);
    setBatchProgress({ current: 0, total: Number(batchForm.count), percent: 0, lastUser: "" });

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
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBatchError(data.error || t("usersAdd.batchFailed"));
        setBatchProgress(null);
        setBatchLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setBatchError(t("usersAdd.streamingNotSupported"));
        setBatchProgress(null);
        setBatchLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setBatchProgress({
                current: event.current,
                total: event.total,
                percent: event.percent,
                lastUser: event.lastUser,
              });
            } else if (event.type === "done") {
              setBatchResult({
                success: event.success,
                failed: event.failed,
                generated: event.generated,
              });
            } else if (event.type === "error") {
              setBatchError(event.error);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setBatchError(t("common.networkError"));
    } finally {
      setBatchLoading(false);
      setBatchProgress(null);
    }
  };

  const handleDeleteExpired = async () => {
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
        toast.success(t("usersAdd.deletedExpired").replace("{n}", String(data.deleted)));
      } else {
        toast.error(data.error || t("usersAdd.failedDeleteExpired"));
      }
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setDeletingExpired(false);
    }
  };

  const handlePrintBatchResult = async () => {
    if (!batchResult) return;
    setPrinting(true);
    setPrintProgress({ current: 0, total: 0, percent: 0 });
    try {
      const cards = batchResult.generated
        .filter((u) => batchResult.success.includes(u.username))
        .map((u) => ({
          username: u.username,
          password: u.password || u.username,
          profile: batchForm.profile || undefined,
        }));

      if (cards.length === 0) {
        toast.error(t("usersAdd.noCardsToprint"));
        return;
      }

      await generateCardsPDF(cards, cardDesign, {
        salesPointName: salesPoints.find((sp) => sp.id === selectedSalesPoint)?.name,
        filename: "batch-cards.pdf",
        onProgress: (current, total) => {
          setPrintProgress({ current, total, percent: Math.round((current / total) * 100) });
        },
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(t("usersAdd.failedToGeneratePDF"));
    } finally {
      setPrinting(false);
      setPrintProgress(null);
    }
  };

  // Preview data for the card designer
  const previewCards = batchResult
    ? batchResult.generated.filter((u) => batchResult.success.includes(u.username)).slice(0, 6)
    : [
        { username: "user001", password: "pass001" },
        { username: "user002", password: "pass002" },
        { username: "user003", password: "pass003" },
      ];

  return (
    <>
      <PageHeader page={t("usersAdd.title")} pages={[t("auth.brandName"), t("users.title")]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

        {/* Expired Users Banner */}
        {expiredCount !== null && expiredCount > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <TrashIcon className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {expiredCount} {t("usersAdd.expiredFound")}
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteExpiredDialogOpen(true)}
                disabled={deletingExpired}
              >
                {deletingExpired ? (
                  <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="me-2 h-4 w-4" />
                )}
                {t("usersAdd.deleteAllExpired")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">{t("usersAdd.singleUser")}</TabsTrigger>
            <TabsTrigger value="batch">
              <UsersIcon className="me-1 h-4 w-4" />
              {t("usersAdd.batchGenerate")}
            </TabsTrigger>
          </TabsList>

          {/* ── Single User Tab ── */}
          <TabsContent value="single">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>{t("usersAdd.addNewUser")}</CardTitle>
                <CardDescription>
                  {t("usersAdd.createNewUser")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("common.username")}</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("common.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.userPassword}
                      onChange={(e) => setForm({ ...form, userPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile">{t("common.profile")}</Label>
                    <Select value={form.profile} onValueChange={(v) => setForm({ ...form, profile: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("usersAdd.selectProfile")} />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">{t("usersAdd.customer")}</Label>
                    <Select value={form.customer} onValueChange={(v) => setForm({ ...form, customer: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("usersAdd.selectCustomer")} />
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
                      {loading && <Loader2Icon className="me-2 h-4 w-4 animate-spin" />}
                      {t("users.addUser")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/users")}>
                      {t("common.cancel")}
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
                    <CardTitle>{t("usersAdd.batchGenerateUsers")}</CardTitle>
                    <CardDescription>
                      {t("usersAdd.batchDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>{t("usersAdd.count")}</Label>
                          <Input
                            type="number" min="1" max="500"
                            value={batchForm.count}
                            onChange={(e) => setBatchForm({ ...batchForm, count: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("usersAdd.prefix")}</Label>
                          <Input placeholder={t("usersAdd.prefixPlaceholder")} value={batchForm.prefix}
                            onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("usersAdd.suffix")}</Label>
                          <Input placeholder={t("usersAdd.suffixPlaceholder")} value={batchForm.suffix}
                            onChange={(e) => setBatchForm({ ...batchForm, suffix: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>{t("usersAdd.usernameLength")}</Label>
                          <Input type="number" min="3" max="20" value={batchForm.usernameLength}
                            onChange={(e) => setBatchForm({ ...batchForm, usernameLength: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("usersAdd.characterSet")}</Label>
                          <Select value={batchForm.charset}
                            onValueChange={(v) => setBatchForm({ ...batchForm, charset: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="digits">{t("usersAdd.digitsOnly")}</SelectItem>
                              <SelectItem value="alpha">{t("usersAdd.lettersOnly")}</SelectItem>
                              <SelectItem value="alphanumeric">{t("usersAdd.both")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("usersAdd.passwordMode")}</Label>
                          <Select value={batchForm.passwordMode}
                            onValueChange={(v) => setBatchForm({ ...batchForm, passwordMode: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="same">{t("usersAdd.sameAsUsername")}</SelectItem>
                              <SelectItem value="random">{t("usersAdd.random")}</SelectItem>
                              <SelectItem value="empty">{t("usersAdd.empty")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {batchForm.passwordMode === "random" && (
                        <div className="max-w-[200px] space-y-2">
                          <Label>{t("usersAdd.passwordLength")}</Label>
                          <Input type="number" min="3" max="20" value={batchForm.passwordLength}
                            onChange={(e) => setBatchForm({ ...batchForm, passwordLength: e.target.value })} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>{t("common.profile")}</Label>
                          <Select value={batchForm.profile}
                            onValueChange={(v) => setBatchForm({ ...batchForm, profile: v })}>
                            <SelectTrigger><SelectValue placeholder={t("usersAdd.selectProfile")} /></SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("usersAdd.customer")}</Label>
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
                            <MapPinIcon className="h-4 w-4" /> {t("usersAdd.salesPoint")}
                          </Label>
                          <Select value={selectedSalesPoint} onValueChange={setSelectedSalesPoint}>
                            <SelectTrigger><SelectValue placeholder={t("usersAdd.optional")} /></SelectTrigger>
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
                          <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UsersIcon className="me-2 h-4 w-4" />
                        )}
                        {`${t("usersAdd.generateUsers")} ${batchForm.count}`}
                      </Button>

                      {/* Batch Progress Bar */}
                      {batchLoading && batchProgress && (
                        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("usersAdd.creatingUsers")} {batchProgress.current}/{batchProgress.total}
                            </span>
                            <span className="font-mono font-bold text-primary">
                              {batchProgress.percent}%
                            </span>
                          </div>
                          <Progress value={batchProgress.percent} className="h-3" />
                          {batchProgress.lastUser && (
                            <p className="text-xs text-muted-foreground">
                              Last: <span className="font-mono">{batchProgress.lastUser}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* Batch Result */}
                {batchResult && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {t("usersAdd.result")}
                          <Badge variant="secondary">{batchResult.success.length} {t("usersAdd.created")}</Badge>
                          {batchResult.failed.length > 0 && (
                            <Badge variant="destructive">{batchResult.failed.length} {t("usersAdd.failed")}</Badge>
                          )}
                        </CardTitle>
                        <Button size="sm" onClick={handlePrintBatchResult}
                          disabled={printing || batchResult.success.length === 0}>
                          {printing ? (
                            <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PrinterIcon className="me-2 h-4 w-4" />
                          )}
                          {t("usersAdd.printCards")}
                        </Button>
                      </div>
                      {printProgress && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t("usersAdd.generatingPDF")} {printProgress.current}/{printProgress.total}</span>
                            <Badge variant="secondary" className="text-xs">{printProgress.percent}%</Badge>
                          </div>
                          <Progress value={printProgress.percent} className="h-2" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("common.username")}</TableHead>
                              <TableHead>{t("common.password")}</TableHead>
                              <TableHead>{t("common.status")}</TableHead>
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
                                        <CheckCircleIcon className="h-4 w-4" /> {t("usersAdd.created")}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-600">
                                        <XCircleIcon className="h-4 w-4" /> {fail?.error || t("usersAdd.failed")}
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
                      <CardTitle className="text-base">{t("usersAdd.cardDesigner")}</CardTitle>
                      <div className="flex gap-2">
                        {printProfiles.length > 0 && (
                          <Select value={selectedPrintProfile} onValueChange={loadProfile}>
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue placeholder={t("usersAdd.loadTemplate")} />
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
                              <SaveIcon className="me-1 h-3 w-3" /> {t("common.save")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("usersAdd.saveTemplate")}</DialogTitle>
                              <DialogDescription>{t("usersAdd.saveTemplateDesc")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                              <Label>{t("usersAdd.templateName")}</Label>
                              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                                placeholder="e.g. Hotspot Cards A4" />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>{t("common.cancel")}</Button>
                              <Button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()}>
                                {savingProfile && <Loader2Icon className="me-2 h-4 w-4 animate-spin" />}
                                {t("common.save")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDesigner
                      design={cardDesign}
                      onChange={setCardDesign}
                      previewData={previewCards}
                      salesPointName={salesPoints.find((sp) => sp.id === selectedSalesPoint)?.name}
                      onImageUpload={handleImageUpload}
                      uploading={uploading}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={deleteExpiredDialogOpen} onOpenChange={setDeleteExpiredDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("usersAdd.deleteAllExpired")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("usersAdd.deleteExpiredConfirm").replace("{n}", String(expiredCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setDeleteExpiredDialogOpen(false); handleDeleteExpired(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
