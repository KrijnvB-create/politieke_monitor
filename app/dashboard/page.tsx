import { redirect } from "next/navigation";
import { MijnKompasExplorer } from "@/components/MijnKompasExplorer";
import { getMijnKompasFeedDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const feed = await getMijnKompasFeedDb(userData.user.id);

  return <MijnKompasExplorer items={feed.items} followedDossiers={feed.followedDossiers} followedPersonen={feed.followedPersonen} />;
}

export const metadata = {
  title: "Mijn kompas - Politiekemonitor",
};
