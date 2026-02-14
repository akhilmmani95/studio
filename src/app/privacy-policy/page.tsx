import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-lg space-y-4 pt-6">
              <p>
                Your privacy is important to us. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our services.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Information We Collect</h2>
              <p>
                We may collect personal information you provide directly (for example, name,
                email, phone number, and booking details) and technical information that is
                automatically collected when you visit the site (such as IP address, browser
                type, and usage data).
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">How We Use Your Information</h2>
              <p>
                We use the information to process bookings and payments, communicate about
                events and support requests, improve our services, and comply with legal
                obligations.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Payment Processing</h2>
              <p>
                We use third-party payment providers to process payments. We do not store
                full payment card details on our servers. For payment-related questions,
                please refer to the payment provider's privacy practices.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Cookies and Tracking</h2>
              <p>
                We and our service providers use cookies and similar technologies to
                recognize you, remember preferences, and analyze usage. You can manage
                cookie preferences via your browser settings.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Third-Party Services</h2>
              <p>
                We may share information with service providers who perform services on our
                behalf (e.g., hosting, analytics, payment processing). These providers are
                restricted from using your information for other purposes.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Data Retention</h2>
              <p>
                We retain personal information as long as necessary to provide our services
                and for legitimate business purposes such as complying with legal
                obligations and resolving disputes.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Your Rights</h2>
              <p>
                Depending on your jurisdiction, you may have rights to access, correct,
                delete, or restrict the use of your personal information. To exercise
                these rights, please contact us.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Security</h2>
              <p>
                We implement reasonable administrative and technical measures to protect
                personal information, but no method of transmission or storage is 100%
                secure.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Children</h2>
              <p>
                Our services are not intended for children under 13. We do not knowingly
                collect personal information from children under applicable legal ages.
              </p>

              <h2 className="text-2xl font-bold mt-6 mb-2">Contact Us</h2>
              <p>
                If you have questions or requests regarding this Privacy Policy, please
                <a href="/contact-us" className="text-primary hover:underline"> contact us</a>.
              </p>

              <p className="text-sm text-muted-foreground">Last updated: February 14, 2026</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
