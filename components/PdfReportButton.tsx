"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRm } from "@/lib/money";

type ReportResponse = {
  bill: {
    id: string;
    title: string;
    totalCents: number;
    currency: string;
    dueDate: string | null;
    description: string | null;
    createdAt: string;
    settledAt: string | null;
    expiresAt: string | null;
    hasReceipt: boolean;
    hasPaymentQr: boolean;
    paymentInstructions: string | null;
    progress: number;
  };
  participants: Array<{
    id: string;
    name: string;
    phone: string | null;
    amountCents: number;
    status: "unpaid" | "pending" | "paid";
    note: string | null;
    paidAt: string | null;
    confirmedAt: string | null;
    hasTransferProof: boolean;
  }>;
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const base64 = btoa(binary);
  return `data:${blob.type || "image/jpeg"};base64,${base64}`;
}

function safeFilename(title: string): string {
  return title.replace(/[^\w\d-]+/g, "_").replace(/^_|_$/g, "") || "bill";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

type Props = {
  billId: string;
  adminSecret: string;
  className?: string;
};

export function PdfReportButton({ billId, adminSecret, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const reportRes = await fetch(
        `/api/bills/${billId}/report?k=${encodeURIComponent(adminSecret)}`,
        { cache: "no-store" },
      );
      if (!reportRes.ok) {
        toast.error("Couldn't load the bill report.");
        return;
      }
      const data = (await reportRes.json()) as ReportResponse;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;

      // Cover
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(216, 138, 63);
      doc.text("KIRA-KIRA · BILL REPORT", margin, margin);
      doc.setFont("times", "bold");
      doc.setFontSize(26);
      doc.setTextColor(59, 42, 30);
      doc.text(data.bill.title, margin, margin + 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(80, 60, 45);
      const meta = [
        `Total: ${formatRm(data.bill.totalCents)}`,
        `Created: ${fmtDate(data.bill.createdAt)}`,
        `Settled: ${fmtDate(data.bill.settledAt)}`,
        data.bill.dueDate ? `Due date: ${fmtDate(data.bill.dueDate)}` : null,
        `Progress: ${data.bill.progress}%`,
      ].filter((v): v is string => Boolean(v));
      let y = margin + 60;
      for (const line of meta) {
        doc.text(line, margin, y);
        y += 16;
      }
      if (data.bill.description) {
        y += 8;
        doc.setFont("helvetica", "italic");
        doc.text(doc.splitTextToSize(data.bill.description, pageW - margin * 2), margin, y);
        doc.setFont("helvetica", "normal");
        y += 24;
      }
      if (data.bill.paymentInstructions) {
        y += 8;
        doc.setFontSize(10);
        doc.text("Payment instructions:", margin, y);
        y += 14;
        doc.text(
          doc.splitTextToSize(data.bill.paymentInstructions, pageW - margin * 2),
          margin,
          y,
        );
        doc.setFontSize(11);
        y += 28;
      }

      // Participants table
      y = Math.max(y, margin + 200);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Participants", margin, y);
      y += 16;
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      const headers = ["Name", "Owed", "Status", "Paid at", "Confirmed at", "Note"];
      const colX = [margin, margin + 160, margin + 220, margin + 290, margin + 380, margin + 470];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 12;
      doc.setLineWidth(0.5);
      doc.line(margin, y - 4, pageW - margin, y - 4);
      for (const p of data.participants) {
        if (y > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        const row = [
          p.name.slice(0, 22),
          formatRm(p.amountCents),
          p.status,
          p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—",
          p.confirmedAt ? new Date(p.confirmedAt).toLocaleDateString() : "—",
          (p.note ?? "").slice(0, 30),
        ];
        row.forEach((cell, i) => doc.text(String(cell), colX[i], y));
        y += 14;
      }

      // Receipt image (if any)
      if (data.bill.hasReceipt) {
        try {
          const blob = await fetch(`/api/receipts/${billId}`).then((r) => r.blob());
          const dataUrl = await blobToDataUrl(blob);
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("Original receipt", margin, margin);
          doc.addImage(
            dataUrl,
            "JPEG",
            margin,
            margin + 16,
            pageW - margin * 2,
            pageH - margin * 2 - 16,
            undefined,
            "FAST",
          );
        } catch {
          // skip if image unfetchable
        }
      }

      // Payment QR (if any) — public route
      if (data.bill.hasPaymentQr) {
        try {
          const blob = await fetch(`/api/payments/${billId}/qr`).then((r) => r.blob());
          const dataUrl = await blobToDataUrl(blob);
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("Payment QR", margin, margin);
          // Center the QR — typically square
          const side = Math.min(pageW - margin * 2, pageH - margin * 2 - 16);
          doc.addImage(
            dataUrl,
            "JPEG",
            (pageW - side) / 2,
            margin + 16,
            side,
            side,
            undefined,
            "FAST",
          );
        } catch {
          // skip
        }
      }

      // Transfer proofs (one per participant)
      for (const p of data.participants) {
        if (!p.hasTransferProof) continue;
        try {
          const blob = await fetch(
            `/api/transfers/${billId}/${p.id}?k=${encodeURIComponent(adminSecret)}`,
          ).then((r) => r.blob());
          const dataUrl = await blobToDataUrl(blob);
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`Transfer proof — ${p.name}`, margin, margin);
          doc.addImage(
            dataUrl,
            "JPEG",
            margin,
            margin + 16,
            pageW - margin * 2,
            pageH - margin * 2 - 16,
            undefined,
            "FAST",
          );
        } catch {
          // skip
        }
      }

      doc.save(`${safeFilename(data.bill.title)}-kira-kira.pdf`);
      toast.success("Report downloaded.");
    } catch (err) {
      console.error("[pdf] generation failed:", err);
      toast.error("Couldn't generate the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={generate}
      disabled={busy}
      className={`min-h-12 gap-2 bg-teh text-ink hover:bg-teh/90 ${className ?? ""}`}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
      {busy ? "Building PDF…" : "Download PDF report"}
    </Button>
  );
}
