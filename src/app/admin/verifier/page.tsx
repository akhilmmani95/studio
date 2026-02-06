'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Wifi } from 'lucide-react';

export default function VerifierDataPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Ticket Verification</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Ticket verification is now handled exclusively online to ensure real-time accuracy. The offline sync feature has been removed.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Online-Only Verification</CardTitle>
          <CardDescription>
            All ticket scanning and validation now happens on the public <a href="/verify" className="text-primary underline">Verifier Page</a>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10">
          <Wifi className="w-16 h-16 text-primary mb-4"/>
          <p className="text-lg font-semibold">Real-Time Validation</p>
          <p className="text-muted-foreground mt-2">
            The verifier app requires an internet connection to instantly check the status of each ticket against the live database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
