"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
  Trash2Icon,
  BanIcon,
  CheckCircleIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/i18n/dictionary-provider";

interface HotspotUser {
  id: string;
  name: string;
  password: string;
  profile: string;
  uptime: string;
  limitUptime: string;
  bytesIn: string;
  bytesOut: string;
  limitBytesTotal: string;
  disabled: boolean;
  comment: string;
}

export function HotspotContent() {
  const [users, setUsers] = useState<HotspotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { t } = useDictionary();

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/hotspot");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAction = async (
    id: string,
    action: "disable" | "enable" | "delete"
  ) => {
    setActionLoading(id);
    try {
      if (action === "delete") {
        await fetch(`/api/mikrotik/hotspot/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/mikrotik/hotspot/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      await loadUsers();
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("hotspotPage.hotspotUsers").replace("{count}", String(users.length))}
        </h3>
        <Button asChild>
          <Link href="/hotspot/add">
            <PlusIcon className="me-2 h-4 w-4" />
            {t("hotspotPage.addHotspotUser")}
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.profile")}</TableHead>
                <TableHead>{t("hotspotPage.uptime")}</TableHead>
                <TableHead>{t("hotspotPage.download")}</TableHead>
                <TableHead>{t("hotspotPage.upload")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    {t("hotspotPage.noHotspotUsers")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.profile || "—"}</TableCell>
                    <TableCell>{user.uptime}</TableCell>
                    <TableCell>{user.bytesIn}</TableCell>
                    <TableCell>{user.bytesOut}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.disabled ? "destructive" : "default"}
                      >
                        {user.disabled ? t("common.disabled") : t("common.active")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {user.disabled ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.enable")}
                            onClick={() => handleAction(user.id, "enable")}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.disable")}
                            onClick={() => handleAction(user.id, "disable")}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                              <BanIcon className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={t("common.delete")}>
                              <Trash2Icon className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("users.deleteUser")}</DialogTitle>
                              <DialogDescription>
                                {t("common.deleteConfirm")}
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() => handleAction(user.id, "delete")}
                                disabled={actionLoading === user.id}
                              >
                                {t("common.delete")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
