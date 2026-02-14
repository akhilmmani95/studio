import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">Terms &amp; Conditions</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-lg space-y-4 pt-6">
              <p>
                These Terms &amp; Conditions govern your use of our website and services. By
                using our site and purchasing tickets, you agree to be bound by these
                terms.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Acceptance of Terms</h2>
              <p>
                By accessing or using our services you agree to these Terms. If you do not
                agree, please do not use our services.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Bookings and Tickets</h2>
              <p>
                All bookings are subject to availability. Ticket purchasers are responsible
                for providing accurate information. Tickets are non-transferable unless
                otherwise specified.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Payment</h2>
              <p>
                Payments are processed by third-party providers. You agree to pay all fees
                and taxes associated with purchases. Refunds are governed by our Refund
                Policy.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Conduct and Venue Rules</h2>
              <p>
                Attendees must follow venue rules and staff instructions. Failure to
                comply may result in denial of entry or ejection without refund.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Liability</h2>
              <p>
                To the fullest extent permitted by law, we are not liable for indirect,
                incidental, or consequential damages arising from use of our services or
                attendance at events.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. We will post the updated
                terms on this page with a revised "Last updated" date.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Governing Law</h2>
              <p>
                These Terms are governed by the laws of the jurisdiction where the
                organizer operates, without regard to its conflict of law provisions.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Contact</h2>
              <p>
                For questions about these Terms, please <a href="/contact-us" className="text-primary hover:underline">contact us</a>.
              </p>

              <p className="text-sm text-muted-foreground">Last updated: February 14, 2026</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
