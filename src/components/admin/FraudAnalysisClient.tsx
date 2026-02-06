'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FraudAnalysisFormSchema } from '@/lib/schemas';
import {
  analyzeBookingPatterns,
  type FraudAnalysisOutput,
} from '@/ai/flows/fraud-prevention';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-radix';
import { Progress } from '@/components/ui/progress';

export function FraudAnalysisClient() {
  const [analysisResult, setAnalysisResult] = useState<FraudAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FraudAnalysisFormSchema>>({
    resolver: zodResolver(FraudAnalysisFormSchema),
    defaultValues: {
      bookingFrequency: 1,
      locationAnomalies: 'None',
      paymentMethod: 'Credit Card',
      unusualPaymentMethods: false,
      ipAddress: '127.0.0.1',
    },
  });

  async function onSubmit(values: z.infer<typeof FraudAnalysisFormSchema>) {
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeBookingPatterns(values);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Fraud analysis failed', error);
      // You can add a toast notification here for the error
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Enter the details of the transaction to analyze for fraud.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bookingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Frequency</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationAnomalies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Anomalies</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unusualPaymentMethods"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Unusual Payment Method</FormLabel>
                      <FormDescription>
                        Is the payment method suspicious or uncommon?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Transaction
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="sticky top-8">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
            <CardDescription>
              The AI-powered fraud analysis will appear below.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : analysisResult ? (
              <div className="w-full space-y-6">
                <div className="text-center">
                    {analysisResult.isFraudulent ? (
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    ) : (
                        <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
                    )}
                    <h3 className="mt-4 text-2xl font-bold">
                        {analysisResult.isFraudulent ? "Potentially Fraudulent" : "Likely Safe"}
                    </h3>
                </div>
                <div>
                    <div className='flex justify-between items-baseline mb-1'>
                        <FormLabel>Risk Score</FormLabel>
                        <span className='font-bold text-lg'>{analysisResult.riskScore}/100</span>
                    </div>
                    <Progress value={analysisResult.riskScore} className={analysisResult.riskScore > 70 ? "[&>div]:bg-destructive" : analysisResult.riskScore > 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"} />
                </div>
                <div>
                    <FormLabel>Recommendations</FormLabel>
                    <Textarea readOnly value={analysisResult.recommendations} className="mt-1 h-32" />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Waiting for analysis...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
