'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export function VerifierClient() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [scannedJwt, setScannedJwt] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const handleVerify = useCallback(async (jwtToVerify: string) => {
    if (!jwtToVerify) {
        toast({ title: 'Error', description: 'No ticket code provided.', variant: 'destructive'});
        return;
    }
    if (!firestore) {
        toast({ title: 'Error', description: 'Database connection not available.', variant: 'destructive'});
        return;
    }

    setIsScanning(false);
    setIsVerifying(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay for user feedback

    const payload = verifyPayload(jwtToVerify);

    if (!payload) {
        setResult({ status: 'invalid', message: 'Invalid or tampered ticket code.' });
    } else {
        try {
            const { eventId, bookingId } = payload;
            const bookingRef = doc(firestore, `events/${eventId}/bookings`, bookingId);
            const bookingSnap = await getDoc(bookingRef);

            if (!bookingSnap.exists()) {
                setResult({ status: 'invalid', message: 'This ticket does not exist.' });
            } else {
                const bookingData = bookingSnap.data() as Booking;
                if (bookingData.redeemed) {
                    setResult({ status: 'redeemed', message: `Ticket was already redeemed at ${new Date(bookingData.redeemedAt!).toLocaleString()}.` });
                } else {
                    // Valid and found online, now redeem it
                    await updateDoc(bookingRef, {
                        redeemed: true,
                        redeemedAt: new Date().toISOString()
                    });
                    setResult({ status: 'valid', message: 'Ticket is valid and has been redeemed.', bookingId: payload.bookingId, eventId: payload.eventId });
                }
            }
        } catch (error) {
            console.error("Online verification failed:", error);
            setResult({ status: 'invalid', message: 'An error occurred during online verification.' });
        }
    }
    
    setScannedJwt('');
    setIsVerifying(false);
    
    // Auto-clear the result and resume scanning after a delay
    setTimeout(() => {
        setResult(null);
        setIsScanning(true); 
    }, 4000);
  }, [toast, firestore]);

  // Camera permission logic
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
  
  // QR code scanning loop
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
            content = <div className="text-yellow-500 flex flex-col items-center text-center"><AlertTriangle className="h-24 w-24" /><h2 className="text-4xl font-bold mt-4">ALREADY REDEEMED</h2><p className="text-sm mt-2">{result.bookingId}</p><p className='text-sm mt-1'>{result.message}</p></div>;
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
      <Card>
        <CardHeader>
          <CardTitle>Ticket Scanner</CardTitle>
          <CardDescription>
              Point the camera at a ticket's QR code to verify it online. An internet connection is required.
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
    </>
  );
}
