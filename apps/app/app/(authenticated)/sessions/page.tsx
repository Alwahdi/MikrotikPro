import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SessionsContent } from "./components/sessions-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Sessions",
  description: "View user sessions",
};

export default async function SessionsPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.sessions.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SessionsContent />
      </div>
    </>
  );
}
