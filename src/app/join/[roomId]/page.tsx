import { redirect } from "next/navigation";

export default async function JoinRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/mahasiswa/join/${roomId}`);
}
