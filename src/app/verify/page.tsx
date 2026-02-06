import { VerifierClient } from '@/components/verify/VerifierClient';
import { Header } from '@/components/shared/Header';
import { QrCode } from 'lucide-react';

export default function VerifyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container py-8 md:py-12">
            <div className="flex flex-col items-center text-center">
                <QrCode className="w-12 h-12 text-primary mb-4" />
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                    Ticket Verifier
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Scan and validate tickets offline. First, sync the valid ticket data from the admin panel.
                </p>
            </div>

            <div className="mt-10 max-w-4xl mx-auto">
                <VerifierClient />
            </div>
        </div>
      </main>
    </>
  );
}
