"use client";

import { Loader2Icon, RouterIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";
import { useRouterConnection } from "../hooks/use-router-connection";

/**
 * Pages that are accessible without a router connection.
 * Sub-paths are also allowed (e.g. /routers/[id]) since these
 * manage database records, not live router data.
 */
const ALLOWED_WITHOUT_CONNECTION = ["/connect", "/routers"];

interface ConnectionGuardProps {
  readonly children: ReactNode;
}

export function ConnectionGuard({ children }: ConnectionGuardProps) {
  const { isConnected, isLoading } = useRouterConnection();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useDictionary();

  const isAllowedPage = ALLOWED_WITHOUT_CONNECTION.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    if (!isLoading && !isConnected && !isAllowedPage) {
      router.replace("/connect");
    }
  }, [isLoading, isConnected, isAllowedPage, router]);

  // While checking connection status, show a loading spinner
  if (isLoading && !isAllowedPage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <RouterIcon className="h-8 w-8 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  // Not connected and not on an allowed page → will redirect, show nothing
  if (!isConnected && !isAllowedPage) {
    return null;
  }

  return <>{children}</>;
}
