// This is a server-side file!
'use server';

/**
 * @fileOverview A fraud prevention AI agent that analyzes booking patterns,
 * identifies potentially fraudulent transactions, and recommends actions.
 *
 * - analyzeBookingPatterns - A function that analyzes booking patterns for fraud.
 * - FraudAnalysisInput - The input type for the analyzeBookingPatterns function.
 * - FraudAnalysisOutput - The return type for the analyzeBookingPatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FraudAnalysisInputSchema = z.object({
  bookingFrequency: z
    .number()
    .describe('The frequency of bookings made by the user.'),
  locationAnomalies: z
    .string()
    .describe(
      'Any anomalies in the user location compared to their typical booking locations.'
    ),
  paymentMethod: z
    .string()
    .describe('The payment method used for the booking.'),
  unusualPaymentMethods: z
    .boolean()
    .describe(
      'Whether the payment method is considered unusual or suspicious.'
    ),
  ipAddress: z.string().describe('The IP address of the user.'),
});
export type FraudAnalysisInput = z.infer<typeof FraudAnalysisInputSchema>;

const FraudAnalysisOutputSchema = z.object({
  isFraudulent: z
    .boolean()
    .describe(
      'Whether the transaction is likely to be fraudulent based on the analysis.'
    ),
  riskScore: z
    .number()
    .describe(
      'A score indicating the risk level of the transaction being fraudulent (0-100).'
    ),
  recommendations: z
    .string()
    .describe(
      'Recommended actions to take based on the fraud analysis, such as flagging the transaction or contacting the user.'
    ),
});
export type FraudAnalysisOutput = z.infer<typeof FraudAnalysisOutputSchema>;

export async function analyzeBookingPatterns(
  input: FraudAnalysisInput
): Promise<FraudAnalysisOutput> {
  return fraudAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fraudAnalysisPrompt',
  input: {schema: FraudAnalysisInputSchema},
  output: {schema: FraudAnalysisOutputSchema},
  prompt: `You are an expert fraud detection system.

You are given the following information about a booking:
- Booking Frequency: {{{bookingFrequency}}}
- Location Anomalies: {{{locationAnomalies}}}
- Payment Method: {{{paymentMethod}}}
- Unusual Payment Methods: {{{unusualPaymentMethods}}}
- IP Address: {{{ipAddress}}}

Analyze the booking for potential fraud and provide the following information:
- isFraudulent: Whether the transaction is likely to be fraudulent.
- riskScore: A score (0-100) indicating the risk level of the transaction.
- recommendations: Recommended actions to take, such as flagging the transaction or contacting the user.

Consider parameters like booking frequency, location anomalies, or unusual payment methods.
`,
});

const fraudAnalysisFlow = ai.defineFlow(
  {
    name: 'fraudAnalysisFlow',
    inputSchema: FraudAnalysisInputSchema,
    outputSchema: FraudAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
