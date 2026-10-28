import { redirect } from "next/navigation";

export default async function ModulDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/mahasiswa/modul/${id}`);
}
