import { passportCollectionHandlers } from "@/lib/server/v2/phase4Routes";

const handlers = passportCollectionHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;

