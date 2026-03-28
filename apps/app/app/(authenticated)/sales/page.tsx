import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SalesContent } from "./components/sales-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Sales",
  description: "Sales tracking and reports",
};

export default async function SalesPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.sales.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SalesContent />
      </div>
    </>
  );
}
