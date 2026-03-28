import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { CardsContent } from "./components/cards-content";

export const metadata: Metadata = {
  title: "MUMS - Print Cards",
  description: "Generate printable user credential cards",
};

export default function CardsPage() {
  return (
    <>
      <PageHeader page="Print Cards" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CardsContent />
      </div>
    </>
  );
}
