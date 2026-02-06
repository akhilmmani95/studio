import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaceholderImageById } from '@/lib/actions';

export async function Header() {
  const userAvatar = await getPlaceholderImageById('user-avatar-1');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="hidden md:block">
            <Logo />
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin Panel</Link>
            <Link href="/verify" className="text-muted-foreground hover:text-foreground transition-colors">Verifier App</Link>
          </nav>
        </div>
        
        <div className="md:hidden">
            <Logo />
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
                 <Avatar>
                    <AvatarImage src={userAvatar?.imageUrl} alt="User avatar" />
                    <AvatarFallback><User/></AvatarFallback>
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
                    <Link href="/admin" className="font-medium text-lg">Admin Panel</Link>
                    <Link href="/verify" className="font-medium text-lg">Verifier App</Link>
                </div>
                </div>
            </SheetContent>
            </Sheet>
        </div>
      </div>
    </header>
  );
}
