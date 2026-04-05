import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { HotspotContent } from "./components/hotspot-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Hotspot",
  description: "Manage Hotspot users",
};

export default async function HotspotPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.hotspotPage.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <HotspotContent />
      </div>
    </>
  );
}
