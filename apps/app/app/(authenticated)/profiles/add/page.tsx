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
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../../components/page-header";

export default function AddProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "0",
    validity: "",
    limitName: "",
    transferLimit: "",
    uptimeLimit: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mikrotik/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add profile");
        return;
      }

      router.push("/profiles");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader page="Add Profile" pages={["MUMS", "Profiles"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Add New Profile</CardTitle>
            <CardDescription>
              Create a new User Manager profile with limitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity">Validity (e.g. 30d, 1h)</Label>
                <Input
                  id="validity"
                  placeholder="30d 0h 0m 0s"
                  value={form.validity}
                  onChange={(e) =>
                    setForm({ ...form, validity: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limitName">Limitation Name</Label>
                <Input
                  id="limitName"
                  value={form.limitName}
                  onChange={(e) =>
                    setForm({ ...form, limitName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferLimit">
                  Transfer Limit (e.g. 1073741824)
                </Label>
                <Input
                  id="transferLimit"
                  placeholder="Bytes"
                  value={form.transferLimit}
                  onChange={(e) =>
                    setForm({ ...form, transferLimit: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uptimeLimit">
                  Uptime Limit (e.g. 1h, 30m)
                </Label>
                <Input
                  id="uptimeLimit"
                  placeholder="e.g. 1h 0m 0s"
                  value={form.uptimeLimit}
                  onChange={(e) =>
                    setForm({ ...form, uptimeLimit: e.target.value })
                  }
                />
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
                  Add Profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/profiles")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
