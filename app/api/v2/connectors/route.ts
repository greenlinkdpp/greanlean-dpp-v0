import { connectorCollectionHandlers } from "@/lib/server/v2/phase5Routes";
const handlers = connectorCollectionHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;

