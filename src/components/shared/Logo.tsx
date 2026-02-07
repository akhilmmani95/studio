import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <Image
        src="https://i.ibb.co/9vZbJgG/club7-logo.png"
        alt="Club 7 Entertainments"
        width={180}
        height={45}
        className="object-contain"
        priority
      />
    </Link>
  );
}
