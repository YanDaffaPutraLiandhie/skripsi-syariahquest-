"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  clearSessionActivityCookie,
  SESSION_ACTIVITY_COOKIE,
  SESSION_IDLE_TIMEOUT_MS,
  writeSessionActivityCookie,
} from "@/lib/sessionActivity";

function activityStorageKey(userId: string) {
  return `syariahquest_last_activity_${userId}`;
}

function getLastActivity(userId: string) {
  const storageValue = window.localStorage.getItem(activityStorageKey(userId));
  const cookieValue = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${SESSION_ACTIVITY_COOKIE}=`))
    ?.split("=")[1];
  const timestamps = [storageValue, cookieValue]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return timestamps.length ? Math.max(...timestamps) : null;
}

export default function SessionTimeout() {
  useEffect(() => {
    let activeUserId: string | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastRecordedAt = 0;
    let redirecting = false;
    let isMounted = true;
    let removeActivityListeners = () => {};

    const clearTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const clearTracking = () => {
      clearTimer();
      removeActivityListeners();
      removeActivityListeners = () => {};
      activeUserId = null;
    };

    const expireSession = async () => {
      if (redirecting) return;
      redirecting = true;
      const expiredUserId = activeUserId;
      clearTracking();

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Gagal mengakhiri sesi yang kedaluwarsa:", error.message);
      }

      if (expiredUserId) {
        window.localStorage.removeItem(activityStorageKey(expiredUserId));
      }
      clearSessionActivityCookie();
      window.location.replace("/login?reason=idle");
    };

    const scheduleExpiry = () => {
      clearTimer();
      if (!activeUserId) return;

      const lastActivity = getLastActivity(activeUserId);
      if (!lastActivity || Date.now() - lastActivity >= SESSION_IDLE_TIMEOUT_MS) {
        void expireSession();
        return;
      }

      timeoutId = setTimeout(
        scheduleExpiry,
        SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivity),
      );
    };

    const recordActivity = () => {
      if (!activeUserId) return;
      const now = Date.now();
      if (now - lastRecordedAt < 1000) return;

      lastRecordedAt = now;
      window.localStorage.setItem(activityStorageKey(activeUserId), String(now));
      writeSessionActivityCookie(now);
      scheduleExpiry();
    };

    const startTracking = (userId: string, newLogin: boolean) => {
      if (activeUserId === userId && !newLogin) return;
      clearTracking();
      activeUserId = userId;

      if (newLogin) {
        lastRecordedAt = 0;
        recordActivity();
      } else {
        scheduleExpiry();
      }

      if (!activeUserId) return;

      const activityEvents: Array<keyof WindowEventMap> = [
        "keydown",
        "mousedown",
        "mousemove",
        "pointerdown",
        "touchstart",
      ];
      activityEvents.forEach((event) =>
        window.addEventListener(event, recordActivity, { passive: true }),
      );
      document.addEventListener("scroll", recordActivity, {
        capture: true,
        passive: true,
      });
      removeActivityListeners = () => {
        activityEvents.forEach((event) =>
          window.removeEventListener(event, recordActivity),
        );
        document.removeEventListener("scroll", recordActivity, true);
      };
    };

    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        const signedOutUserId = activeUserId;
        clearTracking();
        if (signedOutUserId) {
          window.localStorage.removeItem(activityStorageKey(signedOutUserId));
        }
        if (event === "SIGNED_OUT") {
          clearSessionActivityCookie();
        }
        return;
      }

      if (activeUserId && activeUserId !== session.user.id) {
        window.localStorage.removeItem(activityStorageKey(activeUserId));
      }
      startTracking(
        session.user.id,
        event === "SIGNED_IN" || event === "PASSWORD_RECOVERY",
      );
    });

    const handleStorage = (event: StorageEvent) => {
      if (
        activeUserId &&
        event.key === activityStorageKey(activeUserId) &&
        event.newValue
      ) {
        writeSessionActivityCookie(Number(event.newValue));
        scheduleExpiry();
      }
    };
    window.addEventListener("storage", handleStorage);

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("Gagal memeriksa sesi pengguna:", error.message);
        return;
      }
      if (data.session) {
        startTracking(data.session.user.id, false);
      }
    });

    return () => {
      isMounted = false;
      clearTracking();
      window.removeEventListener("storage", handleStorage);
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
