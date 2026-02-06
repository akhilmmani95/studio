'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { verifyPayload } from '@/lib/jwt';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ScanLine, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Booking } from '@/lib/types';

type VerificationResult = {
    status: 'valid' | 'invalid' | 'redeemed';
    message: string;
    bookingId?: string;
    eventId?: string;
}

type ValidBooking = {
    bookingId: string;
    eventId: string;
};

export function VerifierClient() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [validBookings, setValidBookings] = useState<ValidBooking[]>([]);
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
  const [scannedJwt, setScannedJwt] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const redeemTicket = useCallback((bookingId: string, eventId: string) => {
    setRedeemedIds(prev => new Set(prev).add(bookingId));
  
    if(firestore) {
        const bookingRef = doc(firestore, `events/${eventId}/bookings`, bookingId);
        updateDoc(bookingRef, {
            redeemed: true,
            redeemedAt: new Date().toISOString()
        }).catch(err => {
            console.error("Failed to sync redemption to server.", err);
            // The redemption is still stored locally for this session.
            // A more robust app might have a retry queue.
        });
    }
  }, [firestore]);

  const handleVerify = useCallback(async (jwtToVerify: string) => {
    if (!jwtToVerify) {
        toast({ title: 'Error', description: 'No ticket code provided.', variant: 'destructive'});
        return;
    }

    setIsScanning(false);
    setIsVerifying(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay for user feedback

    const payload = verifyPayload(jwtToVerify);

    if (!payload) {
        setResult({ status: 'invalid', message: 'Invalid or tampered ticket code.' });
    } else if (redeemedIds.has(payload.bookingId)) {
        setResult({ status: 'redeemed', message: `This ticket has already been redeemed on this device.` });
    } else if (validBookings.some(b => b.bookingId === payload.bookingId && b.eventId === payload.eventId)) {
        // Valid and found locally
        redeemTicket(payload.bookingId, payload.eventId);
        setResult({ status: 'valid', message: 'Ticket is valid and now redeemed.', bookingId: payload.bookingId, eventId: payload.eventId });
    } else if (firestore) { // Online fallback
        try {
            const bookingRef = doc(firestore, `events/${payload.eventId}/bookings`, payload.bookingId);
            const bookingSnap = await getDoc(bookingRef);

            if (!bookingSnap.exists()) {
                setResult({ status: 'invalid', message: 'Ticket not found online. It may be invalid or not synced.' });
            } else {
                const bookingData = bookingSnap.data() as Booking;
                if (bookingData.redeemed) {
                    setResult({ status: 'redeemed', message: `Ticket was already redeemed (synced from server).` });
                } else {
                    // Valid and found online
                    redeemTicket(payload.bookingId, payload.eventId);
                    setResult({ status: 'valid', message: 'Ticket is valid (verified online) and now redeemed.', bookingId: payload.bookingId, eventId: payload.eventId });
                }
            }
        } catch (error) {
            console.error("Online verification failed:", error);
            setResult({ status: 'invalid', message: 'Ticket not found locally. Online check failed.' });
        }
    } else {
        // Not found locally and no firestore connection
        setResult({ status: 'invalid', message: 'Ticket not found in local sync data and offline.' });
    }
    
    setScannedJwt('');
    setIsVerifying(false);
    
    setTimeout(() => {
        setResult(null);
        setIsScanning(true); // Resume scanning
    }, 4000);
  }, [toast, validBookings, redeemedIds, firestore, redeemTicket]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access.',
        });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use the scanner.',
        });
      }
    };
    getCameraPermission();
  }, [toast]);

  useEffect(() => {
    if (hasCameraPermission !== true || !isScanning || isVerifying || result || !isVideoReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return;
    }

    let animationFrameId: number;

    const scanLoop = () => {
      if (!isScanning || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(scanLoop);
        return;
      }

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        handleVerify(code.data);
      } else {
        animationFrameId = requestAnimationFrame(scanLoop);
      }
    };

    animationFrameId = requestAnimationFrame(scanLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, isScanning, isVerifying, result, handleVerify, isVideoReady]);


  const handleSync = (data: string) => {
    try {
      if(!data) {
        setValidBookings([]);
        setRedeemedIds(new Set());
        toast({
          title: 'Sync Cleared',
          description: `Verifier data has been cleared.`,
        });
        return;
      }
      const parsedData = JSON.parse(data);
      if (Array.isArray(parsedData)) {
          setValidBookings(parsedData);
          setRedeemedIds(new Set());
          toast({
            title: 'Sync Complete',
            description: `${parsedData.length} tickets loaded into the verifier.`,
          });
      } else {
        throw new Error('Data is not an array');
      }
    } catch (e) {
      console.error(e);
      setValidBookings([]);
      toast({
        title: 'Sync Failed',
        description: 'The provided data is not valid JSON. Please copy the data again.',
        variant: 'destructive',
      });
    }
  };

  const VerificationScreen = () => {
    if (isVerifying) {
        return <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-4 text-lg font-semibold">Verifying...</p></div>;
    }

    if (!result) {
        return null;
    }

    let content;
    switch(result.status) {
        case 'valid':
            content = <div className="text-green-500 flex flex-col items-center text-center"><CheckCircle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">VALID</h2><p className="text-sm mt-2">{result.bookingId}</p></div>;
            break;
        case 'invalid':
            content = <div className="text-destructive flex flex-col items-center text-center"><XCircle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">INVALID</h2><p className="text-center mt-2 text-base font-medium">{result.message}</p></div>;
            break;
        case 'redeemed':
            content = <div className="text-yellow-500 flex flex-col items-center text-center"><AlertTriangle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">ALREADY REDEEMED</h2><p className="text-sm mt-2">{result.bookingId}</p></div>;
            break;
        default:
            return null;
    }

    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4">
            {content}
        </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
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
                  Point the camera at a ticket's QR code to verify it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="bg-muted rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline onCanPlay={() => setIsVideoReady(true)} />
                      {hasCameraPermission === false && (
                           <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4">
                              <Alert variant="destructive" className="w-auto">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertTitle>Camera Access Required</AlertTitle>
                                  <AlertDescription>
                                      Please allow camera access to use this feature.
                                  </AlertDescription>
                              </Alert>
                          </div>
                      )}
                       {hasCameraPermission === null && (
                           <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin" />
                           </div>
                       )}
                       <VerificationScreen />
                  </div>
                   <div className="space-y-2">
                      <Textarea
                          placeholder="Or paste QR code data here..."
                          value={scannedJwt}
                          onChange={(e) => setScannedJwt(e.target.value)}
                          className="h-24"
                      />
                      <Button onClick={() => handleVerify(scannedJwt)} className="w-full" size="lg" disabled={isVerifying || !scannedJwt}>
                          <ScanLine className="mr-2 h-5 w-5" />
                          Verify Manually
                      </Button>
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
                Copy the JSON data from the admin panel and paste it here to enable offline verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste JSON data from admin panel..."
                className="h-64 font-mono text-xs"
                onChange={(e) => handleSync(e.target.value)}
              />
              <p className='text-sm text-muted-foreground'>
                  Currently synced tickets: <strong>{validBookings.length}</strong> | Redeemed on this device: <strong>{redeemedIds.size}</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
