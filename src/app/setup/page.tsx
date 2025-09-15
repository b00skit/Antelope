import { SetupClientPage } from "@/components/setup/setup-client-page";
import { db } from "@/db";
import { setup } from "@/db/schema";
import { redirect } from "next/navigation";

export default async function SetupPage() {
    const setupState = await db.query.setup.findFirst();

    if (setupState?.completed) {
        redirect('/dashboard');
    }

    return <SetupClientPage />;
}
