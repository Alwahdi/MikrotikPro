"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
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
import { PlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Profile {
  id: string;
  name: string;
  price: string;
  validity: string;
}

interface HotspotProfile {
  id: string;
  name: string;
  "rate-limit"?: string;
  "shared-users"?: string;
}

export function ProfilesContent() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hotspotProfiles, setHotspotProfiles] = useState<HotspotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "usermanager" | "hotspot";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const [umRes, hsRes] = await Promise.all([
        fetch("/api/mikrotik/profiles"),
        fetch("/api/mikrotik/profiles?type=hotspot"),
      ]);

      if (umRes.ok) {
        const data = await umRes.json();
        if (Array.isArray(data)) setProfiles(data);
      }
      if (hsRes.ok) {
        const data = await hsRes.json();
        if (Array.isArray(data)) setHotspotProfiles(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/mikrotik/profiles?id=${deleteTarget.id}&type=${deleteTarget.type}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        if (deleteTarget.type === "usermanager") {
          setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        } else {
          setHotspotProfiles((prev) =>
            prev.filter((p) => p.id !== deleteTarget.id)
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
          Profiles ({profiles.length + hotspotProfiles.length})
        </h3>
        <Button asChild>
          <Link href="/profiles/add">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Profile
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="usermanager">
        <TabsList>
          <TabsTrigger value="usermanager">
            User Manager ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="hotspot">
            Hotspot ({hotspotProfiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usermanager">
          <Card>
            <CardContent className="pt-6">
              {profiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No User Manager profiles found. Connect to a router first.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.name}
                        </TableCell>
                        <TableCell>
                          {profile.price && profile.price !== "0" ? (
                            <Badge variant="secondary">
                              ${profile.price}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Free</span>
                          )}
                        </TableCell>
                        <TableCell>{profile.validity || "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: "usermanager",
                                id: profile.id,
                                name: profile.name,
                              })
                            }
                          >
                            <Trash2Icon className="h-4 w-4" />
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

        <TabsContent value="hotspot">
          <Card>
            <CardContent className="pt-6">
              {hotspotProfiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No Hotspot profiles found. Connect to a router first.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Shared Users</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotspotProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.name}
                        </TableCell>
                        <TableCell>
                          {profile["rate-limit"] || "—"}
                        </TableCell>
                        <TableCell>
                          {profile["shared-users"] || "1"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: "hotspot",
                                id: profile.id,
                                name: profile.name,
                              })
                            }
                          >
                            <Trash2Icon className="h-4 w-4" />
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This will remove the profile from the router. Users assigned to
              this profile may lose their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
