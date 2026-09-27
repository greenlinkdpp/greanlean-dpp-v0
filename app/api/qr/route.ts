import QRCode from "qrcode";
import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { approvedQrHosts, validateOfficialQrTarget } from "@/lib/v2/qrPolicy";

export const GET = withApiRoute(async (request) => {
  const requestUrl = new URL(request.url);
  const candidate = requestUrl.searchParams.get("data") || requestUrl.searchParams.get("url");
  if (!candidate) throw new ApiError(400, "QR_TARGET_REQUIRED", "An official DPP target is required.");
  let target: string;
  try {
    target = validateOfficialQrTarget(candidate, requestUrl.origin, approvedQrHosts(requestUrl.hostname));
  } catch {
    throw new ApiError(400, "QR_TARGET_NOT_APPROVED", "Only approved GreanLean Resolver and DPP targets can be encoded.");
  }
  const buffer = await QRCode.toBuffer(target, {
    type: "png",
    width: 320,
    margin: 1,
  });

  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

export const preferredRegion = "sin1";
