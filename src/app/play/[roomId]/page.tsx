import { redirect } from "next/navigation";

export default async function PlayRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/mahasiswa/play/${roomId}`);
}
