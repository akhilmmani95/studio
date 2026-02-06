'use client';

import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="hidden md:block">
            <Logo />
          </div>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            <Link
              href="/admin"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin Panel
            </Link>
            <Link
              href="/verify"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Verifier App
            </Link>
          </nav>
        </div>

        <div className="md:hidden">
          <Logo />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 md:flex">
            {!isUserLoading && user && (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2" />
                Sign Out
              </Button>
            )}
            <Avatar>
              <AvatarImage src={user?.photoURL || ''} alt="User avatar" />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="p-6">
                <Logo />
                <div className="grid gap-4 py-6">
                  <Link href="/admin" className="text-lg font-medium">
                    Admin Panel
                  </Link>
                  <Link href="/verify" className="text-lg font-medium">
                    Verifier App
                  </Link>
                  {!isUserLoading && user && (
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="justify-start text-lg"
                    >
                      <LogOut className="mr-2" />
                      Sign Out
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
