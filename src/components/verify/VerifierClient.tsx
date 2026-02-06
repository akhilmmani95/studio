'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { verifyPayload } from '@/lib/jwt';
import { markAsRedeemed } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ScanLine, AlertTriangle, Loader2 } from 'lucide-react';

type VerificationResult = {
    status: 'valid' | 'invalid' | 'redeemed';
    message: string;
    bookingId?: string;
    eventId?: string;
}

export function VerifierClient() {
  const { toast } = useToast();
  const [validJwts, setValidJwts] = useState<string[]>([]);
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
  const [scannedJwt, setScannedJwt] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSync = (data: string) => {
    const jwts = data.split('\n').filter(Boolean);
    setValidJwts(jwts);
    setRedeemedIds(new Set());
    toast({
      title: 'Sync Complete',
      description: `${jwts.length} tickets loaded into the verifier.`,
    });
  };

  const handleVerify = async () => {
    if (!scannedJwt) {
        toast({ title: 'Error', description: 'Please enter a ticket code to verify.', variant: 'destructive'});
        return;
    }

    setIsVerifying(true);
    setResult(null);

    // Simulate network delay for a more realistic feel
    await new Promise(resolve => setTimeout(resolve, 500));

    const payload = verifyPayload(scannedJwt);

    if (!payload) {
      setResult({ status: 'invalid', message: 'Invalid or tampered ticket code.' });
      setIsVerifying(false);
      return;
    }

    if (!validJwts.includes(scannedJwt)) {
        setResult({ status: 'invalid', message: 'Ticket not found in the synced data. It might be from a different event or already invalid.'});
        setIsVerifying(false);
        return;
    }
    
    if (redeemedIds.has(payload.bookingId)) {
        setResult({ status: 'redeemed', message: `This ticket has already been redeemed on this device.` });
        setIsVerifying(false);
        return;
    }
    
    // Mark as redeemed locally
    setRedeemedIds(prev => new Set(prev).add(payload.bookingId));

    // Try to sync redemption with server, but don't block UI
    markAsRedeemed(payload.bookingId).catch(err => {
        console.error("Failed to sync redemption to server. Will retry later.", err);
        // In a real PWA, you'd queue this for later sync.
    });

    setResult({ status: 'valid', message: 'Ticket is valid and now redeemed.', bookingId: payload.bookingId, eventId: payload.eventId });
    setScannedJwt('');
    setIsVerifying(false);
  };

  const VerificationScreen = () => {
    if (isVerifying) {
        return <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-4 text-lg font-semibold">Verifying...</p></div>;
    }

    if (!result) {
        return <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><ScanLine className="h-16 w-16 mb-4" /><p>Ready to scan</p></div>;
    }

    switch(result.status) {
        case 'valid':
            return <div className="flex flex-col items-center justify-center h-full text-green-500"><CheckCircle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">VALID</h2><p className="text-sm mt-2">{result.bookingId}</p></div>;
        case 'invalid':
            return <div className="flex flex-col items-center justify-center h-full text-destructive"><XCircle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">INVALID</h2><p className="text-center mt-2 text-base font-medium">{result.message}</p></div>;
        case 'redeemed':
            return <div className="flex flex-col items-center justify-center h-full text-yellow-500"><AlertTriangle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">ALREADY REDEEMED</h2><p className="text-sm mt-2">{result.bookingId}</p></div>;
        default:
            return null;
    }
  }


  return (
    <Tabs defaultValue="scanner" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="scanner">Scanner</TabsTrigger>
        <TabsTrigger value="sync">Sync Data</TabsTrigger>
      </TabsList>
      <TabsContent value="scanner">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Scanner</CardTitle>
            <CardDescription>
                Enter the data from the QR code to verify a ticket. In a real PWA, this would use the device camera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Textarea
                        placeholder="Paste QR code data here..."
                        value={scannedJwt}
                        onChange={(e) => setScannedJwt(e.target.value)}
                        className="h-32"
                    />
                    <Button onClick={handleVerify} className="w-full" size="lg" disabled={isVerifying}>
                        <ScanLine className="mr-2 h-5 w-5" />
                        Verify Ticket
                    </Button>
                </div>
                <div className="bg-muted rounded-lg aspect-square flex items-center justify-center">
                    <VerificationScreen />
                </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="sync">
        <Card>
          <CardHeader>
            <CardTitle>Sync Ticket Data</CardTitle>
            <CardDescription>
              Copy the JWT data from the admin panel and paste it here to enable offline verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste JWT data from admin panel..."
              className="h-64 font-mono text-xs"
              onChange={(e) => handleSync(e.target.value)}
            />
            <p className='text-sm text-muted-foreground'>
                Currently synced tickets: <strong>{validJwts.length}</strong> | Redeemed on this device: <strong>{redeemedIds.size}</strong>
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
