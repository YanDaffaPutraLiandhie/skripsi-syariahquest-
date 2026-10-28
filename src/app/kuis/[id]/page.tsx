import { redirect } from "next/navigation";

export default async function KuisDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/mahasiswa/kuis/${id}`);
}
