'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BookCopy,
  CalendarPlus,
  ShieldAlert,
  QrCode,
  Home,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/bookings', icon: BookCopy, label: 'Bookings' },
  { href: '/admin/events', icon: CalendarPlus, label: 'Events' },
  { href: '/admin/fraud-prevention', icon: ShieldAlert, label: 'Fraud Tool' },
  { href: '/admin/verifier', icon: QrCode, label: 'Ticket Verifier' },
];

export function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Home />
                <span>Back to Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut(auth)}>
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
