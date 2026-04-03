import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { CardsContent } from "./components/cards-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Print Cards",
  description: "Generate printable user credential cards",
};

export default async function CardsPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.cards.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CardsContent />
      </div>
    </>
  );
}
