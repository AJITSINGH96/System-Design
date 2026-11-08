
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export default function EditProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile>({
    username: "",
    display_name: "",
    bio: "",
    avatar_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("user_profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (!data) {
        router.replace("/profile/setup");
        return;
      }

      setProfile({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        avatar_url: data.avatar_url ?? "",
      });

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  function updateField(
    field: keyof Profile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const username = profile.username.trim().toLowerCase();
    const displayName = profile.display_name.trim();
    const bio = profile.bio?.trim() || null;
    const avatarUrl = profile.avatar_url?.trim() || null;

    if (displayName.length < 2) {
      setError("Display name must contain at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setError(
        "Username must be 3–30 characters and contain only lowercase letters, numbers and underscores."
      );
      return;
    }

    if (bio && bio.length > 300) {
      setError("Bio cannot exceed 300 characters.");
      return;
    }

    if (avatarUrl) {
      try {
        const parsedUrl = new URL(avatarUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid URL");
        }
      } catch {
        setError("Please enter a valid avatar image URL.");
        return;
      }
    }

    setSaving(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        username,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);

      if (updateError.code === "23505") {
        setError("This username is already taken. Please choose another.");
      } else {
        setError("Unable to update your profile. Please try again.");
      }

      setSaving(false);
      return;
    }

    setProfile({
      username,
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
    });

    setSuccess("Your profile has been updated successfully.");
    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <Link
            href="/my-space"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Back to My Space
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">
            MY SPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Edit your profile
          </h1>

          <p className="mt-2 text-gray-400">
            Manage how other members see you in the community.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Display name
            </label>

            <input
              type="text"
              value={profile.display_name}
              onChange={(e) =>
                updateField("display_name", e.target.value)
              }
              required
              maxLength={80}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Username
            </label>

            <input
              type="text"
              value={profile.username}
              onChange={(e) =>
                updateField("username", e.target.value)
              }
              required
              maxLength={30}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="your_username"
            />

            <p className="mt-2 text-xs text-gray-500">
              Your public profile address will be:
              {" "}
              /users/{profile.username || "username"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Bio
            </label>

            <textarea
              value={profile.bio ?? ""}
              onChange={(e) => updateField("bio", e.target.value)}
              rows={4}
              maxLength={300}
              className="w-full resize-y rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Tell the community a little about yourself..."
            />

            <p className="mt-1 text-right text-xs text-gray-500">
              {(profile.bio ?? "").length}/300
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Avatar image URL
            </label>

            <input
              type="url"
              value={profile.avatar_url ?? ""}
              onChange={(e) =>
                updateField("avatar_url", e.target.value)
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="https://example.com/your-photo.jpg"
            />

            <p className="mt-2 text-xs text-gray-500">
              Optional. Enter a publicly accessible image URL.
            </p>

            {profile.avatar_url && (
              <div className="mt-4">
                <img
                  src={profile.avatar_url}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full border border-gray-700 object-cover"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
              {success}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <Link
              href="/my-space"
              className="rounded-lg border border-gray-700 px-5 py-3 text-sm transition hover:bg-gray-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
