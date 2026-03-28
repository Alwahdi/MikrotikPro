import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { SessionsContent } from "./components/sessions-content";

export const metadata: Metadata = {
  title: "MUMS - Sessions",
  description: "View user sessions",
};

export default function SessionsPage() {
  return (
    <>
      <PageHeader page="Sessions" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SessionsContent />
      </div>
    </>
  );
}
