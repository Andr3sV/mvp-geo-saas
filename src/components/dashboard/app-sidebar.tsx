"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Layers,
  Heart,
  Search,
  Activity,
  Settings,
  MessageSquare,
  ChevronLeft,
  FileText,
  Users2,
  Tag,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Citation Tracking",
    href: "/dashboard/citations",
    icon: BarChart3,
  },
  {
    title: "Share of Voice",
    href: "/dashboard/share-of-voice",
    icon: TrendingUp,
  },
  {
    title: "Platform Breakdown",
    href: "/dashboard/platforms",
    icon: Layers,
  },
  {
    title: "Sentiment",
    href: "/dashboard/sentiment",
    icon: Heart,
  },
  {
    title: "Query Patterns",
    href: "/dashboard/queries",
    icon: Search,
  },
  {
    title: "Trending Queries",
    href: "/dashboard/trending",
    icon: Activity,
  },
];

const configItems = [
  {
    title: "Competitor Management",
    href: "/dashboard/competitors",
    icon: Users2,
  },
  {
    title: "Prompt Management",
    href: "/dashboard/prompts",
    icon: MessageSquare,
  },
  {
    title: "Topics",
    href: "/dashboard/topics",
    icon: Tag,
  },
  {
    title: "Analysis Reports",
    href: "/dashboard/analysis",
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        [data-sidebar="sidebar"] button:hover:not(:disabled),
        [data-sidebar="sidebar"] a:hover {
          background-color: rgba(194, 194, 225, 0.2) !important;
        }
        [data-sidebar="sidebar"] button[data-active="true"],
        [data-sidebar="sidebar"] a[data-active="true"] {
          background-color: rgba(194, 194, 225, 0.3) !important;
          font-weight: 500 !important;
        }
        [data-sidebar="sidebar"] .peer\\/menu-button:hover,
        [data-sidebar="sidebar"] [class*="hover:bg-sidebar-accent"]:hover {
          background-color: rgba(194, 194, 225, 0.2) !important;
        }
        [data-sidebar="sidebar"] [class*="bg-sidebar-accent"][data-active="true"],
        [data-sidebar="sidebar"] [data-active="true"][class*="bg-sidebar-accent"] {
          background-color: rgba(194, 194, 225, 0.3) !important;
        }
      `}} />
      <Sidebar 
        collapsible="icon" 
        className="top-14 [&_[data-sidebar=sidebar]]:bg-gradient-to-b [&_[data-sidebar=sidebar]]:from-[#C2C2E1]/10 [&_[data-sidebar=sidebar]]:via-background [&_[data-sidebar=sidebar]]:to-background [&_[data-sidebar=sidebar]]:relative [&_[data-sidebar=sidebar]]:overflow-hidden"
      >
        {/* Background gradients similar to hero */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(194,194,225,0.15),transparent_50%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(194,194,225,0.1),transparent_50%)] pointer-events-none z-0" />
        <SidebarContent className="relative z-10">
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"}>
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Ateneai MVP v0.1
        </div>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}

