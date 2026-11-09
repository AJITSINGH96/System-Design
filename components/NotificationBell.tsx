
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  actor_id: string | null;
  article_id: string;
  type: "like" | "comment";
  created_at: string;
  read_at: string | null;
};

type NotificationItem = Notification & {
  actorName: string;
  actorUsername: string | null;
  actorAvatar: string | null;
  articleTitle: string;
};

export default function NotificationBell() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select("id, actor_id, article_id, type, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notificationError) throw notificationError;

      const rows = (data ?? []) as Notification[];

      if (rows.length === 0) {
        setNotifications([]);
        return;
      }

      const actorIds = [
        ...new Set(
          rows
            .map((item) => item.actor_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const articleIds = [
        ...new Set(rows.map((item) => item.article_id)),
      ];

      const [profilesResult, articlesResult] = await Promise.all([
        actorIds.length > 0
          ? supabase
              .from("user_profiles")
              .select("id, username, display_name, avatar_url")
              .in("id", actorIds)
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from("user_articles")
          .select("id, title")
          .in("id", articleIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (articlesResult.error) throw articlesResult.error;

      const profiles = new Map(
        (profilesResult.data ?? []).map((profile) => [
          profile.id,
          profile,
        ])
      );

      const articles = new Map(
        (articlesResult.data ?? []).map((article) => [
          article.id,
          article,
        ])
      );

      setNotifications(
        rows.map((item) => {
          const profile = item.actor_id
            ? profiles.get(item.actor_id)
            : null;

          const article = articles.get(item.article_id);

          return {
            ...item,
            actorName: profile?.display_name ?? "Community member",
            actorUsername: profile?.username ?? null,
            actorAvatar: profile?.avatar_url ?? null,
            articleTitle: article?.title ?? "your article",
          };
        })
      );
    } catch (err) {
      console.error("Notification loading error:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

 useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  async function setupNotifications() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || cancelled) return;

    // Load notifications immediately when the component mounts.
    await loadNotifications();

    if (cancelled) return;

    // Listen for new notifications in real time.
    channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
            .on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
        },
        () => {
            loadNotifications();
        }
        )
      .subscribe();
  }

  setupNotifications();

  return () => {
    cancelled = true;

    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}, [supabase, loadNotifications]);

  async function handleNotificationClick(notification: NotificationItem) {
  if (!notification.read_at) {
    const readAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notification.id);

    if (updateError) {
      console.error("Mark notification as read error:", updateError);
    } else {
      // Immediately update the local unread count.
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: readAt }
            : item
        )
      );
    }
  }

  router.push(`/community/articles/${notification.article_id}`);
  setOpen(false);
}

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 text-gray-300 transition hover:bg-gray-800 hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-800 p-4">
            <h3 className="font-semibold">Notifications</h3>

            <span className="text-xs text-gray-500">
              {unreadCount} unread
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-8 text-center text-sm text-gray-400">
                Loading notifications...
              </p>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={loadNotifications}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl">🔔</div>
                <p className="mt-3 text-sm font-medium text-gray-300">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  You'll see likes and comments on your articles here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-3 border-b border-gray-800 p-4 text-left transition hover:bg-gray-800/70 ${
                    !notification.read_at ? "bg-blue-500/5" : ""
                  }`}
                >
                  {notification.actorAvatar ? (
                    <img
                      src={notification.actorAvatar}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/20 font-semibold text-blue-400">
                      {notification.actorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold">
                        {notification.actorName}
                      </span>{" "}
                      {notification.type === "like"
                        ? "liked your article"
                        : "commented on your article"}
                    </p>

                    <p className="mt-1 truncate text-xs text-blue-400">
                      {notification.articleTitle}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!notification.read_at && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
