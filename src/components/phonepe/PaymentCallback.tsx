/**
 * Payment Callback Handler Component
 * Handles the return from payment gateway
 * Should be used on the success/callback page
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyPaymentStatus } from "@/lib/phonepe-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface PaymentCallbackProps {
  onPaymentVerified?: (status: "COMPLETED" | "FAILED" | "PENDING") => void;
  onClose?: () => void;
}

export function PhonePePaymentCallback({ onPaymentVerified, onClose }: PaymentCallbackProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [message, setMessage] = useState("Verifying payment...");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get order id from URL or session storage
        const merchantTransactionId =
          searchParams.get("order_id") ||
          searchParams.get("merchantTransactionId") ||
          (typeof window !== "undefined"
            ? sessionStorage.getItem("phonePeMerchantTransactionId")
            : null);

        if (!merchantTransactionId) {
          setStatus("failed");
          setMessage("Transaction ID not found. Please contact support.");
          return;
        }

        setTransactionId(merchantTransactionId);

        // Verify payment status
        const verification = await verifyPaymentStatus(merchantTransactionId);

        if (verification.success && verification.state === "COMPLETED") {
          setStatus("success");
          setMessage("Payment successful! Your booking is confirmed.");
          onPaymentVerified?.("COMPLETED");
        } else if (verification.state === "FAILED") {
          setStatus("failed");
          setMessage("Payment failed. Please try again.");
          onPaymentVerified?.("FAILED");
        } else if (verification.state === "PENDING") {
          setStatus("pending");
          setMessage(
            "Payment is pending. You'll receive a confirmation email shortly. Do not close this page."
          );
          onPaymentVerified?.("PENDING");

          // Poll for status updates every 2 seconds for max 30 seconds
          let isTerminal = false;
          const pollInterval = setInterval(async () => {
            const update = await verifyPaymentStatus(merchantTransactionId);
            if (update.state === "COMPLETED") {
              isTerminal = true;
              setStatus("success");
              setMessage("Payment confirmed! Your booking is now active.");
              onPaymentVerified?.("COMPLETED");
              clearInterval(pollInterval);
            } else if (update.state === "FAILED") {
              isTerminal = true;
              setStatus("failed");
              setMessage("Payment failed.");
              onPaymentVerified?.("FAILED");
              clearInterval(pollInterval);
            }
          }, 2000);

          // Stop polling after 30 seconds but keep the booking pending instead of forcing a failure.
          setTimeout(() => {
            clearInterval(pollInterval);
            if (isTerminal) return;
            setStatus("pending");
            setMessage(
              "Payment is still processing. Please wait a moment and refresh this page if needed."
            );
            onPaymentVerified?.("PENDING");
          }, 30000);
        } else {
          throw new Error("Unknown payment state");
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setStatus("failed");
        setMessage(
          error instanceof Error
            ? error.message
            : "Error verifying payment. Please contact support."
        );
      }
    };

    verifyPayment();
  }, [searchParams, onPaymentVerified, verificationAttempt]);

  const handleCheckAgain = () => {
    setStatus("loading");
    setMessage("Checking payment status again...");
    setVerificationAttempt((current) => current + 1);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Verification</CardTitle>
        <CardDescription>Verifying your payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}

        {status === "failed" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {status === "pending" && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">{message}</AlertDescription>
          </Alert>
        )}

        {transactionId && (
          <div className="text-sm text-gray-500">
            <p className="font-semibold">Transaction ID: {transactionId}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {(status === "failed" || status === "pending") && transactionId && (
            <Button onClick={handleCheckAgain}>
              Check Status Again
            </Button>
          )}
          {(status === "failed" || status === "pending") && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          {status === "success" && (
            <Button onClick={onClose}>Continue to Booking</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
