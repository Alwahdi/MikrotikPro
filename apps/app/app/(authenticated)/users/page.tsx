import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { UsersContent } from "./components/users-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - User Manager",
  description: "Manage User Manager users",
};

export default async function UsersPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.users.title} pages={[dict.auth.brandName]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <UsersContent />
      </div>
    </>
  );
}
