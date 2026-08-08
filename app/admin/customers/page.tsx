import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/auth";
import { listCustomers } from "@/lib/customers";
import AdminShell from "@/components/AdminShell";
import CustomersList from "@/components/CustomersList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const role = await getAdminRole();
  if (!role) redirect("/admin/login");

  const customers = listCustomers();

  return (
    <AdminShell role={role} maxWidthClass="max-w-6xl">
      <CustomersList customers={customers} />
    </AdminShell>
  );
}
