import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { ProfilesContent } from "./components/profiles-content";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "MUMS - Profiles",
  description: "Manage User Manager profiles",
};

export default async function ProfilesPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader page={dict.profiles.title} pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProfilesContent />
      </div>
    </>
  );
}
