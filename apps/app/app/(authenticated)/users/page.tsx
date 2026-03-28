import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { UsersContent } from "./components/users-content";

export const metadata: Metadata = {
  title: "MUMS - User Manager",
  description: "Manage User Manager users",
};

export default function UsersPage() {
  return (
    <>
      <PageHeader page="User Manager" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <UsersContent />
      </div>
    </>
  );
}
