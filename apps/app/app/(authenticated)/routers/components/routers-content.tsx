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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  RouterIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  PlugIcon,
  Loader2Icon,
  PencilIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface SavedRouter {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  version: number;
  isDefault: boolean;
  createdAt: string;
}

export function RoutersContent() {
  const router = useRouter();
  const [routers, setRouters] = useState<SavedRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8728");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const fetchRouters = useCallback(async () => {
    try {
      const res = await fetch("/api/routers");
      if (res.ok) {
        setRouters(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  const resetForm = () => {
    setName("");
    setHost("");
    setPort("8728");
    setUsername("admin");
    setPassword("");
    setEditId(null);
  };

  const handleSave = async () => {
    if (!name || !host || !username || !password) return;
    setSubmitting(true);

    try {
      if (editId) {
        await fetch(`/api/routers/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            host,
            port: Number(port),
            username,
            password,
          }),
        });
      } else {
        await fetch("/api/routers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            host,
            port: Number(port),
            username,
            password,
          }),
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchRouters();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const connectRouter = async (id: string) => {
    setConnecting(id);
    try {
      const res = await fetch(`/api/routers/${id}/connect`, {
        method: "POST",
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setConnecting(null);
    }
  };

  const deleteRouter = async (id: string) => {
    try {
      await fetch(`/api/routers/${id}`, { method: "DELETE" });
      fetchRouters();
    } catch {
      // ignore
    }
  };

  const setDefault = async (id: string) => {
    try {
      await fetch(`/api/routers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchRouters();
    } catch {
      // ignore
    }
  };

  const openEdit = (r: SavedRouter) => {
    setEditId(r.id);
    setName(r.name);
    setHost(r.host);
    setPort(String(r.port));
    setUsername(r.username);
    setPassword("");
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Saved Routers</CardTitle>
          <CardDescription>
            Manage your Mikrotik router connections
          </CardDescription>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Router
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit Router" : "Add Router"}
              </DialogTitle>
              <DialogDescription>
                {editId
                  ? "Update this router's connection details."
                  : "Save a new router for quick connections."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="routerName">Name</Label>
                <Input
                  id="routerName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Office Router"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="routerHost">Host / IP</Label>
                  <Input
                    id="routerHost"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routerPort">Port</Label>
                  <Input
                    id="routerPort"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routerUser">Username</Label>
                  <Input
                    id="routerUser"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routerPass">Password</Label>
                  <Input
                    id="routerPass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editId ? "Leave blank to keep" : ""}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting || !name || !host || !username || (!password && !editId)}
              >
                {submitting ? "Saving..." : editId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {routers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <RouterIcon className="mx-auto mb-3 h-10 w-10" />
            <p>No routers saved yet.</p>
            <p className="text-sm">
              Add a router or go to the{" "}
              <a href="/connect" className="underline">
                Connect page
              </a>{" "}
              to save one.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {r.name}
                      {r.isDefault && (
                        <Badge variant="secondary" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{r.host}</TableCell>
                  <TableCell>{r.port}</TableCell>
                  <TableCell>{r.username}</TableCell>
                  <TableCell>v{r.version}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!r.isDefault && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setDefault(r.id)}
                          title="Set as default"
                        >
                          <StarIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(r)}
                        title="Edit"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectRouter(r.id)}
                        disabled={connecting === r.id}
                      >
                        {connecting === r.id ? (
                          <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PlugIcon className="mr-1 h-3.5 w-3.5" />
                        )}
                        Connect
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteRouter(r.id)}
                        title="Delete"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
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
