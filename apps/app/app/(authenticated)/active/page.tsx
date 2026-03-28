import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { ActiveContent } from "./components/active-content";

export const metadata: Metadata = {
  title: "MUMS - Active Connections",
  description: "View active hotspot connections",
};

export default function ActivePage() {
  return (
    <>
      <PageHeader page="Active Connections" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ActiveContent />
      </div>
    </>
  );
}
