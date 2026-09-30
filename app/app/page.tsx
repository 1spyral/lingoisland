import HomeDashboard from "@/components/app/HomeDashboard";
import { loadHomeCore } from "@/lib/home/loadHomeDashboard";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const initialCore = await loadHomeCore();
  return <HomeDashboard initialCore={initialCore} />;
}
