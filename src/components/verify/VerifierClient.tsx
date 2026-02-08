
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyTicketJwt } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ScanLine, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Booking, Event } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VerificationResult = {
    status: 'valid' | 'invalid' | 'redeemed';
    message: string;
    bookingId?: string;
    userName?: string;
    quantity?: number;
};

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

  // Manual Lookup State
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // Fetch events for the dropdown
  useEffect(() => {
    async function fetchEvents() {
      if (!firestore || !user) return;
      setIsLoadingEvents(true);
      const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
      const snapshot = await getDocs(eventsQuery);
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventList);
      setIsLoadingEvents(false);
    }
    fetchEvents();
  }, [firestore, user]);

  const handleSearch = async () => {
    if (!firestore || !selectedEventId || !searchTerm.trim()) {
      toast({ title: 'Error', description: 'Please select an event and enter a name to search.', variant: 'destructive'});
      return;
    }
    setIsSearching(true);
    setSearchAttempted(true);
    setSearchResults([]);
    try {
      // Simple name search (case-sensitive). For case-insensitive, you'd need a different data model.
      const bookingsQuery = query(
        collection(firestore, `events/${selectedEventId}/bookings`), 
        where('userName', '==', searchTerm.trim())
      );
      const snapshot = await getDocs(bookingsQuery);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast({ title: 'Search Failed', description: 'An error occurred while searching.', variant: 'destructive'});
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualRedeem = async (booking: Booking) => {
    if (!firestore || booking.redeemed || !selectedEventId) return;
    
    const bookingRef = doc(firestore, `events/${selectedEventId}/bookings`, booking.id);
    try {
        await updateDoc(bookingRef, {
            redeemed: true,
            redeemedAt: new Date().toISOString()
        });
        toast({ title: 'Success', description: `Ticket for ${booking.userName} has been redeemed.`});
        // Update the state to reflect the change in the UI
        setSearchResults(prev => prev.map(b => b.id === booking.id ? { ...b, redeemed: true, redeemedAt: new Date().toISOString() } : b));
    } catch (error) {
        console.error('Redemption failed:', error);
        toast({ title: 'Redemption Failed', description: 'Could not redeem the ticket.', variant: 'destructive'});
    }
  };


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

    const payload = await verifyTicketJwt(jwtToVerify);

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
                    setResult({ 
                        status: 'redeemed', 
                        message: `Ticket was already redeemed at ${new Date(bookingData.redeemedAt!).toLocaleString()}.`,
                        bookingId: bookingData.id,
                        userName: bookingData.userName,
                        quantity: bookingData.quantity
                    });
                } else {
                    // Valid and found online, now redeem it
                    await updateDoc(bookingRef, {
                        redeemed: true,
                        redeemedAt: new Date().toISOString()
                    });
                    setResult({ 
                        status: 'valid', 
                        message: 'Ticket is valid and has been redeemed.',
                        bookingId: bookingData.id,
                        userName: bookingData.userName,
                        quantity: bookingData.quantity
                    });
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
    }, 5000);
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

  const renderResult = () => {
    if (isVerifying) {
        return (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-semibold">Verifying...</p>
            </div>
        );
    }
    
    if (result) {
        switch(result.status) {
            case 'valid':
                return (
                    <div className="text-green-600 dark:text-green-500 flex flex-col items-center text-center gap-2">
                        <CheckCircle className="h-12 w-12" />
                        <h3 className="text-2xl font-bold">VALID</h3>
                        <div className="mt-2 text-foreground text-left bg-secondary p-4 rounded-lg w-full max-w-sm">
                            <div className="flex justify-between text-base">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-bold">{result.userName}</span>
                            </div>
                            <div className="flex justify-between text-base mt-1">
                                <span className="text-muted-foreground">Guests:</span>
                                <span className="font-bold">{result.quantity}</span>
                            </div>
                            <p className="text-xs font-mono mt-3 text-muted-foreground text-center">{result.bookingId}</p>
                        </div>
                    </div>
                );
            case 'invalid':
                return (
                    <div className="text-destructive flex flex-col items-center text-center gap-2">
                        <XCircle className="h-12 w-12" />
                        <h3 className="text-2xl font-bold">INVALID</h3>
                        <p className="text-center font-medium">{result.message}</p>
                    </div>
                );
            case 'redeemed':
                return (
                    <div className="text-yellow-500 dark:text-yellow-400 flex flex-col items-center text-center gap-2">
                        <AlertTriangle className="h-12 w-12" />
                        <h3 className="text-2xl font-bold">ALREADY REDEEMED</h3>
                        <div className="mt-2 text-foreground text-left bg-secondary p-4 rounded-lg w-full max-w-sm">
                            <div className="flex justify-between text-base">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-bold">{result.userName}</span>
                            </div>
                            <div className="flex justify-between text-base mt-1">
                                <span className="text-muted-foreground">Guests:</span>
                                <span className="font-bold">{result.quantity}</span>
                            </div>
                        </div>
                        <p className="text-sm mt-2 text-foreground">{result.message}</p>
                        <p className="text-xs font-mono mt-1 text-muted-foreground">{result.bookingId}</p>
                    </div>
                );
            default:
                return null;
        }
    }
    
    return (
        <div className="text-muted-foreground text-center">
            <p>Scan a ticket or enter code to see the result.</p>
        </div>
    );
  };
  
  const selectedEvent = events.find(e => e.id === selectedEventId);

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
                  
                  {result && !isVerifying && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 transition-opacity duration-300">
                        {result.status === 'valid' && <CheckCircle className="h-32 w-32 text-green-500" />}
                        {result.status === 'invalid' && <XCircle className="h-32 w-32 text-destructive" />}
                        {result.status === 'redeemed' && <AlertTriangle className="h-32 w-32 text-yellow-500" />}
                    </div>
                  )}

                  {hasCameraPermission === false && (
                       <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4 z-10">
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
                       <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                          <Loader2 className="h-8 w-8 animate-spin" />
                       </div>
                   )}
                   {isVerifying && 
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
                    }
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
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Verification Result</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[200px] flex items-center justify-center p-6">
            {renderResult()}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Manual Lookup</CardTitle>
          <CardDescription>
            Find a booking by name if the user forgot their QR code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-select">1. Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isLoadingEvents}>
              <SelectTrigger id="event-select">
                <SelectValue placeholder="Select an event to search within..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingEvents ? (
                  <SelectItem value="loading" disabled>Loading events...</SelectItem>
                ) : (
                  events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
              <Label htmlFor="search-name">2. Booker's Name</Label>
              <div className="flex gap-2">
                  <Input 
                      id="search-name"
                      placeholder="Enter the name on the booking"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      disabled={!selectedEventId || isSearching}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchTerm || !selectedEventId}>
                      {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
                  </Button>
              </div>
          </div>
        </CardContent>
        
        {(isSearching || (searchAttempted && selectedEvent)) && (
        <CardContent>
            <h4 className="font-semibold mb-4 text-lg">Search Results</h4>
            {isSearching ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : searchResults.length > 0 && selectedEvent ? (
                <ul className="w-full space-y-3">
                    {searchResults.map(booking => {
                        const ticketTier = selectedEvent.ticketTiers.find(t => t.id === booking.ticketTierId);
                        return (
                            <li key={booking.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex-grow">
                                    <p className="font-bold text-base">{booking.userName}</p>
                                    <p className="text-sm text-muted-foreground">{ticketTier?.name || 'N/A'} (x{booking.quantity})</p>
                                    <p className="text-xs font-mono text-muted-foreground mt-1">{booking.id}</p>
                                </div>
                                <Button 
                                  onClick={() => handleManualRedeem(booking)} 
                                  disabled={booking.redeemed}
                                  variant={booking.redeemed ? 'secondary' : 'default'}
                                  className="w-full sm:w-auto"
                                >
                                  {booking.redeemed ? (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4"/>
                                        Redeemed
                                    </>
                                  ) : 'Redeem Ticket'}
                                </Button>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                 <p className="text-muted-foreground text-center p-8">No bookings found with that name.</p>
            )}
        </CardContent>
        )}
      </Card>
    </>
  );
}
