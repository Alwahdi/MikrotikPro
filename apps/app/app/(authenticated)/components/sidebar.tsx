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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useRouterConnection } from "../hooks/use-router-connection";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
}

const navMain = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Routers", url: "/routers", icon: ServerIcon },
  { title: "User Manager", url: "/users", icon: UsersIcon },
  { title: "Hotspot", url: "/hotspot", icon: WifiIcon },
  { title: "Profiles", url: "/profiles", icon: ShieldIcon },
  { title: "Sessions", url: "/sessions", icon: ClockIcon },
  { title: "Active Connections", url: "/active", icon: ActivityIcon },
];

const navSecondary = [
  { title: "Search", url: "/search", icon: SearchIcon },
  { title: "Print Cards", url: "/cards", icon: CreditCardIcon },
  { title: "Sales", url: "/sales", icon: DollarSignIcon },
  { title: "Sales Points", url: "/sales-points", icon: MapPinIcon },
  { title: "Audit Log", url: "/audit", icon: FileTextIcon },
];

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname();
  const { isConnected, routerVersion, disconnect } = useRouterConnection();

  return (
    <>
      <Sidebar variant="inset">
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
          <SidebarGroupLabel>Router</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isConnected ? (
                  <SidebarMenuButton
                    onClick={disconnect}
                    tooltip="Disconnect Router"
                    className="text-green-600 dark:text-green-400"
                  >
                    <RouterIcon />
                    <span className="flex items-center gap-2">
                      Connected
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        v{routerVersion}
                      </Badge>
                    </span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild tooltip="Connect Router">
                    <Link href="/connect">
                      <PlugIcon />
                      <span>Connect Router</span>
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
            <SidebarGroupLabel>Management</SidebarGroupLabel>
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
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
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
                    userButtonOuterIdentifier: "truncate pl-0",
                  },
                }}
                showName
              />
              <div className="flex shrink-0 items-center gap-px">
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
