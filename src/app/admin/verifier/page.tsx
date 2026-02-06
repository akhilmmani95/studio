import { getAllValidTicketJWTs } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, ClipboardCopy } from 'lucide-react';

// This is a server component, but we can't easily make a "copy to clipboard" button
// without a client component. For simplicity, we'll just display the data.
// A full implementation would use a client component for the copy action.

export default async function VerifierDataPage() {
  const validJwts = await getAllValidTicketJWTs();
  const jwtsAsString = validJwts.join('\n');

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Verifier App Sync Data</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        This page provides all the necessary data for the offline ticket verifier app.
        Before an event, copy this data and paste it into the verifier app to sync all valid, unredeemed tickets.
        This enables offline verification at the gate.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Valid Ticket JWTs</CardTitle>
          <CardDescription>
            A list of all valid tickets that have not yet been redeemed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            value={jwtsAsString}
            className="h-96 font-mono text-xs"
            placeholder="No valid tickets found."
          />
          <p className="text-sm text-muted-foreground mt-2">
            {validJwts.length} valid ticket(s) found.
          </p>
        </CardContent>
      </Card>
      
    </div>
  );
}
