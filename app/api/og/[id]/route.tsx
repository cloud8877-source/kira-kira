import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { getBillPublic } from "@/lib/bills/read";
import { formatRm } from "@/lib/money";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type CardDetails = {
  title: string;
  amount: string;
  paidText: string;
  progressPercent: number;
};

function ogImage({ title, amount, paidText, progressPercent }: CardDetails) {
  const titleSize = title.length > 48 ? 56 : title.length > 30 ? 68 : 82;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7EFE2",
          padding: 48,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#F7EFE2",
            border: "4px dashed rgba(59, 42, 30, 0.28)",
            borderRadius: 28,
            boxShadow: "0 18px 0 rgba(59, 42, 30, 0.10)",
            padding: "44px 56px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "monospace",
              color: "#D97706",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            <span>KIRA-KIRA</span>
            <span
              style={{
                width: 96,
                height: 10,
                borderTop: "4px dashed #D97706",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              color: "#3B2A1E",
              textAlign: "center",
            }}
          >
            <div
              style={{
                maxWidth: 940,
                fontFamily: "Georgia, serif",
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 66,
                fontWeight: 900,
                color: "#3B2A1E",
              }}
            >
              {amount}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              fontFamily: "monospace",
              color: "#3B2A1E",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            <div>{paidText}</div>
            <div
              style={{
                width: "100%",
                height: 28,
                display: "flex",
                overflow: "hidden",
                backgroundColor: "rgba(92, 138, 74, 0.18)",
                border: "2px solid rgba(59, 42, 30, 0.18)",
                borderRadius: 999,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  backgroundColor: "#5C8A4A",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

export async function GET(_request: Request, { params }: OgRouteProps) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.DB, { schema });
  const bill = await getBillPublic(db, id);

  if (!bill) {
    return ogImage({
      title: "Split bills without the awkward chase.",
      amount: "KIRA-KIRA",
      paidText: "Share once. Settle fast.",
      progressPercent: 0,
    });
  }

  const paidCount = bill.participants.filter((participant) => participant.status === "paid").length;
  const participantCount = bill.participants.length;
  const progressPercent = participantCount > 0 ? Math.round((paidCount * 100) / participantCount) : 0;

  return ogImage({
    title: bill.title,
    amount: formatRm(bill.totalCents),
    paidText: `${paidCount} of ${participantCount} paid`,
    progressPercent,
  });
}
