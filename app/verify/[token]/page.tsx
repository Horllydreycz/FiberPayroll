import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate, shortHash, explorerTxUrl } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Public payslip verification (linked from the QR code). No auth.
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payslip = await prisma.payslip.findUnique({
    where: { verifyToken: token },
    include: {
      employee: true,
      payrollItem: { include: { batch: { include: { company: true } }, payment: true } },
    },
  });

  const valid = !!payslip && payslip.payrollItem.payment?.status === "SUCCESS";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            {valid ? (
              <>
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
                <h1 className="text-lg font-semibold">Verified payslip</h1>
                <p className="text-sm text-muted-foreground">
                  This payslip was issued by {payslip!.payrollItem.batch.company.name} and settled on
                  the Fiber Network.
                </p>
                <Badge variant="success" className="mt-3">
                  Authentic
                </Badge>

                <div className="mt-6 space-y-2 rounded-lg border p-4 text-left text-sm">
                  <Row label="Payslip" value={payslip!.number} />
                  <Row label="Employee" value={payslip!.employee.fullName} />
                  <Row label="Period" value={payslip!.payrollItem.batch.payrollMonth} />
                  <Row label="Net paid" value={`${formatMoney(payslip!.payrollItem.stablecoinAmount)} ${payslip!.payrollItem.stablecoin}`} />
                  <Row label="Payment hash" value={shortHash(payslip!.payrollItem.payment?.paymentHash ?? "", 10, 8)} mono />
                  {payslip!.payrollItem.payment?.onchainTxHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">On-chain channel tx</span>
                      <a
                        href={explorerTxUrl(payslip!.payrollItem.payment.onchainTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      >
                        {shortHash(payslip!.payrollItem.payment.onchainTxHash, 10, 8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <Row
                    label="Settled"
                    value={
                      payslip!.payrollItem.payment?.settledAt
                        ? formatDate(payslip!.payrollItem.payment.settledAt, true)
                        : "—"
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <XCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
                <h1 className="text-lg font-semibold">Payslip not found</h1>
                <p className="text-sm text-muted-foreground">
                  This verification link is invalid or the payment has not settled.
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by Fiber Payroll · Nervos CKB
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}
