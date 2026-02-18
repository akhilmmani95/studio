
import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';

export default function ContactUsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                    Get in Touch
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    We're here to help. If you have any questions about our events, ticketing, or your bookings, please don't hesitate to reach out.
                </p>
            </div>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                        Here are the best ways to contact our support team.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center gap-4">
                        <Mail className="w-8 h-8 text-primary" />
                        <div>
                            
                            <h3 className="text-xl font-semibold">About The Owner</h3>
                            <p className="text-muted-foreground">SHIBU PUSHPAMANGALATHU SASEENDRAN</p>
                            <a href="mailto:support@club7entertainments.com" className="text-primary font-medium hover:underline">
                                club7entertainments@gmail.com
                            </a>
                        </div>
                        <div>
                            SHIBU PUSHPAMANGALATHU SASEENDRAN
                            <h3 className="text-xl font-semibold">Email Support</h3>
                            <p className="text-muted-foreground">For general inquiries, support, and feedback.</p>
                            <a href="mailto:support@club7entertainments.com" className="text-primary font-medium hover:underline">
                                club7entertainments@gmail.com
                            </a>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <Phone className="w-8 h-8 text-primary" />
                        <div>
                            <h3 className="text-xl font-semibold">Phone Support</h3>
                            <p className="text-muted-foreground">For urgent matters regarding your bookings.</p>
                            <a href="tel:+911234567890" className="text-primary font-medium hover:underline">
                                +91 9846406636
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}
