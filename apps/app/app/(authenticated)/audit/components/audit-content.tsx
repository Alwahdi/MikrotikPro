"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/i18n/dictionary-provider";

interface AuditEntry {
  id: string;
  routerId: string | null;
  clerkUserId: string;
  action: string;
  target: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  "router": "default",
  "user": "secondary",
  "sale": "outline",
  "card": "outline",
  "hotspot": "secondary",
};

function getActionBadgeVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  const prefix = action.split(".")[0];
  if (action.includes("delete") || action.includes("disable")) return "destructive";
  return (ACTION_COLORS[prefix] as "default" | "secondary" | "outline") || "default";
}

export function AuditContent() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const { t } = useDictionary();
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
        });
        if (actionFilter !== "all") {
          params.set("action", actionFilter);
        }

        const res = await fetch(`/api/audit?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 0 });
      } catch {
        toast.error(t("common.networkError"));
      } finally {
        setLoading(false);
      }
    },
    [actionFilter]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("audit.filterByAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allActions")}</SelectItem>
            <SelectItem value="router">{t("audit.routerAction")}</SelectItem>
            <SelectItem value="user">{t("audit.userAction")}</SelectItem>
            <SelectItem value="hotspot">{t("audit.hotspotAction")}</SelectItem>
            <SelectItem value="sale">{t("audit.salesAction")}</SelectItem>
            <SelectItem value="card">{t("audit.cardsAction")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {pagination.total} {t("audit.entries")}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("audit.noEntries")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audit.date")}</TableHead>
                  <TableHead>{t("audit.action")}</TableHead>
                  <TableHead>{t("audit.target")}</TableHead>
                  <TableHead>{t("audit.user")}</TableHead>
                  <TableHead>{t("audit.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.target || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {log.clerkUserId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.details || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => loadLogs(pagination.page - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            {t("common.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("audit.pageOf").replace("{page}", String(pagination.page)).replace("{pages}", String(pagination.pages))}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => loadLogs(pagination.page + 1)}
          >
            {t("common.next")}
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
