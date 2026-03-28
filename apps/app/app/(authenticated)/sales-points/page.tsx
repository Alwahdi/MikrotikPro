import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SalesPointsContent } from "./components/sales-points-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Sales Points",
  description: "Manage sales points and reseller locations",
};

export default async function SalesPointsPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.salesPoints.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SalesPointsContent />
      </div>
    </>
  );
}
