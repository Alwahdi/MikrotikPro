import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { RoutersContent } from "./components/routers-content";

export const metadata: Metadata = {
  title: "MUMS - Routers",
  description: "Manage saved Mikrotik routers",
};

export default function RoutersPage() {
  return (
    <>
      <PageHeader page="Routers" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <RoutersContent />
      </div>
    </>
  );
}
