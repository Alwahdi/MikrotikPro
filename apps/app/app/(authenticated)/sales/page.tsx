import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SalesContent } from "./components/sales-content";

export const metadata: Metadata = {
  title: "MUMS - Sales",
  description: "Sales tracking and reports",
};

export default function SalesPage() {
  return (
    <>
      <PageHeader page="Sales" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SalesContent />
      </div>
    </>
  );
}
