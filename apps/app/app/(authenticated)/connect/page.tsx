"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  RouterIcon,
  Loader2Icon,
  SaveIcon,
  TrashIcon,
  StarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

interface SavedRouter {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  version: number;
  isDefault: boolean;
}

export default function ConnectPage() {
  const router = useRouter();
  const { t } = useDictionary();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedRouters, setSavedRouters] = useState<SavedRouter[]>([]);
  const [loadingRouters, setLoadingRouters] = useState(true);
  const [form, setForm] = useState({
    host: "",
    port: "8728",
    user: "admin",
    password: "",
    name: "",
    saveToDb: true,
  });

  const fetchSavedRouters = useCallback(async () => {
    try {
      const res = await fetch("/api/routers");
      if (res.ok) {
        const data = await res.json();
        setSavedRouters(data);
      }
    } catch {
      // no saved routers
    } finally {
      setLoadingRouters(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedRouters();
  }, [fetchSavedRouters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Test connection via Mikrotik API
      const res = await fetch("/api/mikrotik/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          port: form.port,
          user: form.user,
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Connection failed");
        return;
      }

      // 2. Save to database if requested
      if (form.saveToDb && form.name) {
        const versionNum = data.routerInfo?.version
          ? Number.parseInt(data.routerInfo.version.charAt(0), 10)
          : 7;

        await fetch("/api/routers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            host: form.host,
            port: Number(form.port),
            username: form.user,
            password: form.password,
            version: versionNum,
          }),
        });
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const connectSaved = async (saved: SavedRouter) => {
    setLoading(true);
    setError("");

    try {
      // Fetch the full router (with password) isn't exposed, so we
      // use a dedicated endpoint to connect by saved router ID
      const res = await fetch(`/api/routers/${saved.id}/connect`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Connection failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const deleteSaved = async (id: string) => {
    try {
      await fetch(`/api/routers/${id}`, { method: "DELETE" });
      fetchSavedRouters();
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
      fetchSavedRouters();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4">
      {/* Saved Routers */}
      {!loadingRouters && savedRouters.length > 0 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">{t("connect.savedRouters")}</CardTitle>
            <CardDescription>
              {t("connect.quickConnect")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedRouters.map((sr) => (
              <div
                key={sr.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{sr.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      v{sr.version}
                    </Badge>
                    {sr.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("common.default")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sr.host}:{sr.port} ({sr.username})
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!sr.isDefault && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setDefault(sr.id)}
                      title={t("routers.setAsDefault")}
                    >
                      <StarIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => connectSaved(sr)}
                    disabled={loading}
                  >
                    {t("common.connect")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteSaved(sr.id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* New Connection Form */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RouterIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("connect.title")}</CardTitle>
          <CardDescription>
            {t("connect.enterCredentials")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="host">{t("connect.hostLabel")}</Label>
              <Input
                id="host"
                placeholder={t("connect.hostPlaceholder")}
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">{t("connect.portLabel")}</Label>
              <Input
                id="port"
                type="number"
                placeholder={t("connect.portPlaceholder")}
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">{t("common.username")}</Label>
              <Input
                id="user"
                placeholder={t("connect.adminPlaceholder")}
                value={form.user}
                onChange={(e) => setForm({ ...form, user: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("connect.passwordPlaceholder")}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="name">
                {t("connect.routerName")}
                <span className="text-muted-foreground">{t("connect.saveForLater")}</span>
              </Label>
              <Input
                id="name"
                placeholder={t("connect.namePlaceholder")}
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value, saveToDb: true })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("connect.nameHelp")}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.connecting")}
                </>
              ) : form.name ? (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  {t("connect.saveAndConnect")}
                </>
              ) : (
                t("common.connect")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
