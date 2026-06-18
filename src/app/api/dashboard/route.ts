import { handle } from "../_helpers";
import { dashboardService } from "@/server/services/dashboard.service";

export async function GET() {
  return handle(() => dashboardService.get());
}
