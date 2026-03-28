"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { SearchIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

interface User {
  id: string;
  username: string;
  password: string;
  profile: string;
  disabled: boolean;
}

interface HotspotUser {
  id: string;
  name: string;
  password: string;
  profile: string;
  disabled: boolean;
}

interface Sale {
  id: string;
  customerName: string;
  username: string;
  profileName: string;
  price: string;
  method: string;
  createdAt: string;
}

export function SearchContent() {
  const { t } = useDictionary();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<{ active: User[]; inactive: User[] }>({
    active: [],
    inactive: [],
  });
  const [hotspot, setHotspot] = useState<HotspotUser[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const q = query.toLowerCase();

      // Fetch from Mikrotik + DB in parallel
      const [usersRes, hotspotRes, routersRes] = await Promise.all([
        fetch("/api/mikrotik/users"),
        fetch("/api/mikrotik/hotspot"),
        fetch("/api/routers"),
      ]);

      const usersData = await usersRes.json();
      const hotspotData = await hotspotRes.json();

      setUsers({
        active: (usersData.active || []).filter((u: User) =>
          u.username.toLowerCase().includes(q)
        ),
        inactive: (usersData.inactive || []).filter((u: User) =>
          u.username.toLowerCase().includes(q)
        ),
      });
      setHotspot(
        (Array.isArray(hotspotData) ? hotspotData : []).filter(
          (u: HotspotUser) => u.name.toLowerCase().includes(q)
        )
      );

      // Search sales from DB
      if (routersRes.ok) {
        const routers = await routersRes.json();
        const defaultRouter =
          routers.find((r: { isDefault: boolean }) => r.isDefault) ||
          routers[0];

        if (defaultRouter) {
          const salesRes = await fetch(
            `/api/sales?routerId=${defaultRouter.id}&limit=100`
          );
          if (salesRes.ok) {
            const salesData = await salesRes.json();
            setSales(
              (salesData.sales || []).filter(
                (s: Sale) =>
                  s.customerName.toLowerCase().includes(q) ||
                  s.username.toLowerCase().includes(q) ||
                  s.profileName.toLowerCase().includes(q)
              )
            );
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const totalResults =
    users.active.length + users.inactive.length + hotspot.length + sales.length;

  return (
    <>
      <form onSubmit={handleSearch} className="flex items-end gap-2">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder={t("searchPage.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="mr-2 h-4 w-4" />
          )}
          {t("common.search")}
        </Button>
      </form>

      {searched && !loading && (
        <p className="text-sm text-muted-foreground">
          {t("searchPage.foundResults").replace("{count}", String(totalResults))} &quot;{query}&quot;
        </p>
      )}

      {searched && (
        <Tabs defaultValue="usermanager">
          <TabsList>
            <TabsTrigger value="usermanager">
              {t("searchPage.userManager")} ({users.active.length + users.inactive.length})
            </TabsTrigger>
            <TabsTrigger value="hotspot">
              {t("searchPage.hotspot")} ({hotspot.length})
            </TabsTrigger>
            <TabsTrigger value="sales">{t("searchPage.salesTab")} ({sales.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="usermanager">
            <Card>
              <CardContent className="pt-6">
                {users.active.length + users.inactive.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("searchPage.noMatchingUsers")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.username")}</TableHead>
                        <TableHead>{t("common.profile")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...users.active, ...users.inactive].map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.username}
                          </TableCell>
                          <TableCell>{u.profile || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.disabled ? "destructive" : "default"}
                            >
                              {u.disabled ? t("common.disabled") : t("common.active")}
                            </Badge>
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
                {hotspot.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("searchPage.noMatchingHotspot")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("common.profile")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotspot.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.name}
                          </TableCell>
                          <TableCell>{u.profile || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.disabled ? "destructive" : "default"}
                            >
                              {u.disabled ? t("common.disabled") : t("common.active")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sales">
            <Card>
              <CardContent className="pt-6">
                {sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("searchPage.noMatchingSales")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("searchPage.date")}</TableHead>
                        <TableHead>{t("searchPage.customer")}</TableHead>
                        <TableHead>{t("common.username")}</TableHead>
                        <TableHead>{t("common.profile")}</TableHead>
                        <TableHead>{t("searchPage.price")}</TableHead>
                        <TableHead>{t("searchPage.method")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.customerName}
                          </TableCell>
                          <TableCell>{s.username}</TableCell>
                          <TableCell>{s.profileName}</TableCell>
                          <TableCell>
                            ${Number(s.price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{s.method}</Badge>
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
      )}
    </>
  );
}
