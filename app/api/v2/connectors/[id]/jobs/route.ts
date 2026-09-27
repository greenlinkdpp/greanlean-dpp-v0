import { connectorJobsHandlers } from "@/lib/server/v2/phase5Routes";
const handlers = connectorJobsHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;

