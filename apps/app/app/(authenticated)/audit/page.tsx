import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { AuditContent } from "./components/audit-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Audit Log",
  description: "View system activity and audit trail",
};

export default async function AuditPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.audit.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AuditContent />
      </div>
    </>
  );
}
