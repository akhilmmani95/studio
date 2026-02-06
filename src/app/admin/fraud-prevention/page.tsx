import { FraudAnalysisClient } from '@/components/admin/FraudAnalysisClient';
import { ShieldAlert } from 'lucide-react';

export default function FraudPreventionPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <ShieldAlert className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Fraud Prevention Tool</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Utilize our AI-powered tool to analyze booking patterns and identify potentially fraudulent transactions. Input the transaction details below to get a risk score and recommendations. This helps in proactively flagging suspicious activities and securing your events.
      </p>
      <FraudAnalysisClient />
    </div>
  );
}
