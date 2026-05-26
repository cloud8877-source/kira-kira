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
    createdAt: string | null;
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

// Kopi-Susu palette → RGB tuples for jsPDF
const C = {
  paper: [247, 239, 226] as const,
  paperSoft: [239, 229, 211] as const,
  ink: [59, 42, 30] as const,
  inkSoft: [80, 60, 45] as const,
  inkMuted: [120, 100, 80] as const,
  inkLine: [200, 190, 175] as const,
  teh: [216, 138, 63] as const,
  tehSoft: [248, 224, 197] as const,
  lime: [92, 138, 74] as const,
  limeSoft: [220, 232, 209] as const,
  sambal: [194, 75, 58] as const,
  sambalSoft: [243, 213, 207] as const,
  rowAlt: [251, 246, 235] as const,
};

const STATUS_PILL: Record<
  "paid" | "pending" | "unpaid",
  { bg: readonly [number, number, number]; text: readonly [number, number, number]; label: string }
> = {
  paid: { bg: C.lime, text: C.paper, label: "PAID" },
  pending: { bg: C.teh, text: C.ink, label: "PENDING" },
  unpaid: { bg: C.inkMuted, text: C.paper, label: "UNPAID" },
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

function fmtDateLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short" }).format(d);
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type Doc = InstanceType<typeof jsPDF>;

function setFill(doc: Doc, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: Doc, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setText(doc: Doc, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawBadge(
  doc: Doc,
  x: number,
  y: number,
  label: string,
  value: string,
  bg: readonly [number, number, number],
  ink: readonly [number, number, number],
) {
  const padX = 10;
  const padY = 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const labelW = doc.getTextWidth(label);
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  const valueW = doc.getTextWidth(value);
  const w = Math.max(labelW, valueW) + padX * 2;
  const h = 38;
  setFill(doc, bg);
  doc.roundedRect(x, y, w, h, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(doc, ink);
  doc.text(label.toUpperCase(), x + padX, y + padY + 6);
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  setText(doc, ink);
  doc.text(value, x + padX, y + h - padY - 2);
  return w;
}

function drawDashedDivider(doc: Doc, x1: number, y: number, x2: number) {
  setDraw(doc, C.inkLine);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

function drawStatusPill(doc: Doc, x: number, y: number, status: "paid" | "pending" | "unpaid") {
  const pill = STATUS_PILL[status];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const labelW = doc.getTextWidth(pill.label);
  const w = labelW + 12;
  const h = 13;
  setFill(doc, pill.bg);
  doc.roundedRect(x, y - h + 3, w, h, 3, 3, "F");
  setText(doc, pill.text);
  doc.text(pill.label, x + 6, y - 0.5);
  return w;
}

function drawCoverPage(doc: Doc, data: ReportResponse) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, C.teh);
  doc.text("KIRA-KIRA  ·  BILL REPORT", margin, margin + 6);

  // Headline
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  setText(doc, C.ink);
  const titleLines = doc.splitTextToSize(data.bill.title, contentW);
  doc.text(titleLines, margin, margin + 42);
  const titleHeight = titleLines.length * 36;

  let y = margin + 42 + titleHeight + 12;

  // Badges row (Total, Progress, Paid count)
  const paidCount = data.participants.filter((p) => p.status === "paid").length;
  let bx = margin;
  const gap = 10;
  bx += drawBadge(doc, bx, y, "Total", formatRm(data.bill.totalCents), C.paperSoft, C.ink) + gap;
  bx +=
    drawBadge(
      doc,
      bx,
      y,
      "Progress",
      `${data.bill.progress}%`,
      data.bill.progress === 100 ? C.limeSoft : C.tehSoft,
      C.ink,
    ) + gap;
  bx +=
    drawBadge(
      doc,
      bx,
      y,
      "Paid",
      `${paidCount}/${data.participants.length}`,
      C.paperSoft,
      C.ink,
    ) + gap;
  if (data.bill.settledAt) {
    drawBadge(doc, bx, y, "Settled", fmtDateShort(data.bill.settledAt), C.limeSoft, C.ink);
  } else if (data.bill.dueDate) {
    drawBadge(doc, bx, y, "Due", fmtDateShort(data.bill.dueDate), C.paperSoft, C.ink);
  }
  y += 38 + 18;

  drawDashedDivider(doc, margin, y, pageW - margin);
  y += 22;

  // Meta — only render fields that have values
  const metaRows: Array<[string, string]> = [];
  if (data.bill.createdAt) metaRows.push(["Created", fmtDateTime(data.bill.createdAt)]);
  if (data.bill.settledAt) metaRows.push(["Settled", fmtDateTime(data.bill.settledAt)]);
  if (data.bill.dueDate) metaRows.push(["Due date", fmtDateLong(data.bill.dueDate)]);
  metaRows.push(["Bill ID", data.bill.id]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const [label, value] of metaRows) {
    setText(doc, C.inkMuted);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), margin, y);
    setText(doc, C.ink);
    doc.setFont("courier", "normal");
    doc.text(value, margin + 90, y);
    y += 16;
  }
  y += 6;

  // Description (italic body)
  if (data.bill.description) {
    setText(doc, C.inkMuted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DESCRIPTION", margin, y);
    y += 12;
    setText(doc, C.inkSoft);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(data.bill.description, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 10;
  }

  // Payment instructions — receipt-style mono block
  if (data.bill.paymentInstructions) {
    setText(doc, C.inkMuted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PAYMENT INSTRUCTIONS", margin, y);
    y += 10;
    const instrLines = doc.splitTextToSize(data.bill.paymentInstructions, contentW - 20);
    const blockH = instrLines.length * 14 + 16;
    setFill(doc, C.paperSoft);
    doc.roundedRect(margin, y, contentW, blockH, 6, 6, "F");
    setText(doc, C.ink);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(instrLines, margin + 10, y + 14);
    y += blockH + 14;
  }

  drawDashedDivider(doc, margin, y, pageW - margin);
  return y + 16;
}

function drawParticipantsTable(doc: Doc, data: ReportResponse, startY: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  let y = startY;

  setText(doc, C.inkMuted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PARTICIPANTS", margin, y);
  y += 14;

  const headers: Array<{ label: string; w: number; align?: "left" | "right" | "center" }> = [
    { label: "Name", w: 130 },
    { label: "Owed", w: 70, align: "right" },
    { label: "Status", w: 70, align: "center" },
    { label: "Paid", w: 60, align: "right" },
    { label: "Confirmed", w: 70, align: "right" },
    { label: "Note", w: contentW - 130 - 70 - 70 - 60 - 70 },
  ];
  const colX: number[] = [];
  let runningX = margin;
  for (const h of headers) {
    colX.push(runningX);
    runningX += h.w;
  }

  function drawHeaderRow(atY: number) {
    setFill(doc, C.ink);
    doc.rect(margin, atY, contentW, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setText(doc, C.paper);
    headers.forEach((h, i) => {
      const tx =
        h.align === "right"
          ? colX[i] + h.w - 8
          : h.align === "center"
            ? colX[i] + h.w / 2
            : colX[i] + 8;
      doc.text(h.label.toUpperCase(), tx, atY + 14, {
        align: (h.align ?? "left") as "left" | "right" | "center",
      });
    });
  }

  drawHeaderRow(y);
  y += 22;

  const rowH = 22;
  for (let i = 0; i < data.participants.length; i++) {
    if (y + rowH > pageH - margin - 30) {
      startNewPage(doc);
      y = margin;
      drawHeaderRow(y);
      y += 22;
    }
    const p = data.participants[i];
    if (i % 2 === 1) {
      setFill(doc, C.rowAlt);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(doc, C.ink);
    // Name
    doc.text(p.name.slice(0, 28), colX[0] + 8, y + 14);
    // Owed (mono, right-aligned)
    doc.setFont("courier", "bold");
    doc.text(formatRm(p.amountCents), colX[1] + headers[1].w - 8, y + 14, { align: "right" });
    // Status pill, centered
    const pillW = (() => {
      const pill = STATUS_PILL[p.status];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      return doc.getTextWidth(pill.label) + 12;
    })();
    drawStatusPill(doc, colX[2] + (headers[2].w - pillW) / 2, y + 14, p.status);
    // Paid (mono, right)
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    setText(doc, C.inkSoft);
    doc.text(fmtDateShort(p.paidAt), colX[3] + headers[3].w - 8, y + 14, { align: "right" });
    // Confirmed
    doc.text(fmtDateShort(p.confirmedAt), colX[4] + headers[4].w - 8, y + 14, { align: "right" });
    // Note (left, truncated)
    doc.setFont("helvetica", "normal");
    setText(doc, C.inkMuted);
    const note = (p.note ?? "").trim();
    if (note) {
      doc.text(doc.splitTextToSize(note, headers[5].w - 16)[0] ?? "", colX[5] + 8, y + 14);
    } else {
      doc.text("—", colX[5] + 8, y + 14);
    }
    y += rowH;
  }
  return y;
}

function startNewPage(doc: Doc) {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  setFill(doc, C.paper);
  doc.rect(0, 0, pageW, pageH, "F");
}

function drawImagePage(
  doc: Doc,
  title: string,
  subtitle: string | null,
  dataUrl: string,
  fit: "contain" | "square" = "contain",
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;

  startNewPage(doc);

  // Eyebrow + title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, C.teh);
  doc.text("KIRA-KIRA  ·  ATTACHED", margin, margin + 6);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  setText(doc, C.ink);
  doc.text(title, margin, margin + 32);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, C.inkMuted);
    doc.text(subtitle, margin, margin + 50);
  }

  drawDashedDivider(doc, margin, margin + 64, pageW - margin);

  const imgY = margin + 80;
  const imgMaxW = pageW - margin * 2;
  const imgMaxH = pageH - imgY - margin - 30;
  if (fit === "square") {
    const side = Math.min(imgMaxW, imgMaxH);
    doc.addImage(
      dataUrl,
      "JPEG",
      (pageW - side) / 2,
      imgY,
      side,
      side,
      undefined,
      "FAST",
    );
  } else {
    doc.addImage(dataUrl, "JPEG", margin, imgY, imgMaxW, imgMaxH, undefined, "FAST");
  }
}

function drawFooter(doc: Doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const y = pageH - 28;
  drawDashedDivider(doc, margin, y, pageW - margin);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, C.inkMuted);
  doc.text("kira-kira.cloud8877.workers.dev  ·  split bills without the awkward chase", margin, y + 14);
  const pageNum = doc.getCurrentPageInfo().pageNumber;
  const total = doc.getNumberOfPages();
  doc.text(`Page ${pageNum} of ${total}`, pageW - margin, y + 14, { align: "right" });
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
      // Light paper-tinted page background — subtle, prints fine
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      setFill(doc, C.paper);
      doc.rect(0, 0, pageW, pageH, "F");

      const afterCoverY = drawCoverPage(doc, data);
      drawParticipantsTable(doc, data, afterCoverY);

      if (data.bill.hasReceipt) {
        try {
          const blob = await fetch(`/api/receipts/${billId}`).then((r) => r.blob());
          const url = await blobToDataUrl(blob);
          drawImagePage(doc, "Original receipt", "From the organizer", url, "contain");
        } catch {
          /* skip */
        }
      }

      if (data.bill.hasPaymentQr) {
        try {
          const blob = await fetch(`/api/payments/${billId}/qr`).then((r) => r.blob());
          const url = await blobToDataUrl(blob);
          drawImagePage(doc, "Payment QR", "Scan to pay the organizer", url, "square");
        } catch {
          /* skip */
        }
      }

      for (const p of data.participants) {
        if (!p.hasTransferProof) continue;
        try {
          const blob = await fetch(
            `/api/transfers/${billId}/${p.id}?k=${encodeURIComponent(adminSecret)}`,
          ).then((r) => r.blob());
          const url = await blobToDataUrl(blob);
          drawImagePage(doc, `Transfer proof`, p.name, url, "contain");
        } catch {
          /* skip */
        }
      }

      // Finalize: paper background + footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc);
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
