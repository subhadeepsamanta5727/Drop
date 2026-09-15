import { useEffect, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/ui/Sidebar.jsx";
import { Header } from "../components/ui/Header.jsx";
import api from "../services/api.js";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getDaysLeft = (expiresAt) => {
  if (!expiresAt) return null;

  const totalMs = new Date(expiresAt).getTime() - Date.now();
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) return 0;
  return totalDays;
};

const getNextExpiry = (subscriptionData) => {
  if (subscriptionData.activeSubscription?.expiresAt) return subscriptionData.activeSubscription.expiresAt;

  const nextWindow = (subscriptionData.subscriptionWindows || [])
    .filter((window) => window.expiresAt && new Date(window.expiresAt).getTime() > Date.now())
    .sort((first, second) => new Date(first.expiresAt) - new Date(second.expiresAt))[0];

  return nextWindow?.expiresAt || null;
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const filterByDate = (items, filter) => {
  if (filter === "ALL") return items;

  const today = startOfDay();
  return items.filter((item) => startOfDay(item.publishedAt).getTime() === today.getTime());
};

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState({
    hasActiveSubscription: false,
    activeSubscription: null,
    permissions: { lifetimeCategories: [] },
    subscriptionWindows: [],
    items: [],
  });
  const [lifetimeData, setLifetimeData] = useState({
    hasOneTimeAccess: false,
    categories: [],
    items: [],
  });
  const [contentMode, setContentMode] = useState("SUBSCRIPTION");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [subscriptionResponse, oneTimeResponse] = await Promise.all([
          api.get("/dashboard/subscription"),
          api.get("/dashboard/onetime"),
        ]);

        setSubscriptionData(
          subscriptionResponse.data?.data || subscriptionData,
        );
        setLifetimeData(oneTimeResponse.data?.data || lifetimeData);
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Unable to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const activeDaysLeft = getDaysLeft(getNextExpiry(subscriptionData));
  const accessLabel = subscriptionData.hasActiveSubscription
    ? activeDaysLeft === null
      ? "Active"
      : `Active • ${activeDaysLeft} day${activeDaysLeft === 1 ? "" : "s"} left`
    : "Inactive";

  const contentItems =
    contentMode === "SUBSCRIPTION"
      ? subscriptionData.items
      : lifetimeData.items;
  const filteredContentItems = filterByDate(contentItems, dateFilter);
  const emptyContentMessage =
    contentMode === "SUBSCRIPTION"
      ? "No active subscription items available right now."
      : "No one-time daily data has been uploaded yet. Ask an admin to publish a One-time or All record.";

  const downloadFile = async (drop, file) => {
    const fileId = file._id || file.fileKey;
    setDownloadingFile(fileId);

    try {
      const response = await api.get(`/dashboard/download/${drop._id}/${file._id}`, {
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(new Blob([response.data], { type: file.fileMimeType }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.originalFileName || file.label || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to download file");
    } finally {
      setDownloadingFile("");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="USER" />

        <main className="min-w-0 flex-1">
          <Header
            title="Dashboard Feed"
            badge="Entitlement"
            subtitle="Your latest premium drops and current access status."
            showAccessStatus={!loading}
            accessLabel={accessLabel}
            lifetimeLabel={
              lifetimeData.hasOneTimeAccess ? "Unlocked" : "Locked"
            }
            lifetimeActive={lifetimeData.hasOneTimeAccess}
          />

          <section className="mt-6">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Daily Data List</h2>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <label className="flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    <CalendarDays size={14} className="mr-2" />
                    <span className="mr-2 whitespace-nowrap">Date</span>
                    <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="bg-transparent text-xs font-semibold text-blue-700 outline-none" aria-label="Filter daily data by date">
                      <option value="TODAY">Today</option>
                      <option value="ALL">All days</option>
                    </select>
                  </label>

                  <div aria-label="Daily data type" role="group" className="flex w-full items-center rounded-xl border border-blue-200 bg-blue-50 p-1 sm:w-auto">
                  {[
                    { value: "SUBSCRIPTION", label: "Subscription" },
                    { value: "ONE_TIME", label: "One-time" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContentMode(option.value)}
                      aria-pressed={contentMode === option.value}
                      className={`flex-1 rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:flex-none ${contentMode === option.value ? "bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] text-white shadow-sm" : "text-blue-700 hover:bg-white"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-blue-100">
                {loading ? (
                  <div className="p-5 text-sm text-slate-500">Loading content...</div>
                ) : filteredContentItems.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 bg-blue-50/50 p-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>{emptyContentMessage}</span>
                    {contentMode === "SUBSCRIPTION" && !subscriptionData.hasActiveSubscription && (
                      <button
                        type="button"
                        onClick={() => navigate("/dashboard/packages")}
                        className="primary-button whitespace-nowrap px-4 py-2 text-xs"
                      >
                        Purchase subscription
                      </button>
                    )}
                    {contentMode === "ONE_TIME" && !lifetimeData.hasOneTimeAccess && (
                      <button
                        type="button"
                        onClick={() => navigate("/dashboard/packages")}
                        className="primary-button whitespace-nowrap px-4 py-2 text-xs"
                      >
                        Purchase lifetime access
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="min-w-[760px] w-full text-left text-sm">
                    <thead className="border-b border-blue-100 bg-blue-50/60 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Attached file</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContentItems.flatMap((drop) => (drop.files?.length ? drop.files : [null]).map((file, index) => (
                        <tr key={`${drop._id}-${file?._id || index}`} className="border-b border-blue-50 last:border-0 transition hover:bg-blue-50/40">
                          <td className="px-4 py-4 font-semibold text-slate-900">{drop.title}</td>
                          <td className="max-w-[260px] px-4 py-4 text-slate-600">{drop.notes || "No notes available"}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700">
                              <CalendarDays size={14} />
                              {formatDate(drop.publishedAt)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {file ? (
                              <div>
                                <p className="font-medium">{file.originalFileName || file.label}</p>
                                <p className="mt-1 text-xs text-slate-400">{Math.max(1, Math.round((file.fileSizeBytes || 0) / 1024))} KB</p>
                              </div>
                            ) : "No attachment"}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {file ? (
                              <button
                                type="button"
                                onClick={() => downloadFile(drop, file)}
                                disabled={downloadingFile === (file._id || file.fileKey)}
                                title="Download attached file"
                                aria-label={`Download ${file.originalFileName || file.label || "attached file"}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[#0f6ce5] transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-50"
                              >
                                <Download size={16} />
                              </button>
                            ) : <span className="text-slate-400">-</span>}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
