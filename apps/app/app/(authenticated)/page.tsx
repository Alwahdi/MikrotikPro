import type { Metadata } from "next";
import { DashboardContent } from "./components/dashboard-content";
import { PageHeader } from "./components/page-header";

const title = "MUMS - Dashboard";
const description = "Mikrotik User Manager System Dashboard";

export const metadata: Metadata = {
  title,
  description,
};

const App = () => (
  <>
    <PageHeader page="Dashboard" pages={["MUMS"]} />
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DashboardContent />
    </div>
  </>
);

export default App;
