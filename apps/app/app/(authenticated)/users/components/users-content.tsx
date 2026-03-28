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
          <TableHead>Username</TableHead>
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
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No users found
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
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete "{user.username}"? This
                          action cannot be undone.
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
                            "Delete"
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
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactive.length})
          </TabsTrigger>
        </TabsList>
        <Button asChild>
          <Link href="/users/add">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>
      <TabsContent value="active">
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>{renderTable(active)}</CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="inactive">
        <Card>
          <CardHeader>
            <CardTitle>Inactive Users</CardTitle>
          </CardHeader>
          <CardContent>{renderTable(inactive)}</CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
