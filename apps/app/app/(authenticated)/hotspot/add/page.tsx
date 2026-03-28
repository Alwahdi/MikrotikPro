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
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/page-header";
import { useDictionary } from "@/i18n/dictionary-provider";

interface Profile {
  id: string;
  name: string;
}

export default function AddHotspotUserPage() {
  const router = useRouter();
  const { t } = useDictionary();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    name: "",
    userPassword: "",
    profile: "default",
  });

  useEffect(() => {
    fetch("/api/mikrotik/profiles?type=hotspot")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProfiles(data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mikrotik/hotspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add user");
        return;
      }

      router.push("/hotspot");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader page={t("hotspotAdd.title")} pages={["MUMS", t("hotspotPage.title")]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{t("hotspotAdd.addHotspotUser")}</CardTitle>
            <CardDescription>
              {t("hotspotAdd.createDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.userPassword}
                  onChange={(e) =>
                    setForm({ ...form, userPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile">{t("common.profile")}</Label>
                <Select
                  value={form.profile}
                  onValueChange={(v) => setForm({ ...form, profile: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("hotspotAdd.selectProfile")} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("users.addUser")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/hotspot")}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
