import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type Invitation = {
  id_invitation: string;
  id_room: string;
  invited_by: string;
  status: string;
  inviter_name?: string; // TAMBAHAN: Buat nyimpen nama asli
};

export function useRoomInvitations(currentUserId: string | undefined) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    // Fungsi detektif buat nyari nama asli pengundang
    const getInviterName = async (authUserId: string) => {
      const { data: userData } = await supabase.from("user").select("id_mahasiswa").eq("auth_user_id", authUserId).single();
      if (userData?.id_mahasiswa) {
        const { data: mhsData } = await supabase.from("mahasiswa").select("nama_mahasiswa").eq("id_mahasiswa", userData.id_mahasiswa).single();
        return mhsData?.nama_mahasiswa || "Seseorang";
      }
      return "Seseorang";
    };

    const fetchPendingInvitations = async () => {
      const { data, error } = await supabase
        .from("room_invitation")
        .select("*")
        .eq("invited_user_id", currentUserId)
        .eq("status", "pending");

      if (data && !error) {
        // Ambil nama untuk semua undangan masuk
        const enrichedData = await Promise.all(
          data.map(async (inv) => {
            const name = await getInviterName(inv.invited_by);
            return { ...inv, inviter_name: name };
          })
        );
        setInvitations(enrichedData);
      }
    };

    fetchPendingInvitations();

    const channel = supabase
      .channel("invitation_listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_invitation", filter: `invited_user_id=eq.${currentUserId}` },
        async (payload) => {
          const newInvite = payload.new as Invitation;
          if (newInvite.status === "pending") {
            const name = await getInviterName(newInvite.invited_by);
            newInvite.inviter_name = name;
            setInvitations((prev) => [...prev, newInvite]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_invitation", filter: `invited_user_id=eq.${currentUserId}` },
        (payload) => {
          const updatedInvite = payload.new as Invitation;
          if (updatedInvite.status !== "pending") {
            setInvitations((prev) => prev.filter((inv) => inv.id_invitation !== updatedInvite.id_invitation));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const respondToInvitation = async (id_invitation: string, status: "accepted" | "declined") => {
    await supabase.from("room_invitation").update({ status }).eq("id_invitation", id_invitation);
    setInvitations((prev) => prev.filter((inv) => inv.id_invitation !== id_invitation));
  };

  return { invitations, respondToInvitation };
}