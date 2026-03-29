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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  PlusIcon,
  Trash2Icon,
  BanIcon,
  CheckCircleIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

interface User {
  id: string;
  username: string;
  password: string;
  profile: string;
  uptimeUsed: string;
  downloadUsed: string;
  uploadUsed: string;
  disabled: boolean;
  lastSeen: string;
}

export function UsersContent() {
  const [active, setActive] = useState<User[]>([]);
  const [inactive, setInactive] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { t } = useDictionary();

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/users");
      if (!res.ok) return;
      const data = await res.json();
      setActive(data.active || []);
      setInactive(data.inactive || []);
    } catch {
      // ignore
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
        await fetch(`/api/mikrotik/users/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/mikrotik/users/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      await loadUsers();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const renderTable = (users: User[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("common.username")}</TableHead>
          <TableHead>{t("common.profile")}</TableHead>
          <TableHead>{t("users.uptime")}</TableHead>
          <TableHead>{t("users.download")}</TableHead>
          <TableHead>{t("users.upload")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead className="text-end">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              {t("users.noUsersFound")}
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.profile || "—"}</TableCell>
              <TableCell>{user.uptimeUsed}</TableCell>
              <TableCell>{user.downloadUsed}</TableCell>
              <TableCell>{user.uploadUsed}</TableCell>
              <TableCell>
                <Badge variant={user.disabled ? "destructive" : "default"}>
                  {user.disabled ? t("common.disabled") : t("common.active")}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-1">
                  {user.disabled ? (
                    <Button
                      variant="ghost"
                      size="icon"
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
                      <Button variant="ghost" size="icon">
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("users.deleteUser")}</DialogTitle>
                        <DialogDescription>
                          {t("users.deleteUserConfirm")}"{user.username}"{t("users.deleteUserSuffix")}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => handleAction(user.id, "delete")}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            t("common.delete")
                          )}
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
  );

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
    <Tabs defaultValue="active">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="active">
            {t("users.activeUsers")} ({active.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            {t("users.inactiveUsers")} ({inactive.length})
          </TabsTrigger>
        </TabsList>
        <Button asChild>
          <Link href="/users/add">
            <PlusIcon className="me-2 h-4 w-4" />
            {t("users.addUser")}
          </Link>
        </Button>
      </div>
      <TabsContent value="active">
        <Card>
          <CardHeader>
            <CardTitle>{t("users.activeUsers")}</CardTitle>
          </CardHeader>
          <CardContent>{renderTable(active)}</CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="inactive">
        <Card>
          <CardHeader>
            <CardTitle>{t("users.inactiveUsers")}</CardTitle>
          </CardHeader>
          <CardContent>{renderTable(inactive)}</CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
