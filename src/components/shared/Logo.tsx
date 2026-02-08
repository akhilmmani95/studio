import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div>
      <Image
        src="https://raw.githubusercontent.com/akhilmmani95/studio/main/src/WhatsApp_Image_2026-02-02_at_10.06.35_PM-removebg-preview.png"
        alt="Club 7 Entertainments"
        width={120}
        height={30}
        className={cn("object-contain w-auto h-auto", className)}
        priority
      />
      </div>
    </Link>
  );
}
