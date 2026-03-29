"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { SearchIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

interface Session {
  user: string;
  started: string;
  uptime: string;
  upload: string;
  download: string;
}

export function SessionsContent() {
  const [username, setUsername] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { t } = useDictionary();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/mikrotik/sessions?username=${encodeURIComponent(username)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="flex items-end gap-2">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder={t("sessions.searchPlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="me-2 h-4 w-4" />
          )}
          {t("common.search")}
        </Button>
      </form>

      {searched && (
        <Card>
          <CardHeader>
            <CardTitle>{t("sessions.sessionsFor").replace("{name}", username)}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sessions.user")}</TableHead>
                    <TableHead>{t("sessions.started")}</TableHead>
                    <TableHead>{t("sessions.uptime")}</TableHead>
                    <TableHead>{t("sessions.upload")}</TableHead>
                    <TableHead>{t("sessions.download")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        {t("sessions.noSessionsFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.user}</TableCell>
                        <TableCell>{s.started}</TableCell>
                        <TableCell>{s.uptime}</TableCell>
                        <TableCell>{s.upload}</TableCell>
                        <TableCell>{s.download}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
