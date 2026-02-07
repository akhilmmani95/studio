'use client';

import { VerifierClient } from '@/components/verify/VerifierClient';
import { QrCode } from 'lucide-react';

export default function VerifierPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Ticket Verifier</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Scan and validate tickets online in real-time. An internet connection is required. Point the camera at a ticket's QR code or paste the code manually to verify.
      </p>
      <div className="max-w-4xl mx-auto">
        <VerifierClient />
      </div>
    </div>
  );
}
