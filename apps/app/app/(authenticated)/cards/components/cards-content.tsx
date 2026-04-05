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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Loader2Icon,
  PrinterIcon,
  SaveIcon,
  TrashIcon,
  MapPinIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

interface User {
  id: string;
  username: string;
  password: string;
  profile: string;
}

interface SalesPoint {
  id: string;
  name: string;
}

interface CardBatch {
  id: string;
  profileName: string;
  quantity: number;
  prefix: string | null;
  totalCards: number;
  soldCards: number;
  createdAt: string;
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

export function CardsContent() {
  const { t } = useDictionary();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Card designer state
  const [cardDesign, setCardDesign] = useState<CardDesign>({ ...DEFAULT_CARD_DESIGN });

  // Print profiles
  const [printProfiles, setPrintProfiles] = useState<PrintProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Upload & progress
  const [uploading, setUploading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; percent: number } | null>(null);

  // Sales points
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("");

  // DB state
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [deleteBatchDialogId, setDeleteBatchDialogId] = useState<string | null>(null);

  // Fetch saved router
  useEffect(() => {
    async function loadRouter() {
      try {
        const res = await fetch("/api/routers");
        if (res.ok) {
          const routers = await res.json();
          if (routers.length > 0) {
            const def =
              routers.find((r: { isDefault: boolean }) => r.isDefault) ||
              routers[0];
            setRouterId(def.id);
          }
        }
      } catch {
        toast.error(t("common.networkError"));
      }
    }
    loadRouter();
  }, []);

  // Fetch users from Mikrotik
  useEffect(() => {
    fetch("/api/mikrotik/users")
      .then((r) => r.json())
      .then((data) => {
        const all = [...(data.active || []), ...(data.inactive || [])];
        setUsers(all);
        setSelectedUsers(all.map((u: User) => u.id));
      })
      .catch(() => { toast.error(t("common.networkError")); })
      .finally(() => setLoading(false));
  }, []);

  // Fetch print profiles
  useEffect(() => {
    fetch("/api/print-profiles")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPrintProfiles(data);
      })
      .catch(() => { toast.error(t("common.networkError")); });
  }, []);

  // Fetch sales points
  useEffect(() => {
    fetch("/api/sales-points")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSalesPoints(data);
      })
      .catch(() => { toast.error(t("common.networkError")); });
  }, []);

  // Fetch card batches from DB
  const fetchBatches = useCallback(async () => {
    if (!routerId) {
      setLoadingBatches(false);
      return;
    }
    try {
      const res = await fetch(`/api/cards?routerId=${routerId}`);
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setLoadingBatches(false);
    }
  }, [routerId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Load a print profile
  const loadProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = printProfiles.find((p) => p.id === profileId);
    if (profile) {
      setCardDesign(migrateOldProfile(profile));
    }
  };

  // Save current card design as a print profile
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
        setSelectedProfileId(saved.id);
        setSaveDialogOpen(false);
        setProfileName("");
      }
    } catch {
      toast.error(t("cards.failedToSaveProfile"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Delete a print profile
  const deleteProfile = async (id: string) => {
    try {
      await fetch(`/api/print-profiles/${id}`, { method: "DELETE" });
      setPrintProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfileId === id) {
        setSelectedProfileId("");
        setCardDesign({ ...DEFAULT_CARD_DESIGN });
      }
    } catch {
      toast.error(t("common.failedToDelete"));
    }
  };

  // Delete a card batch
  const deleteBatch = async (id: string) => {
    setDeletingBatchId(id);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBatches((prev) => prev.filter((b) => b.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("cards.failedToDeleteBatch"));
      }
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setDeletingBatchId(null);
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

  const generatePDF = async () => {
    setGenerating(true);
    setPdfProgress({ current: 0, total: 0, percent: 0 });
    try {
      const selected = users.filter((u) => selectedUsers.includes(u.id));
      if (selected.length === 0) return;

      await generateCardsPDF(
        selected.map((u) => ({
          username: u.username,
          password: u.password,
          profile: u.profile || undefined,
        })),
        cardDesign,
        {
          salesPointName: salesPoints.find((s) => s.id === selectedSalesPoint)?.name,
          filename: "mums-cards.pdf",
          onProgress: (current, total) => {
            setPdfProgress({ current, total, percent: Math.round((current / total) * 100) });
          },
        },
      );

      // Save batch to database
      if (routerId && selected.length > 0) {
        const pName = selected[0]?.profile || "unknown";
        await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routerId,
            profileName: pName,
            quantity: selected.length,
            cards: selected.map((u) => ({
              username: u.username,
              password: u.password,
            })),
          }),
        });
        fetchBatches();
      }
    } catch {
      toast.error(t("usersAdd.failedToGeneratePDF"));
    } finally {
      setGenerating(false);
      setPdfProgress(null);
    }
  };

  return (
    <Tabs defaultValue="generate">
      <TabsList>
        <TabsTrigger value="generate">{t("cards.generateCards")}</TabsTrigger>
        <TabsTrigger value="history">
          {t("cards.history")}{" "}
          {batches.length > 0 && (
            <Badge variant="secondary" className="ms-1">
              {batches.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generate">
        <div className="flex flex-col gap-4">
          {/* Print Profile Selector */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("cards.printProfile")}</CardTitle>
                <div className="flex gap-2">
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <SaveIcon className="me-1 h-4 w-4" />
                        {t("cards.saveProfile")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("cards.savePrintProfile")}</DialogTitle>
                        <DialogDescription>
                          {t("cards.saveProfileDesc")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4">
                        <Label>{t("cards.profileNameLabel")}</Label>
                        <Input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder={t("cards.profilePlaceholder")}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()}>
                          {savingProfile ? <Loader2Icon className="me-2 h-4 w-4 animate-spin" /> : null}
                          {t("common.save")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={selectedProfileId} onValueChange={loadProfile}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={t("cards.loadProfile")} />
                  </SelectTrigger>
                  <SelectContent>
                    {printProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProfileId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteProfile(selectedProfileId)}
                    aria-label={t("common.delete")}
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card Designer */}
          <Card>
            <CardHeader>
              <CardTitle>{t("cards.cardDesigner")}</CardTitle>
              <CardDescription>
                {t("cards.cardDesignerDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardDesigner
                design={cardDesign}
                onChange={setCardDesign}
                previewData={users.filter((u) => selectedUsers.includes(u.id)).slice(0, 6).map((u) => ({
                  username: u.username,
                  password: u.password,
                  profile: u.profile || undefined,
                }))}
                salesPointName={salesPoints.find((s) => s.id === selectedSalesPoint)?.name}
                onImageUpload={handleImageUpload}
                uploading={uploading}
              />
            </CardContent>
          </Card>

          {/* Sales Point selector */}
          {salesPoints.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-xs space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    {t("cards.salesPoint")}
                  </Label>
                  <Select value={selectedSalesPoint} onValueChange={setSelectedSalesPoint}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("cards.salesPointPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {salesPoints.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-12 w-full" />
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  {t("cards.noUsersFound")}
                </p>
              ) : (
                <Button
                  onClick={generatePDF}
                  disabled={generating || selectedUsers.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PrinterIcon className="me-2 h-4 w-4" />
                  )}
                  {t("cards.generatePdf")} ({selectedUsers.length} {t("cards.cards")})
                </Button>
              )}
              {pdfProgress && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("cards.generatingCards")} {pdfProgress.current}/{pdfProgress.total}</span>
                    <Badge variant="secondary" className="text-xs">{pdfProgress.percent}%</Badge>
                  </div>
                  <Progress value={pdfProgress.percent} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>{t("cards.cardBatches")}</CardTitle>
            <CardDescription>
              {t("cards.cardBatchesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <Skeleton className="h-32 w-full" />
            ) : batches.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                {t("cards.noBatches")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cards.date")}</TableHead>
                    <TableHead>{t("common.profile")}</TableHead>
                    <TableHead>{t("cards.quantity")}</TableHead>
                    <TableHead>{t("cards.sold")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="w-[60px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {batch.profileName}
                      </TableCell>
                      <TableCell>{batch.totalCards}</TableCell>
                      <TableCell>{batch.soldCards}</TableCell>
                      <TableCell>
                        {batch.soldCards === batch.totalCards ? (
                          <Badge>{t("cards.allSold")}</Badge>
                        ) : batch.soldCards > 0 ? (
                          <Badge variant="secondary">{t("cards.partial")}</Badge>
                        ) : (
                          <Badge variant="outline">{t("cards.available")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteBatchDialogId(batch.id)}
                          disabled={deletingBatchId === batch.id}
                          aria-label={t("common.delete")}
                        >
                          {deletingBatchId === batch.id ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <AlertDialog open={!!deleteBatchDialogId} onOpenChange={(open) => !open && setDeleteBatchDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cards.deleteBatch")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cards.deleteBatchConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteBatchDialogId) { deleteBatch(deleteBatchDialogId); } setDeleteBatchDialogId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
