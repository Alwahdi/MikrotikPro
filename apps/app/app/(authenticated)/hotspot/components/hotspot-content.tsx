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

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/hotspot");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
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
      // ignore
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
          Hotspot Users ({users.length})
        </h3>
        <Button asChild>
          <Link href="/hotspot/add">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Hotspot User
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Download</TableHead>
                <TableHead>Upload</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No hotspot users found
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
                        {user.disabled ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                              <DialogTitle>Delete Hotspot User</DialogTitle>
                              <DialogDescription>
                                Delete "{user.name}"? This cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() => handleAction(user.id, "delete")}
                                disabled={actionLoading === user.id}
                              >
                                Delete
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
