export const siteConfig = {
  name: "Ateneai",
  description: "Generative Engine Optimization Platform",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3055",
  nav: [
    {
      title: "Citation Tracking",
      href: "/dashboard/citations",
      icon: "BarChart3",
    },
    {
      title: "Share of Voice",
      href: "/dashboard/share-of-voice",
      icon: "TrendingUp",
    },
    {
      title: "Platform Breakdown",
      href: "/dashboard/platforms",
      icon: "Layers",
    },
    {
      title: "Sentiment",
      href: "/dashboard/sentiment",
      icon: "Heart",
    },
    {
      title: "Query Patterns",
      href: "/dashboard/queries",
      icon: "Search",
    },
    {
      title: "Trending Queries",
      href: "/dashboard/trending",
      icon: "TrendingUp",
    },
  ],
};

export type SiteConfig = typeof siteConfig;

