import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Package,
  Upload,
  MessageSquare,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepKit Admin — Guide Management",
  description: "Internal admin for managing survival guides and releases",
};

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Guide Library", href: "/guides", icon: BookOpen },
  { title: "Import JSON", href: "/guides/import", icon: Upload },
  { title: "Review Queue", href: "/review", icon: ClipboardList },
  { title: "Releases", href: "/releases", icon: Package },
  { title: "Feedback", href: "/feedback", icon: MessageSquare },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader className="border-b border-sidebar-border">
                <span className="font-semibold text-sidebar-foreground">PrepKit Admin</span>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild tooltip={item.title}>
                            <Link href={item.href}>
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
            </Sidebar>
            <SidebarInset>
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
                <SidebarTrigger className="-ml-1" />
                <span className="text-muted-foreground text-sm">Guide management for offline survival app</span>
              </header>
              <div className="flex-1 overflow-auto p-4">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
