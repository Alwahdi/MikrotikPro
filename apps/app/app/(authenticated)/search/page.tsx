import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SearchContent } from "./components/search-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Search",
  description: "Search users across User Manager and Hotspot",
};

export default async function SearchPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.searchPage.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SearchContent />
      </div>
    </>
  );
}
