import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/auth";
import { dayTakings, getDayClose, recentCloses } from "@/lib/close";
import { today } from "@/lib/dates";
import AdminShell from "@/components/AdminShell";
import CashClose from "@/components/CashClose";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cash close" };

export default async function CashClosePage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");
  if (role !== "manager") redirect("/admin");

  const todayStr = today();

  return (
    <AdminShell role={role} maxWidthClass="max-w-4xl">
      <CashClose
        initialDate={todayStr}
        initialExpected={dayTakings(todayStr)}
        initialClose={getDayClose(todayStr)}
        recent={recentCloses(30)}
      />
    </AdminShell>
  );
}
