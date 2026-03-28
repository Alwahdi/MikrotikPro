"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  UsersIcon,
  WifiIcon,
  ActivityIcon,
  ShieldIcon,
  DollarSignIcon,
  TrendingUpIcon,
  CreditCardIcon,
  RouterIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouterConnection } from "../hooks/use-router-connection";

interface MikrotikStats {
  activeUsers: number;
  inactiveUsers: number;
  hotspotUsers: number;
  activeConnections: number;
  profiles: number;
}

interface DbStats {
  totalSales: number;
  totalRevenue: number;
  cardsSold: number;
  cardsTotal: number;
  routerCount: number;
}

export function DashboardContent() {
  const { isConnected, isLoading: connLoading } = useRouterConnection();
  const [mikrotik, setMikrotik] = useState<MikrotikStats | null>(null);
  const [db, setDb] = useState<DbStats | null>(null);
  const [loadingMk, setLoadingMk] = useState(true);
  const [loadingDb, setLoadingDb] = useState(true);

  // Load database stats (always, doesn't need router connection)
  useEffect(() => {
    async function loadDbStats() {
      try {
        const routersRes = await fetch("/api/routers");
        if (!routersRes.ok) {
          setLoadingDb(false);
          return;
        }
        const routers = await routersRes.json();
        if (routers.length === 0) {
          setDb({
            totalSales: 0,
            totalRevenue: 0,
            cardsSold: 0,
            cardsTotal: 0,
            routerCount: 0,
          });
          setLoadingDb(false);
          return;
        }

        const defaultRouter =
          routers.find((r: { isDefault: boolean }) => r.isDefault) ||
          routers[0];

        const summaryRes = await fetch(
          `/api/sales/summary?routerId=${defaultRouter.id}`
        );
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          setDb({
            totalSales: summary.totalSales || 0,
            totalRevenue: Number(summary.totalRevenue) || 0,
            cardsSold: summary.cards?.sold || 0,
            cardsTotal: summary.cards?.total || 0,
            routerCount: routers.length,
          });
        }
      } catch {
        // ignore
      } finally {
        setLoadingDb(false);
      }
    }
    loadDbStats();
  }, []);

  // Load Mikrotik stats (only when connected)
  useEffect(() => {
    if (!isConnected || connLoading) {
      setLoadingMk(false);
      return;
    }

    async function loadStats() {
      try {
        const [usersRes, hotspotRes, activeRes, profilesRes] =
          await Promise.all([
            fetch("/api/mikrotik/users"),
            fetch("/api/mikrotik/hotspot"),
            fetch("/api/mikrotik/active"),
            fetch("/api/mikrotik/profiles"),
          ]);

        const users = await usersRes.json();
        const hotspot = await hotspotRes.json();
        const active = await activeRes.json();
        const profiles = await profilesRes.json();

        setMikrotik({
          activeUsers: users.active?.length || 0,
          inactiveUsers: users.inactive?.length || 0,
          hotspotUsers: Array.isArray(hotspot) ? hotspot.length : 0,
          activeConnections: Array.isArray(active) ? active.length : 0,
          profiles: Array.isArray(profiles) ? profiles.length : 0,
        });
      } catch {
        // ignore
      } finally {
        setLoadingMk(false);
      }
    }
    loadStats();
  }, [isConnected, connLoading]);

  return (
    <div className="flex flex-col gap-6">
      {/* Business Stats (from DB - always visible) */}
      <div>
        <h3 className="mb-3 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Business Overview
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Saved Routers"
            value={db?.routerCount ?? 0}
            icon={RouterIcon}
            description="Configured routers"
            loading={loadingDb}
            href="/routers"
          />
          <StatCard
            title="Total Sales"
            value={db?.totalSales ?? 0}
            icon={DollarSignIcon}
            description="Recorded transactions"
            loading={loadingDb}
            href="/sales"
          />
          <StatCard
            title="Revenue"
            value={`$${(db?.totalRevenue ?? 0).toFixed(2)}`}
            icon={TrendingUpIcon}
            description="Total earnings"
            loading={loadingDb}
            href="/sales"
          />
          <StatCard
            title="Cards Sold"
            value={`${db?.cardsSold ?? 0} / ${db?.cardsTotal ?? 0}`}
            icon={CreditCardIcon}
            description="Vouchers sold vs generated"
            loading={loadingDb}
            href="/cards"
          />
        </div>
      </div>

      {/* Mikrotik Stats (only when connected) */}
      <div>
        <h3 className="mb-3 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Router Statistics
        </h3>
        {!isConnected && !connLoading ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-base">No Router Connected</CardTitle>
              <CardDescription>
                <Link href="/connect" className="underline">
                  Connect to a router
                </Link>{" "}
                to see live statistics.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Active Users"
              value={mikrotik?.activeUsers ?? 0}
              icon={UsersIcon}
              description="User Manager active"
              loading={loadingMk}
            />
            <StatCard
              title="Inactive Users"
              value={mikrotik?.inactiveUsers ?? 0}
              icon={UsersIcon}
              description="User Manager inactive"
              loading={loadingMk}
            />
            <StatCard
              title="Hotspot Users"
              value={mikrotik?.hotspotUsers ?? 0}
              icon={WifiIcon}
              description="Total hotspot users"
              loading={loadingMk}
            />
            <StatCard
              title="Active Connections"
              value={mikrotik?.activeConnections ?? 0}
              icon={ActivityIcon}
              description="Currently connected"
              loading={loadingMk}
            />
            <StatCard
              title="Profiles"
              value={mikrotik?.profiles ?? 0}
              icon={ShieldIcon}
              description="User Manager profiles"
              loading={loadingMk}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  loading: boolean;
  href?: string;
}) {
  const content = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
