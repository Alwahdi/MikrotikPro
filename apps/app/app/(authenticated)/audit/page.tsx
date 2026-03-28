import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { AuditContent } from "./components/audit-content";

export const metadata: Metadata = {
  title: "MUMS - Audit Log",
  description: "View system activity and audit trail",
};

export default function AuditPage() {
  return (
    <>
      <PageHeader page="Audit Log" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AuditContent />
      </div>
    </>
  );
}
