import { reviewCollectionHandlers } from "@/lib/server/v2/phase4Routes";

const handlers = reviewCollectionHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;

