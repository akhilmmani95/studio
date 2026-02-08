
import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">Refund Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-lg space-y-4 pt-6">
              <p>
                Thank you for booking with Club 7 Entertainments. We strive to provide a seamless and enjoyable experience for all our event-goers. Please read our refund policy carefully.
              </p>
              <h2 className="text-2xl font-bold mt-6 mb-2">General Policy</h2>
              <p>
                All ticket sales are final. We do not offer refunds or exchanges for tickets purchased for any event, unless the event is cancelled or rescheduled. This policy is in place because our event organizers have commitments and costs that are based on the number of tickets sold.
              </p>
              <h2 className="text-2xl font-bold mt-6 mb-2">Event Cancellations</h2>
              <p>
                In the rare case that an event is cancelled, we will provide a full refund of the ticket price to the original payment method. You will be notified of the cancellation via the email address and/or phone number you provided during booking. The refund process will be initiated automatically, but it may take 5-10 business days for the funds to appear in your account, depending on your bank or card issuer.
              </p>
              <h2 className="text-2xl font-bold mt-6 mb-2">Event Rescheduling</h2>
              <p>
                If an event is rescheduled to a new date or time, your original tickets will be valid for the new date. We will notify you of the changes as soon as possible. If you are unable to attend the rescheduled event, you may be eligible for a refund. Refund requests in this case must be made within a specific timeframe that will be communicated to you.
              </p>
              <h2 className="text-2xl font-bold mt-6 mb-2">Non-Refundable Circumstances</h2>
              <p>
                We cannot offer refunds for reasons including, but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Change in personal plans.</li>
                <li>Illness or medical emergencies.</li>
                <li>Travel or transportation issues.</li>
                <li>Not enjoying the event or performance.</li>
                <li>Being denied entry for not complying with venue rules.</li>
              </ul>
              <h2 className="text-2xl font-bold mt-6 mb-2">Contact Us</h2>
              <p>
                If you have any questions about our refund policy, please feel free to <a href="/contact-us" className="text-primary hover:underline">contact us</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
