
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminAnalyticsPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics");

        if (response.status === 401 || response.status === 403) {
          setError("You are not authorized to access this dashboard.");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load analytics.");
        }

        const data = await response.json();
        setTotalUsers(data.totalUsers);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to home
          </Link>

          <h1 className="mt-6 text-3xl font-bold">
            Admin Analytics
          </h1>

          <p className="mt-2 text-gray-400">
            Overview of System Design Hub.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading analytics...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-5">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-400">
                  Total Registered Users
                </p>

                <span className="text-2xl">👥</span>
              </div>

              <p className="mt-5 text-4xl font-bold">
                {totalUsers?.toLocaleString("en-IN")}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                All registered accounts
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
