import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, CalendarDays, Download, ExternalLink, FileText, Folder, Layers, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/ui/Sidebar.jsx";
import { Header } from "../components/ui/Header.jsx";
import PackagePurchaseModal from "../components/PackagePurchaseModal.jsx";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

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

const getDownloadErrorMessage = async (error) => {
  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text());
      return payload.message || payload.error;
    } catch {
      return null;
    }
  }

  return responseData?.message || responseData?.error || null;
};

export default function UserDashboardPage({ contentType = "SUBSCRIPTION_DAILY" }) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [feedData, setFeedData] = useState({
    isSubscriber: false,
    hasActiveSubscription: false,
    purchasedCategories: [],
    items: [],
  });
  const [packages, setPackages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalPackage, setActiveModalPackage] = useState(null);

  const loadFeedAndPackages = async ({ requestedPage = page, requestedDateFilter = dateFilter } = {}) => {
    try {
      const [feedRes, pkgRes] = await Promise.all([
        api.get("/dashboard/content", {
          params: {
            contentType,
            dateFilter: requestedDateFilter,
            page: requestedPage,
            limit: 10,
          },
        }),
        api.get("/packages"),
      ]);

      const nextFeed = feedRes.data?.data || { isSubscriber: false, purchasedCategories: [], items: [] };
      setFeedData(nextFeed);
      setPagination(nextFeed.pagination || { page: requestedPage, limit: 10, total: 0, totalPages: 0 });
      setPackages(pkgRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedAndPackages();
  }, []);

  const handleDateFilterChange = async (value) => {
    setDateFilter(value);
    setPage(1);
    setLoading(true);
    await loadFeedAndPackages({ requestedPage: 1, requestedDateFilter: value });
  };

  const handlePageChange = async (nextPage) => {
    setPage(nextPage);
    setLoading(true);
    await loadFeedAndPackages({ requestedPage: nextPage, requestedDateFilter: dateFilter });
  };

  const filteredItems = feedData.items || [];

  const isSubscriberFeed = contentType === "SUBSCRIPTION_DAILY";
  const displayItems = isSubscriberFeed
    ? filteredItems
    : selectedCategory
    ? filteredItems.filter((item) => (item.category || "GENERAL").toUpperCase() === selectedCategory)
    : [];

  const oneTimeCategories = useMemo(() => {
    const categories = new Map();
    packages.forEach((pkg) => {
      const category = pkg.category?.toUpperCase();
      if (category) categories.set(category, pkg);
    });
    return Array.from(categories.values());
  }, [packages]);

  const openBuyModal = (category) => {
    const normalizedCat = (category || "GENERAL").toUpperCase();
    const pkg = (packages || []).find((p) => p.category?.toUpperCase() === normalizedCat);

    if (!pkg) {
      toast.error("This package is not currently available for purchase.");
      return;
    }

    setActiveModalPackage(pkg);
    setModalOpen(true);
  };

  const handlePurchaseSuccess = async () => {
    if (refreshUser) await refreshUser();
    await loadFeedAndPackages();
  };

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
      toast.success(`Downloaded: ${file.originalFileName || "File"}`);
    } catch (error) {
      const errorMessage = await getDownloadErrorMessage(error);
      if (error.response?.status === 403) {
        toast.error(errorMessage || "Purchase this category package or subscribe to access.", {
          action: {
            label: drop.contentType === "ONE_TIME_CATEGORY" ? "Buy Package" : "Subscribe",
            onClick: () => drop.contentType === "ONE_TIME_CATEGORY" ? openBuyModal(drop.category) : navigate("/dashboard/packages"),
          },
        });
      } else {
        toast.error(errorMessage || "Unable to download file");
      }
    } finally {
      setDownloadingFile("");
    }
  };

  const daysLeft = user?.subscription?.expiresAt ? getDaysLeft(user.subscription.expiresAt) : null;
  const accessLabel = feedData.isSubscriber
    ? daysLeft !== null
      ? `Active • ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : "Active"
    : "Inactive";

  const lifetimeActive = (feedData.purchasedCategories || []).length > 0 || Boolean(user?.hasOneTimeAccess);
  const lifetimeLabel = lifetimeActive
    ? `${(feedData.purchasedCategories || []).length} Categories`
    : "Locked";
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="USER" />

        <main className="min-w-0 flex-1">
          <Header
            title={isSubscriberFeed ? "Subscriber Daily Data" : "One-Time Category Data"}
            badge="Hybrid Catalog"
            subtitle={isSubscriberFeed
              ? "View the latest seven days of subscriber-only data."
              : "View one-time category data unlocked by your lifetime purchases."}
            showAccessStatus={!loading}
            accessLabel={accessLabel}
            lifetimeLabel={lifetimeLabel}
            lifetimeActive={lifetimeActive}
          />

          <section className="glass-panel rounded-3xl p-5">
            {!isSubscriberFeed && !selectedCategory && (
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900">One-Time Category Data</h2>
                  <p className="text-xs text-slate-500">Choose a category to view its lifetime data.</p>
                </div>
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
                  {oneTimeCategories.map((pkg) => {
                    const category = pkg.category?.toUpperCase();
                    const isUnlocked = feedData.isSubscriber || (feedData.purchasedCategories || []).includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className="min-w-[280px] snap-start rounded-2xl border border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:min-w-[320px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Layers size={21} />
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isUnlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                            {isUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
                            {isUnlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">{pkg.title || `${category} Package`}</h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-700">{category}</p>
                        <p className="mt-3 text-xs text-slate-500">
                          {isUnlocked ? "Open category data" : `Buy access${pkg.price ? ` for ₹${pkg.price}` : ""}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isSubscriberFeed && selectedCategory && (
              <button type="button" onClick={() => setSelectedCategory("")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900">
                <ArrowLeft size={15} />
                Back to categories
              </button>
            )}

            <div className="mb-5 border-b border-blue-100 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{isSubscriberFeed ? "Subscriber Daily Data" : selectedCategory ? `${selectedCategory} Data` : "Select a Category"}</h2>
                  <p className="text-xs text-slate-500">
                    Showing {pagination.total} file releases{isSubscriberFeed ? " from your subscription period." : " from the latest seven days."}
                  </p>
                </div>
                {isSubscriberFeed && (
                  <label className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    <CalendarDays size={14} />
                    Date:
                    <select value={dateFilter} onChange={(event) => handleDateFilterChange(event.target.value)} className="bg-transparent font-semibold outline-none">
                      <option value="TODAY">Today</option>
                      <option value="ALL">All</option>
                    </select>
                  </label>
                )}
              </div>
            </div>

            {/* Content Display */}
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading catalog...</div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-12 text-center">
                <Folder size={36} className="text-blue-300" />
                <p className="text-base font-semibold text-slate-700">
                  {isSubscriberFeed && !feedData.isSubscriber ? "An active subscription is required" : !isSubscriberFeed && !selectedCategory ? "Select a category to view data" : "No content available for this selection"}
                </p>
                <p className="text-xs text-slate-500">
                  {isSubscriberFeed && !feedData.isSubscriber ? "Subscribe to access new subscriber data. Previously entitled data will appear here." : !isSubscriberFeed && !selectedCategory ? "Choose a category card above." : "No data is available for this period."}
                </p>
                {isSubscriberFeed && !feedData.isSubscriber && (
                  <button type="button" onClick={() => navigate("/dashboard/packages")} className="primary-button mt-2 px-4 py-2 text-xs">
                    Purchase Subscription
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
                <div className="hidden grid-cols-[1.1fr_1.2fr_.7fr_.75fr_.65fr_1fr_auto] gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:grid">
                  <span>Title</span><span>Note</span><span>Date</span><span>Category</span><span>Link</span><span>Attached file</span><span className="text-center">Action</span>
                </div>
                <div className="divide-y divide-blue-50">
                  {displayItems.map((drop) => (
                    <article key={drop._id} className="grid gap-3 p-4 transition hover:bg-blue-50/40 lg:grid-cols-[1.1fr_1.2fr_.7fr_.75fr_.65fr_1fr_auto] lg:items-center lg:gap-3">
                      <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Title</p><p className="truncate font-semibold text-slate-900" title={drop.title}>{drop.title}</p></div>
                      <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Note</p><p className="truncate text-xs text-slate-600" title={drop.notes || ""}>{drop.notes || "—"}</p></div>
                      <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Date</p><p className="whitespace-nowrap text-xs font-bold text-orange-600">{formatDate(drop.publishedAt)}</p></div>
                      <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Category</p><span className="inline-flex max-w-full truncate rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">{drop.category || "GENERAL"}</span></div>
                      <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Link</p>{drop.link ? <a href={drop.link} target="_blank" rel="noreferrer" className="inline-flex whitespace-nowrap items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">Open link <ExternalLink size={12} /></a> : <span className="text-xs text-slate-500">—</span>}</div>
                      <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Attached file</p><div className="flex flex-col gap-1.5">{(drop.files || []).map((file) => <span key={file._id} className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600" title={file.originalFileName || file.label}><FileText size={14} className="shrink-0 text-blue-500" /><span className="truncate">{file.originalFileName || file.label || "Attachment"}</span></span>)}</div></div>
                      <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Action</p><div className="flex flex-wrap gap-1.5 lg:justify-center">{(drop.files || []).map((file) => drop.hasAccess ? <button key={file._id} type="button" onClick={() => downloadFile(drop, file)} disabled={downloadingFile === file._id} title={`Download ${file.originalFileName || file.label || "attachment"}`} aria-label={`Download ${file.originalFileName || file.label || "attachment"}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f6ce5] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Download size={15} /></button> : <button key={file._id} type="button" onClick={() => isSubscriberFeed ? navigate("/dashboard/packages") : openBuyModal(drop.category)} title={isSubscriberFeed ? "Subscribe to download" : "Buy package to download"} aria-label={isSubscriberFeed ? "Subscribe to download" : "Buy package to download"} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800 transition hover:bg-amber-100"><Lock size={14} /></button>)}</div></div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {isSubscriberFeed && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-blue-100 pt-4">
                <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => handlePageChange(pagination.page - 1)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40">Previous</button>
                  <button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => handlePageChange(pagination.page + 1)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>

          {/* Modal for One-Time Package Checkout */}
          <PackagePurchaseModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            pkg={activeModalPackage}
            onSuccess={handlePurchaseSuccess}
          />
        </main>
      </div>
    </div>
  );
}
