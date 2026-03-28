import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { ActiveContent } from "./components/active-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Active Connections",
  description: "View active hotspot connections",
};

export default async function ActivePage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.active.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ActiveContent />
      </div>
    </>
  );
}
