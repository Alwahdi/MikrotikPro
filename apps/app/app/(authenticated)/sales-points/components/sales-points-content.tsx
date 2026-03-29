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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  PlusIcon,
  Loader2Icon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

interface SalesPoint {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export function SalesPointsContent() {
  const { t } = useDictionary();
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchSalesPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/sales-points");
      if (res.ok) {
        const data = await res.json();
        setSalesPoints(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesPoints();
  }, [fetchSalesPoints]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (sp: SalesPoint) => {
    setEditingId(sp.id);
    setName(sp.name);
    setDescription(sp.description || "");
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const url = editingId
        ? `/api/sales-points/${editingId}`
        : "/api/sales-points";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setDialogOpen(false);
      fetchSalesPoints();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("salesPoints.deleteSalesPoint"))) return;
    try {
      await fetch(`/api/sales-points/${id}`, { method: "DELETE" });
      fetchSalesPoints();
    } catch {
      // ignore
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("salesPoints.title")}</CardTitle>
          <CardDescription>
            {t("salesPoints.manageSalesPoints")}
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <PlusIcon className="me-2 h-4 w-4" />
              {t("salesPoints.addSalesPoint")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? t("salesPoints.editSalesPoint") : t("salesPoints.newSalesPoint")}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? t("salesPoints.updateDesc")
                  : t("salesPoints.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sp-name">{t("common.name")}</Label>
                <Input
                  id="sp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("salesPoints.mainOfficePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-desc">{t("salesPoints.description")}</Label>
                <Input
                  id="sp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("salesPoints.optionalDesc")}
                />
              </div>
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={submitting || !name.trim()}>
                {submitting ? (
                  <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? t("common.update") : t("salesPoints.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : salesPoints.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <MapPinIcon className="h-8 w-8" />
            <p>{t("salesPoints.noSalesPoints")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("salesPoints.description")}</TableHead>
                <TableHead>{t("salesPoints.created")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesPoints.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{sp.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sp.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(sp.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(sp)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sp.id)}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
