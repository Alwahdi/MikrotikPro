import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { RoutersContent } from "./components/routers-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Routers",
  description: "Manage saved Mikrotik routers",
};

export default async function RoutersPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.routers.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <RoutersContent />
      </div>
    </>
  );
}
