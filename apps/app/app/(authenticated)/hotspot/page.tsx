import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { HotspotContent } from "./components/hotspot-content";

export const metadata: Metadata = {
  title: "MUMS - Hotspot",
  description: "Manage Hotspot users",
};

export default function HotspotPage() {
  return (
    <>
      <PageHeader page="Hotspot" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <HotspotContent />
      </div>
    </>
  );
}
