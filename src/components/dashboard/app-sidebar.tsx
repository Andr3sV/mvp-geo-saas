"use client";

import { useState, useEffect } from "react";
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
  Target,
  Presentation,
  BookOpen,
  Sparkles,
  HelpCircle,
  ListChecks,
  LayoutDashboard,
  Eye,
  Database,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const visibilityItems = [
  {
    title: "Share of mentions",
    href: "/dashboard/share-of-voice",
    icon: TrendingUp,
  },
  {
    title: "Citation & domains",
    href: "/dashboard/citations",
    icon: BarChart3,
  },
  {
    title: "Platform Breakdown",
    href: "/dashboard/platforms",
    icon: Layers,
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

const brandPerceptionItems = [
  {
    title: "Sentiment",
    href: "/dashboard/sentiment",
    icon: Heart,
  },
  {
    title: "Attributes",
    href: "/dashboard/attributes",
    icon: ListChecks,
  },
];

const dataManagementItems = [
  {
    title: "Competitors",
    href: "/dashboard/competitors",
    icon: Users2,
  },
  {
    title: "Prompts",
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

const opportunitiesItems = [
  {
    title: "Opportunities",
    href: "/dashboard/opportunities",
    icon: Target,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isOverviewOpen = pathname.startsWith("/dashboard/reports");
  const isVisibilityOpen = pathname.startsWith("/dashboard/share-of-voice") ||
    pathname.startsWith("/dashboard/citations") ||
    pathname.startsWith("/dashboard/platforms") ||
    pathname.startsWith("/dashboard/queries") ||
    pathname.startsWith("/dashboard/trending");
  const isBrandPerceptionOpen = pathname.startsWith("/dashboard/sentiment") ||
    pathname.startsWith("/dashboard/attributes");
  const isDataManagementOpen = pathname.startsWith("/dashboard/competitors") ||
    pathname.startsWith("/dashboard/prompts") ||
    pathname.startsWith("/dashboard/topics") ||
    pathname.startsWith("/dashboard/analysis");
  const isOpportunitiesOpen = pathname.startsWith("/dashboard/opportunities");
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(isOverviewOpen);
  const [isVisibilityExpanded, setIsVisibilityExpanded] = useState(isVisibilityOpen);
  const [isBrandPerceptionExpanded, setIsBrandPerceptionExpanded] = useState(isBrandPerceptionOpen);
  const [isDataManagementExpanded, setIsDataManagementExpanded] = useState(isDataManagementOpen);
  const [isOpportunitiesExpanded, setIsOpportunitiesExpanded] = useState(isOpportunitiesOpen);

  // Update expanded state when pathname changes
  useEffect(() => {
    setIsOverviewExpanded(pathname.startsWith("/dashboard/reports"));
    setIsVisibilityExpanded(
      pathname.startsWith("/dashboard/share-of-voice") ||
      pathname.startsWith("/dashboard/citations") ||
      pathname.startsWith("/dashboard/platforms") ||
      pathname.startsWith("/dashboard/queries") ||
      pathname.startsWith("/dashboard/trending")
    );
    setIsBrandPerceptionExpanded(
      pathname.startsWith("/dashboard/sentiment") ||
      pathname.startsWith("/dashboard/attributes")
    );
    setIsDataManagementExpanded(
      pathname.startsWith("/dashboard/competitors") ||
      pathname.startsWith("/dashboard/prompts") ||
      pathname.startsWith("/dashboard/topics") ||
      pathname.startsWith("/dashboard/analysis")
    );
    setIsOpportunitiesExpanded(pathname.startsWith("/dashboard/opportunities"));
  }, [pathname]);

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
        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible asChild open={isOverviewExpanded} onOpenChange={setIsOverviewExpanded}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Overview">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Overview</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform duration-200",
                        isOverviewExpanded && "rotate-90"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={pathname === "/dashboard/reports/executive"}>
                          <Link href="/dashboard/reports/executive">
                            <Presentation className="h-4 w-4" />
                            <span>Executive Overview</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={pathname === "/dashboard/reports/detailed"}>
                          <Link href="/dashboard/reports/detailed">
                            <BookOpen className="h-4 w-4" />
                            <span>Reports & Insights</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible asChild open={isVisibilityExpanded} onOpenChange={setIsVisibilityExpanded}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Visibility & Presence">
                      <Eye className="h-4 w-4" />
                      <span>Visibility & Presence</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform duration-200",
                        isVisibilityExpanded && "rotate-90"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {visibilityItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link href={item.href}>
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible asChild open={isBrandPerceptionExpanded} onOpenChange={setIsBrandPerceptionExpanded}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Brand Perception">
                      <Heart className="h-4 w-4" />
                      <span>Brand Perception</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform duration-200",
                        isBrandPerceptionExpanded && "rotate-90"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {brandPerceptionItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link href={item.href}>
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible asChild open={isDataManagementExpanded} onOpenChange={setIsDataManagementExpanded}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Data Management">
                      <Database className="h-4 w-4" />
                      <span>Data Management</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform duration-200",
                        isDataManagementExpanded && "rotate-90"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {dataManagementItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link href={item.href}>
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible asChild open={isOpportunitiesExpanded} onOpenChange={setIsOpportunitiesExpanded}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Opportunities & Actions">
                      <Target className="h-4 w-4" />
                      <span>Opportunities & Actions</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform duration-200",
                        isOpportunitiesExpanded && "rotate-90"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {opportunitiesItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link href={item.href}>
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarGroup className="mb-6">
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/whats-new"}>
                <Link href="/dashboard/whats-new">
                  <Sparkles className="h-4 w-4" />
                  <span>What's new</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/support"}>
                <Link href="/dashboard/support">
                  <HelpCircle className="h-4 w-4" />
                  <span>Support</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Ateneai MVP v0.1
        </div>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}

