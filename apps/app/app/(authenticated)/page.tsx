import type { Metadata } from "next";
import { DashboardContent } from "./components/dashboard-content";
import { PageHeader } from "./components/page-header";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Dashboard",
  description: "Mikrotik User Manager System Dashboard",
};

const App = async () => {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.dashboard.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardContent />
      </div>
    </>
  );
};

export default App;
