
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2, Upload, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';
import { EventSchema } from '@/lib/schemas';
import { useTransition, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { uploadImage } from '@/lib/actions';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';


export function CreateEventForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [newEventDetails, setNewEventDetails] = useState<{ id: string, name: string, url: string } | null>(null);
  const [newQrCodeUrl, setNewQrCodeUrl] = useState('');

  const form = useForm<z.infer<typeof EventSchema>>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      name: '',
      venue: '',
      date: undefined,
      description: '',
      imageUrl: '',
      ticketTiers: [{ name: 'General Admission', price: 500, totalSeats: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ticketTiers',
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload a PNG, JPG, or GIF.", variant: "destructive" });
        return;
    }


    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const result = await uploadImage(formData);
      if (result.error || !result.imageUrl) {
        toast({ title: "Upload Failed", description: result.error || "Could not get image URL.", variant: "destructive" });
        return;
      }
      setPreviewUrl(result.imageUrl);
      form.setValue('imageUrl', result.imageUrl, { shouldValidate: true });
    } catch (e) {
      toast({ title: "Upload Error", description: "An unexpected error occurred.", variant: "destructive"});
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!newQrCodeUrl || !newEventDetails) return;
    const link = document.createElement('a');
    link.href = newQrCodeUrl;
    link.download = `qr-code-${newEventDetails.name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    if (!newEventDetails) return;
    navigator.clipboard.writeText(newEventDetails.url);
    toast({
      title: "Link Copied!",
      description: "The event link has been copied to your clipboard.",
    });
  };

  function onSubmit(values: z.infer<typeof EventSchema>) {
    if (!user || !firestore) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create an event.",
        variant: "destructive"
      });
      return;
    }
    startTransition(async () => {
      try {
        const newEventRef = doc(collection(firestore, 'events'));
        const newEventId = newEventRef.id;

        const newEvent: Event = {
          name: values.name,
          venue: values.venue,
          description: values.description,
          date: values.date.toISOString(),
          id: newEventId,
          adminId: user.uid,
          imageUrl: values.imageUrl,
          ticketTiers: values.ticketTiers.map((tier, i) => ({
              ...tier,
              id: `tier-${i + 1}-${Date.now()}`,
          })),
        };

        await setDoc(newEventRef, newEvent);

        form.reset();
        setPreviewUrl(null);
        
        const eventUrl = `${window.location.origin}/events/${newEventId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, { width: 300, margin: 2 });
        
        setNewQrCodeUrl(qrCodeDataUrl);
        setNewEventDetails({ id: newEventId, name: values.name, url: eventUrl });

      } catch (error: any) {
        console.error("Failed to create event", error);
        toast({
            title: "Error",
            description: error.message || "Failed to create event. Please try again.",
            variant: 'destructive'
        })
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <FormField
            control={form.control}
            name="imageUrl"
            render={() => (
              <FormItem>
                <FormLabel>Event Poster</FormLabel>
                <FormControl>
                  <div>
                    {previewUrl ? (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden group bg-muted">
                        <Image src={previewUrl} alt="Event poster preview" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button type="button" variant="destructive" onClick={() => { setPreviewUrl(null); form.setValue('imageUrl', ''); }}>Remove</Button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="image-upload" className="relative cursor-pointer w-full aspect-video rounded-md border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center p-4 hover:bg-muted/50 transition-colors">
                        {isUploading ? (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground"/>
                            <p className="mt-2 text-sm text-center text-muted-foreground">Click to upload poster</p>
                            <p className="text-xs text-muted-foreground/80">PNG, JPG, GIF up to 5MB</p>
                          </>
                        )}
                        <Input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" disabled={isUploading} />
                      </label>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Starlight Music Festival" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="venue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., City Arena" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the event..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label>Ticket Tiers</Label>
            <FormDescription className="mb-4">
              Add at least one ticket tier for your event.
            </FormDescription>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-md border bg-muted/50 p-4 relative">
                  <FormField
                    control={form.control}
                    name={`ticketTiers.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., VIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name={`ticketTiers.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ticketTiers.${index}.totalSeats`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Seats</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ name: '', price: 0, totalSeats: 50 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Tier
              </Button>
              <FormMessage>{form.formState.errors.ticketTiers?.root?.message}</FormMessage>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || isUploading}>
            {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Event
          </Button>
        </form>
      </Form>
      <Dialog open={!!newEventDetails} onOpenChange={(open) => { if (!open) setNewEventDetails(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Created Successfully!</DialogTitle>
            <DialogDescription>
              Your event "{newEventDetails?.name}" is live. Share it using the link and QR code below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {newQrCodeUrl && (
              <Image src={newQrCodeUrl} alt="Event QR Code" width={250} height={250} />
            )}
            <div className="w-full flex items-center space-x-2">
              <Input value={newEventDetails?.url || ''} readOnly />
              <Button type="button" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={handleDownloadQr}>
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
              </Button>
              <DialogClose asChild>
                  <Button type="button">Done</Button>
              </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
