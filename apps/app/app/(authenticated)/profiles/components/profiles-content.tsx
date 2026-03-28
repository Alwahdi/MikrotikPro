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
import { useDictionary } from "@/i18n/dictionary-provider";

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
  const { t } = useDictionary();
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
          {t("profiles.title")} ({profiles.length + hotspotProfiles.length})
        </h3>
        <Button asChild>
          <Link href="/profiles/add">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("profiles.addProfile")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="usermanager">
        <TabsList>
          <TabsTrigger value="usermanager">
            {t("profiles.userManager")} ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="hotspot">
            {t("profiles.hotspot")} ({hotspotProfiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usermanager">
          <Card>
            <CardContent className="pt-6">
              {profiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {t("profiles.noUmProfiles")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("profiles.price")}</TableHead>
                      <TableHead>{t("profiles.validity")}</TableHead>
                      <TableHead className="w-[80px]">{t("common.actions")}</TableHead>
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
                            <span className="text-muted-foreground">{t("common.free")}</span>
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
                  {t("profiles.noHsProfiles")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("profiles.rateLimit")}</TableHead>
                      <TableHead>{t("profiles.sharedUsers")}</TableHead>
                      <TableHead className="w-[80px]">{t("common.actions")}</TableHead>
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
            <AlertDialogTitle>{t("profiles.deleteProfile")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("profiles.deleteProfileConfirm")}&quot;{deleteTarget?.name}&quot;{t("profiles.deleteProfileSuffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
