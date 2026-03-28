import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SearchContent } from "./components/search-content";

export const metadata: Metadata = {
  title: "MUMS - Search",
  description: "Search users across User Manager and Hotspot",
};

export default function SearchPage() {
  return (
    <>
      <PageHeader page="Search" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SearchContent />
      </div>
    </>
  );
}
