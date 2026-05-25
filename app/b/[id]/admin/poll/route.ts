import { getDb } from "@/db";
import { getBillAdmin } from "@/lib/bills/read";

type PollRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function notFoundResponse() {
  return new Response(null, { status: 404 });
}

export async function GET(request: Request, { params }: PollRouteContext) {
  const { id } = await params;
  const adminSecret = new URL(request.url).searchParams.get("k");

  if (!adminSecret) {
    return notFoundResponse();
  }

  try {
    const bill = await getBillAdmin(getDb(), id, adminSecret);
    return Response.json(bill);
  } catch {
    return notFoundResponse();
  }
}
