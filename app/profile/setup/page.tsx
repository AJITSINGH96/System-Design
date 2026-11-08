
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

      setUserId(user.id);

      const { data: existingProfile, error: profileError } =
        await supabase
          .from("user_profiles")
          .select("id, username, display_name, bio")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        setError("Unable to load your profile. Please try again.");
        setLoading(false);
        return;
      }

      if (existingProfile) {
        router.replace("/my-space");
        return;
      }

      setUsername(user.user_metadata?.username || "");
      setDisplayName(user.user_metadata?.display_name || "");

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanBio = bio.trim();

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
      setError(
        "Username must be 3-30 characters and contain only letters, numbers, underscores or hyphens."
      );
      return;
    }

    if (!cleanDisplayName) {
      setError("Please enter your display name.");
      return;
    }

    setSaving(true);

    try {
      // Check whether another user already owns this username.
      const { data: existingUsername, error: usernameError } =
        await supabase
          .from("user_profiles")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", userId)
          .maybeSingle();

      if (usernameError) {
        throw usernameError;
      }

      if (existingUsername) {
        setError("This username is already taken. Please choose another.");
        return;
      }

      // Use the authenticated user's UUID as the profile ID.
      const { error: saveError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            username: cleanUsername,
            display_name: cleanDisplayName,
            bio: cleanBio || null,
          },
          { onConflict: "id" }
        );

      if (saveError) {
        if (saveError.code === "23505") {
          throw new Error(
            "This username is already taken. Please choose another."
          );
        }

        throw saveError;
      }

      // Keep the signup metadata consistent with the saved profile.
      await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
        },
      });

      router.replace("/my-space");
      router.refresh();
    } catch (err) {
      console.error("Profile setup error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to home
        </Link>

        <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
          <h1 className="text-3xl font-bold">Set up your profile</h1>

          <p className="mt-2 text-sm text-gray-400">
            Create your public identity in the System Design Hub community.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="mb-2 block text-sm font-medium"
              >
                Display name
              </label>

              <input
                id="displayName"
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="your-username"
              />

              <p className="mt-2 text-xs text-gray-500">
                3-30 characters. Letters, numbers, underscores and hyphens.
              </p>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="mb-2 block text-sm font-medium"
              >
                Short bio <span className="text-gray-500">(optional)</span>
              </label>

              <textarea
                id="bio"
                rows={4}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Tell the community a little about yourself..."
              />

              <p className="mt-1 text-right text-xs text-gray-500">
                {bio.length}/300
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving profile..." : "Complete profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
