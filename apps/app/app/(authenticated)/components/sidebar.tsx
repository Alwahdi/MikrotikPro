"use client";

import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import {
  LayoutDashboardIcon,
  UsersIcon,
  WifiIcon,
  ShieldIcon,
  ClockIcon,
  SearchIcon,
  CreditCardIcon,
  DollarSignIcon,
  ActivityIcon,
  RouterIcon,
  PlugIcon,
  ServerIcon,
  FileTextIcon,
  MapPinIcon,
  GlobeIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";
import { isRTL } from "@/i18n/config";
import { useRouterConnection } from "../hooks/use-router-connection";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
}

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname();
  const { isConnected, routerVersion, disconnect } = useRouterConnection();
  const { t, locale, setLocale } = useDictionary();

  const navMain = useMemo(
    () => [
      { title: t("sidebar.dashboard"), url: "/", icon: LayoutDashboardIcon },
      { title: t("sidebar.routers"), url: "/routers", icon: ServerIcon },
      { title: t("sidebar.userManager"), url: "/users", icon: UsersIcon },
      { title: t("sidebar.hotspot"), url: "/hotspot", icon: WifiIcon },
      { title: t("sidebar.profiles"), url: "/profiles", icon: ShieldIcon },
      { title: t("sidebar.sessions"), url: "/sessions", icon: ClockIcon },
      { title: t("sidebar.activeConnections"), url: "/active", icon: ActivityIcon },
    ],
    [t]
  );

  const navSecondary = useMemo(
    () => [
      { title: t("sidebar.search"), url: "/search", icon: SearchIcon },
      { title: t("sidebar.printCards"), url: "/cards", icon: CreditCardIcon },
      { title: t("sidebar.sales"), url: "/sales", icon: DollarSignIcon },
      { title: t("sidebar.salesPoints"), url: "/sales-points", icon: MapPinIcon },
      { title: t("sidebar.auditLog"), url: "/audit", icon: FileTextIcon },
    ],
    [t]
  );

  return (
    <>
      <Sidebar variant="inset" side={isRTL(locale) ? "right" : "left"}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  "h-[36px] overflow-hidden transition-all [&>div]:w-full",
                  sidebar.open ? "" : "-mx-1"
                )}
              >
                <OrganizationSwitcher
                  afterSelectOrganizationUrl="/"
                  hidePersonal
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.router")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isConnected ? (
                  <SidebarMenuButton
                    onClick={disconnect}
                    tooltip={t("sidebar.disconnectRouter")}
                    className="text-green-600 dark:text-green-400"
                  >
                    <RouterIcon />
                    <span className="flex items-center gap-2">
                      {t("common.connected")}
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        v{routerVersion}
                      </Badge>
                    </span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild tooltip={t("sidebar.connectRouter")}>
                    <Link href="/connect">
                      <PlugIcon />
                      <span>{t("sidebar.connectRouter")}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.management")}</SidebarGroupLabel>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>{t("sidebar.tools")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: "flex overflow-hidden w-full",
                    userButtonBox: "flex-row-reverse",
                    userButtonOuterIdentifier: "truncate ps-0",
                  },
                }}
                showName
              />
              <div className="flex shrink-0 items-center gap-px">
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                  title={locale === "en" ? "العربية" : "English"}
                >
                  <GlobeIcon className="h-4 w-4" />
                </Button>
                <ModeToggle />
                <Button
                  asChild
                  className="shrink-0"
                  size="icon"
                  variant="ghost"
                >
                  <div className="h-4 w-4">
                    <NotificationsTrigger />
                  </div>
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </>
  );
};
