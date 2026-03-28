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
  UploadIcon,
  ImageIcon,
  TrashIcon,
  SettingsIcon,
  MapPinIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
}

const DEFAULT_SETTINGS = {
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

export function CardsContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Print settings
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // Print profiles
  const [printProfiles, setPrintProfiles] = useState<PrintProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Sales points
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState("");

  // DB state
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [routerId, setRouterId] = useState<string | null>(null);

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
        // ignore
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch print profiles
  useEffect(() => {
    fetch("/api/print-profiles")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPrintProfiles(data);
      })
      .catch(() => {});
  }, []);

  // Fetch sales points
  useEffect(() => {
    fetch("/api/sales-points")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSalesPoints(data);
      })
      .catch(() => {});
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
      // ignore
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
      setSettings({
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

  // Save current settings as a print profile
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/print-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, ...settings }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPrintProfiles((prev) => [saved, ...prev]);
        setSelectedProfileId(saved.id);
        setSaveDialogOpen(false);
        setProfileName("");
      }
    } catch {
      // ignore
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
        setSettings({ ...DEFAULT_SETTINGS });
      }
    } catch {
      // ignore
    }
  };

  // Delete a card batch
  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this card batch? This cannot be undone.")) return;
    setDeletingBatchId(id);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBatches((prev) => prev.filter((b) => b.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete batch");
      }
    } catch {
      alert("Network error while deleting batch");
    } finally {
      setDeletingBatchId(null);
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
        setSettings((prev) => ({ ...prev, imageUrl: data.url }));
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const cols = settings.columns;
      const rowsPerPage = settings.rows;
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const gapX = 3;
      const gapY = 3;
      const cw = settings.cardWidth || Math.floor((pageWidth - margin * 2 - (cols - 1) * gapX) / cols);
      const ch = settings.cardHeight || Math.floor((pageHeight - margin * 2 - (rowsPerPage - 1) * gapY) / rowsPerPage);

      const selected = users.filter((u) => selectedUsers.includes(u.id));
      const cardsPerPage = cols * rowsPerPage;

      for (let i = 0; i < selected.length; i++) {
        const pageIdx = Math.floor(i / cardsPerPage);
        const posOnPage = i % cardsPerPage;
        const row = Math.floor(posOnPage / cols);
        const col = posOnPage % cols;

        if (i > 0 && posOnPage === 0) {
          doc.addPage();
        }

        const x = margin + col * (cw + gapX);
        const y = margin + row * (ch + gapY);

        // Draw background image if set
        if (settings.imageUrl) {
          try {
            doc.addImage(settings.imageUrl, "JPEG", x, y, cw, ch);
          } catch {
            // If image fails, draw a border instead
            doc.setDrawColor(200);
            doc.rect(x, y, cw, ch);
          }
        } else {
          doc.setDrawColor(200);
          doc.rect(x, y, cw, ch);
        }

        const user = selected[i];
        if (!user) continue;
        doc.setFontSize(settings.fontSize);
        doc.setTextColor(0, 0, 0);

        if (settings.showUsername) {
          doc.text(user.username, x + settings.userX, y + settings.userY);
        }
        if (settings.showPassword) {
          doc.text(user.password, x + settings.passX, y + settings.passY);
        }
        const baseY = Math.max(settings.userY, settings.passY);
        if (settings.showProfile && user.profile) {
          doc.text(user.profile, x + settings.userX, y + baseY + 7);
        }
        if (settings.showSalesPoint && selectedSalesPoint) {
          const spName = salesPoints.find((s) => s.id === selectedSalesPoint)?.name || "";
          const spY = baseY + (settings.showProfile && user.profile ? 14 : 7);
          doc.text(spName, x + settings.userX, y + spY);
        }
      }

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

      doc.save("mums-cards.pdf");
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tabs defaultValue="generate">
      <TabsList>
        <TabsTrigger value="generate">Generate Cards</TabsTrigger>
        <TabsTrigger value="history">
          History{" "}
          {batches.length > 0 && (
            <Badge variant="secondary" className="ml-1">
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
                <CardTitle className="text-base">Print Profile</CardTitle>
                <div className="flex gap-2">
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <SaveIcon className="mr-1 h-4 w-4" />
                        Save Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Print Profile</DialogTitle>
                        <DialogDescription>
                          Save current settings as a reusable print profile.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4">
                        <Label>Profile Name</Label>
                        <Input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="e.g. Hotspot Cards A4"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()}>
                          {savingProfile ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save
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
                    <SelectValue placeholder="Load a saved profile..." />
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
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Card Layout Settings
              </CardTitle>
              <CardDescription>
                Configure card layout, positioning, and background image for PDF generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Layout */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Select
                    value={String(settings.columns)}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, columns: Number(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rows per page</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.rows}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, rows: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    min="6"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Users selected</Label>
                  <p className="text-sm text-muted-foreground pt-2">
                    {selectedUsers.length} of {users.length}
                  </p>
                </div>
              </div>

              {/* Text positioning */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Username X</Label>
                  <Input
                    type="number"
                    value={settings.userX}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, userX: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username Y</Label>
                  <Input
                    type="number"
                    value={settings.userY}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, userY: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password X</Label>
                  <Input
                    type="number"
                    value={settings.passX}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, passX: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password Y</Label>
                  <Input
                    type="number"
                    value={settings.passY}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, passY: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Card size override */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Card Width (mm)</Label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={settings.cardWidth ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        cardWidth: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Height (mm)</Label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={settings.cardHeight ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        cardHeight: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Visibility toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showUsername}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showUsername: e.target.checked }))
                    }
                  />
                  Show Username
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showPassword}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showPassword: e.target.checked }))
                    }
                  />
                  Show Password
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showProfile}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showProfile: e.target.checked }))
                    }
                  />
                  Show Profile
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showSalesPoint}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, showSalesPoint: e.target.checked }))
                    }
                  />
                  Show Sales Point
                </label>
              </div>

              {/* Sales Point selector */}
              {salesPoints.length > 0 && (
                <div className="max-w-xs space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    Sales Point
                  </Label>
                  <Select value={selectedSalesPoint} onValueChange={setSelectedSalesPoint}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional - assign to sales point" />
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
              )}

              {/* Background Image */}
              <div className="space-y-2">
                <Label>Background Image</Label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UploadIcon className="mr-2 h-4 w-4" />
                    )}
                    Upload Image
                  </Button>
                  {settings.imageUrl && (
                    <>
                      <Badge variant="secondary">
                        <ImageIcon className="mr-1 h-3 w-3" />
                        Image set
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSettings((s) => ({ ...s, imageUrl: null }))
                        }
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                {settings.imageUrl && (
                  <img
                    src={settings.imageUrl}
                    alt="Card background preview"
                    className="mt-2 h-20 rounded border object-contain"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-12 w-full" />
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  No users found. Connect to a router first.
                </p>
              ) : (
                <Button
                  onClick={generatePDF}
                  disabled={generating || selectedUsers.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PrinterIcon className="mr-2 h-4 w-4" />
                  )}
                  Generate PDF ({selectedUsers.length} cards)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Card Batches</CardTitle>
            <CardDescription>
              Previously generated card batches and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <Skeleton className="h-32 w-full" />
            ) : batches.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No card batches generated yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
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
                          <Badge>All Sold</Badge>
                        ) : batch.soldCards > 0 ? (
                          <Badge variant="secondary">Partial</Badge>
                        ) : (
                          <Badge variant="outline">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteBatch(batch.id)}
                          disabled={deletingBatchId === batch.id}
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
    </Tabs>
  );
}
