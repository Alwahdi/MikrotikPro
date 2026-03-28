import type { Metadata } from "next";
import { PageHeader } from "../components/page-header";
import { ProfilesContent } from "./components/profiles-content";

export const metadata: Metadata = {
  title: "MUMS - Profiles",
  description: "Manage User Manager profiles",
};

export default function ProfilesPage() {
  return (
    <>
      <PageHeader page="Profiles" pages={["MUMS"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProfilesContent />
      </div>
    </>
  );
}
