
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  leetcode_url: string | null;
  linkedin_url: string | null;
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function getAvatarStoragePath(url: string | null) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/avatars/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) return null;

  return decodeURIComponent(url.substring(markerIndex + marker.length));
}

function isValidSocialUrl(
  value: string | null,
  allowedHosts: string[]
) {
  if (!value) return true;

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "https:" &&
      allowedHosts.includes(parsedUrl.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export default function EditProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile>({
    username: "",
    display_name: "",
    bio: "",
    avatar_url: "",
    leetcode_url: "",
    linkedin_url: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the current user's profile.
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
        .select(
          "username, display_name, bio, avatar_url, leetcode_url, linkedin_url"
        )
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
        leetcode_url: data.leetcode_url ?? "",
        linkedin_url: data.linkedin_url ?? "",
      });

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  // Create and clean up the local image preview URL.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  function updateField(field: keyof Profile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Image size cannot exceed 2 MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setRemoveAvatar(false);

    // Allow selecting the same file again later.
    e.target.value = "";
  }

  function handleRemoveAvatar() {
    setSelectedFile(null);
    setRemoveAvatar(true);

    setProfile((current) => ({
      ...current,
      avatar_url: "",
    }));

    setError("");
    setSuccess("");
  }

  async function uploadAvatar(userId: string, file: File) {
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensionByType[file.type];

    if (!extension) {
      throw new Error("Unsupported image format.");
    }

    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      throw new Error(
        "Unable to upload your profile picture. Please try again."
      );
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const username = profile.username.trim().toLowerCase();
    const displayName = profile.display_name.trim();
    const bio = profile.bio?.trim() || null;
    const leetcodeUrl = profile.leetcode_url?.trim() || null;
    const linkedinUrl = profile.linkedin_url?.trim() || null;

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

    if (
      !isValidSocialUrl(leetcodeUrl, [
        "leetcode.com",
        "www.leetcode.com",
      ])
    ) {
      setError(
        "Please enter a valid LeetCode profile URL (https://leetcode.com/...)."
      );
      return;
    }

    if (
      !isValidSocialUrl(linkedinUrl, [
        "linkedin.com",
        "www.linkedin.com",
      ])
    ) {
      setError(
        "Please enter a valid LinkedIn profile URL (https://linkedin.com/in/...)."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const oldAvatarUrl = profile.avatar_url;
      const oldAvatarPath = getAvatarStoragePath(oldAvatarUrl);

      let newAvatarUrl = oldAvatarUrl || null;
      let newlyUploadedPath: string | null = null;

      // Upload a newly selected image.
      if (selectedFile) {
        const uploaded = await uploadAvatar(user.id, selectedFile);

        newAvatarUrl = uploaded.url;
        newlyUploadedPath = uploaded.path;
      } else if (removeAvatar) {
        newAvatarUrl = null;
      }

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          username,
          display_name: displayName,
          bio,
          avatar_url: newAvatarUrl,
          leetcode_url: leetcodeUrl,
          linkedin_url: linkedinUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        // Clean up the newly uploaded file if saving the profile failed.
        if (newlyUploadedPath) {
          await supabase.storage
            .from("avatars")
            .remove([newlyUploadedPath]);
        }

        console.error("Profile update error:", updateError);

        if (updateError.code === "23505") {
          throw new Error(
            "This username is already taken. Please choose another."
          );
        }

        throw new Error("Unable to update your profile. Please try again.");
      }

      // Delete the previous stored avatar only after the profile is updated.
      if (oldAvatarPath && (newlyUploadedPath || removeAvatar)) {
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([oldAvatarPath]);

        if (deleteError) {
          console.error("Old avatar cleanup error:", deleteError);
        }
      }

      setProfile({
        username,
        display_name: displayName,
        bio,
        avatar_url: newAvatarUrl ?? "",
        leetcode_url: leetcodeUrl ?? "",
        linkedin_url: linkedinUrl ?? "",
      });

      setSelectedFile(null);
      setRemoveAvatar(false);

      router.replace("/my-space");
      router.refresh();
    } catch (err) {
      console.error("Profile save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading your profile...
      </div>
    );
  }

  const currentAvatar = removeAvatar
    ? ""
    : previewUrl || profile.avatar_url || "";

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

          {/* Social profile links */}
          <div className="space-y-5 border-t border-gray-800 pt-6">
            <div>
              <h2 className="text-lg font-semibold">
                Social profiles
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Add your developer profiles so other community members
                can connect with you.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                LeetCode profile URL
              </label>

              <input
                type="url"
                value={profile.leetcode_url ?? ""}
                onChange={(e) =>
                  updateField("leetcode_url", e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="https://leetcode.com/u/your_username/"
              />

              <p className="mt-2 text-xs text-gray-500">
                Your public LeetCode profile link.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                LinkedIn profile URL
              </label>

              <input
                type="url"
                value={profile.linkedin_url ?? ""}
                onChange={(e) =>
                  updateField("linkedin_url", e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="https://www.linkedin.com/in/your_username/"
              />

              <p className="mt-2 text-xs text-gray-500">
                Your public LinkedIn profile link.
              </p>
            </div>
          </div>

          {/* Profile picture upload */}
          <div className="border-t border-gray-800 pt-6">
            <label className="mb-3 block text-sm font-medium">
              Profile picture
            </label>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-gray-950">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-gray-500">
                    {profile.display_name.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-800">
                  {selectedFile ? "Choose another image" : "Upload image"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {currentAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="ml-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-950/40"
                  >
                    Remove picture
                  </button>
                )}

                <p className="text-xs text-gray-500">
                  JPG, PNG or WebP. Maximum file size: 2 MB.
                </p>

                {selectedFile && (
                  <p className="text-xs text-green-400">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
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
