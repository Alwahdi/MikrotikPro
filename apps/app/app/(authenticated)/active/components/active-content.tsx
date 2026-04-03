"use client";

import {
  Card,
  CardContent,
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
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/i18n/dictionary-provider";

interface ActiveConnection {
  id: string;
  user: string;
  uptime: string;
  address: string;
  bytesIn: string;
  bytesOut: string;
  macAddress: string;
}

export function ActiveContent() {
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useDictionary();

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/active");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setConnections(data);
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

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
    <Card>
      <CardHeader>
        <CardTitle>{t("active.activeConns").replace("{count}", String(connections.length))}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("active.user")}</TableHead>
              <TableHead>{t("active.uptime")}</TableHead>
              <TableHead>{t("active.ipAddress")}</TableHead>
              <TableHead>{t("active.macAddress")}</TableHead>
              <TableHead>{t("active.download")}</TableHead>
              <TableHead>{t("active.upload")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {t("active.noActiveConns")}
                </TableCell>
              </TableRow>
            ) : (
              connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell className="font-medium">{conn.user}</TableCell>
                  <TableCell>{conn.uptime}</TableCell>
                  <TableCell>{conn.address}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {conn.macAddress}
                  </TableCell>
                  <TableCell>{conn.bytesIn}</TableCell>
                  <TableCell>{conn.bytesOut}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
