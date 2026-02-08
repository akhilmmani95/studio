
import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto py-8 px-4">
        <div className="grid md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <div className="flex justify-center md:justify-start">
            <Logo />
          </div>
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link>
            <Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
            <Link href="/admin" className="hover:text-primary transition-colors">Admin</Link>
          </nav>
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Club 7 Entertainments. All rights reserved.</p>
            <p>Developed by <a href="https://auramaze.co" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Auramaze</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
