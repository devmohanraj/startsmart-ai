import { useState, useEffect, useMemo } from "react";
import AuthGateMessage from "./AuthGateMessage";
import {
  DASHBOARD_CACHE_TTL,
  readDashboardCache,
  writeDashboardCache,
} from "../utils/dashboardCache";
import { dashboardApi, reportsApi } from "../services/api";

function severityOf(score) {
  if (score == null || Number.isNaN(Number(score))) return "none";
  if (Number(score) >= 67) return "high";
  if (Number(score) >= 34) return "medium";
  return "low";
}

const RISK_THEME = {
  low: {
    ring: "#10b981",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  medium: {
    ring: "#f59e0b",
    text: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  high: {
    ring: "#ef4444",
    text: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border border-red-500/20",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  none: {
    ring: "#94a3b8",
    text: "text-gray-400",
    badge: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
    bar: "bg-gray-500",
    dot: "bg-gray-500",
  },
};

function themeFor(level) {
  return RISK_THEME[String(level || "none").toLowerCase()] || RISK_THEME.none;
}

function Skeleton({ className = "" }) {
  return (
    <div className={`bg-gray-700 rounded-lg animate-pulse ${className}`} />
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-700/50 px-4 py-3.5 sm:px-5 sm:py-4">
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function RingGauge({
  value,
  size = 128,
  stroke = 11,
  color = "#6366f1",
  subLabel,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value != null ? Math.min(Math.max(Number(value), 0), 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div
      className="relative inline-flex w-full items-center justify-center"
      style={{ maxWidth: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 h-auto w-full"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white leading-none sm:text-4xl">
          {value != null ? value : "\u2014"}
        </span>
        {subLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mt-1">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function Bar({ value, colorClass = "bg-indigo-500", track = "bg-gray-700" }) {
  const pct = value != null ? Math.min(Math.max(Number(value), 0), 100) : 0;
  return (
    <div className={`h-2 w-full rounded-full overflow-hidden ${track}`}>
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DistributionDonut({
  high,
  medium,
  low,
  size = 110,
  stroke = 10,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: Number(high) || 0, color: "#ef4444" },
    { value: Number(medium) || 0, color: "#f59e0b" },
    { value: Number(low) || 0, color: "#10b981" },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let acc = 0;
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const arc = { ...s, frac, start: acc };
    acc += frac;
    return arc;
  });
  return (
    <div
      className="relative inline-flex w-full items-center justify-center"
      style={{ maxWidth: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 h-auto w-full"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-700"
        />
        {total > 0 &&
          arcs
            .filter((a) => a.frac > 0)
            .map((a) => (
              <circle
                key={a.color}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                stroke={a.color}
                strokeDasharray={`${Math.max(a.frac * circumference - 3, 1)} ${circumference}`}
                strokeDashoffset={-(a.start * circumference)}
              />
            ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white leading-none sm:text-4xl">
          {total}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mt-1">
          assessed
        </span>
      </div>
    </div>
  );
}

function ComparisonRows({ projects }) {
  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const riskMeta = themeFor(severityOf(p.riskScore));
        const successColor = themeFor(severityOf(100 - Number(p.successProbability))).bar;
        return (
          <div key={p.projectId} className="rounded-xl border border-gray-700/30 bg-gray-900/30 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-white truncate">
                {p.projectName}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${riskMeta.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${riskMeta.dot}`} />
                {p.riskLevel || "\u2014"}
              </span>
            </div>
            {[
              { label: "Risk", value: p.riskScore, bar: riskMeta.bar, display: `${p.riskScore ?? "\u2014"}/100` },
              { label: "Success", value: p.successProbability, bar: successColor, display: `${p.successProbability ?? "\u2014"}%` },
              { label: "Feasibility", value: p.feasibilityScore, bar: "bg-indigo-500", display: `${p.feasibilityScore ?? "\u2014"}/100` },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 mt-1.5">
                <span className="w-20 shrink-0 text-[11px] text-gray-400">{row.label}</span>
                <div className="flex-1">
                  <Bar value={row.value} colorClass={row.bar} track="bg-gray-700/60" />
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] font-semibold text-gray-200">
                  {row.display}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function GridIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v6m0 0l3.5-3.5M12 10.5l-3.5-3.5M3.5 5.25V4.5m0 0h.75M3.5 4.5v.75M20.5 4.5V3.5m0 0h.75m-.75 0v.75M3 15.75A9 9 0 1121 15.75M3 15.75h18"
      />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
      />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  );
}

function AlertIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function SortArrow({ active, direction }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${active ? "text-indigo-400 opacity-100" : "text-gray-500 opacity-60"} ${active && direction === "asc" ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

const COLUMNS = [
  { key: "projectName", label: "Project", align: "left" },
  { key: "industry", label: "Industry", align: "left" },
  { key: "riskScore", label: "Risk Score", align: "right" },
  { key: "successProbability", label: "Success %", align: "right" },
  { key: "feasibilityScore", label: "Feasibility", align: "right" },
  { key: "createdAt", label: "Created", align: "left" },
];

function formatDate(dateString) {
  if (!dateString) return "\u2014";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Dashboard({
  userId,
  isLoggedIn,
  onLoginClick,
  onSelectProjectForAssessment,
  onGoToProjectInput,
}) {
  const [fetchedData, setFetchedData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [downloadingPortfolio, setDownloadingPortfolio] = useState(false);

  const handleDownloadReport = async () => {
    if (downloadingPortfolio) return;
    setDownloadingPortfolio(true);
    setError("");
    try {
      await reportsApi.generatePortfolio(userId);
    } catch (err) {
      setError(err?.message || "Failed to generate report");
    } finally {
      setDownloadingPortfolio(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !userId) return undefined;
    let cancelled = false;

    const cached = readDashboardCache(userId);
    const isFresh =
      cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL;
    if (isFresh && reloadKey === 0) return undefined;

    (async () => {
      try {
        const json = await dashboardApi.summary(userId);
        if (cancelled) return;
        setFetchedData(json);
        setError("");
        writeDashboardCache(userId, json);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load dashboard data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userId, reloadKey]);

  // Cache-first paint; render the persisted snapshot until revalidation lands.
  const cachedSummary = useMemo(() => {
    if (!isLoggedIn || !userId) return null;
    return readDashboardCache(userId)?.data ?? null;
  }, [isLoggedIn, userId]);
  const view = fetchedData ?? cachedSummary;

  const sortedProjects = useMemo(() => {
    const list = [...(view?.projects || [])];
    const { key, direction } = sortConfig;
    list.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return direction === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return list;
  }, [view, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  if (!isLoggedIn) {
    return (
      <AuthGateMessage
        title="Login to access Dashboard"
        description="Login to see a portfolio-level view of your projects — average risk, success probability, risk distribution, and key metrics across everything you have assessed."
        onLoginClick={onLoginClick}
      />
    );
  }

  if (!view) {
    return (
      <div className="max-w-345 mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Skeleton className="h-6 w-44 mb-2" />
        <Skeleton className="h-4 w-80 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.15fr_0.75fr_0.85fr_1.25fr] gap-4 sm:gap-5 mb-6 sm:mb-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-16 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && !view) {
    return (
      <div className="min-h-screen flex justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-5">
            <AlertIcon />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            Could not load your dashboard
          </h2>
          <p className="text-sm text-gray-400 mb-5">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const totalProjects = Number(view?.totalProjects ?? 0);
  const assessedProjects = Number(view?.assessedProjects ?? 0);

  if (assessedProjects === 0) {
    return (
      <div className="max-w-345 mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Dashboard
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Portfolio-level view across your projects.
          </p>
        </div>
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <GridIcon />
          </div>
          <p className="text-sm text-gray-300 max-w-md mx-auto mb-1">
            Nothing to show on the dashboard yet.
          </p>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
            {totalProjects > 0
              ? `You have ${totalProjects} project${totalProjects === 1 ? "" : "s"}, but none of them have a completed risk assessment. Open a project in Risk Assessment to generate one first.`
              : "Submit a project from the Project Input tab and run its Risk Assessment — your portfolio metrics will appear here."}
          </p>
          <button
            onClick={onGoToProjectInput}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Go to Project Input
          </button>
        </div>
      </div>
    );
  }

  const avgRisk = view.averageOverallRiskScore;
  const avgSuccess = view.averageSuccessProbability;
  const avgRiskTheme = themeFor(severityOf(avgRisk));
  const highCount = Number(view.highRiskCount ?? 0);
  const mediumCount = Number(view.mediumRiskCount ?? 0);
  const lowCount = Number(view.lowRiskCount ?? 0);
  const distributionTotal = highCount + mediumCount + lowCount || 1;

  return (
    <div className="max-w-345 mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Dashboard
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Portfolio-level view across {assessedProjects} assessed project
            {assessedProjects === 1 ? "" : "s"}
            {totalProjects > assessedProjects
              ? ` (${totalProjects - assessedProjects} awaiting assessment)`
              : ""}
            .
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={downloadingPortfolio}
          className="inline-flex items-center justify-center gap-2 px-4 h-10 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          {downloadingPortfolio ? "Generating PDF..." : "Download Report"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.15fr_0.75fr_0.85fr_1.25fr] gap-4 sm:gap-5 mb-6 sm:mb-8">
        <Card className="flex flex-col">
          <CardHeader
            title="Total Projects"
            subtitle="All submitted projects"
            icon={<FolderIcon />}
          />
          <div className="px-4 py-4 sm:px-5 flex flex-col items-center justify-center text-center flex-1">
            <span className="text-5xl font-extrabold text-white leading-none">
              {totalProjects}
            </span>
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {totalProjects === 1 ? "Project" : "Projects"}
            </span>
            <div className="mt-3 w-full rounded-xl bg-gray-900/40 border border-gray-700/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">Assessed</span>
                <span className="text-sm font-bold text-indigo-400">
                  {assessedProjects}
                  <span className="text-gray-500 font-medium">/{totalProjects}</span>
                </span>
              </div>
              <Bar
                value={(assessedProjects / (totalProjects || 1)) * 100}
                colorClass="bg-indigo-500"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Portfolio analytics coverage
                </span>
                {totalProjects > assessedProjects ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    {totalProjects - assessedProjects} pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    All assessed
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Average Risk Score"
            subtitle="Across assessed projects"
            icon={<GaugeIcon />}
          />
          <div className="px-4 py-4 sm:px-5 flex flex-col items-center justify-center text-center flex-1">
            <RingGauge
              value={avgRisk}
              size={132}
              stroke={12}
              color={avgRiskTheme.ring}
              subLabel="/100"
            />
            <span
              className={`mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${avgRiskTheme.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${avgRiskTheme.dot}`} />
              {severityOf(avgRisk) === "high"
                ? "High"
                : severityOf(avgRisk) === "medium"
                  ? "Moderate"
                  : "Low"}{" "}
              portfolio risk
            </span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Avg Success Probability"
            subtitle="Across assessed projects"
            icon={<TrendingUpIcon />}
          />
          <div className="px-4 py-4 sm:px-5 flex flex-col items-center justify-center text-center flex-1">
            <RingGauge
              value={avgSuccess}
              size={132}
              stroke={12}
              color="#6366f1"
              subLabel="%"
            />
            <span className="mt-6 text-xs text-gray-400">
              Average likelihood of success
            </span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Risk Distribution"
            subtitle="High / Medium / Low split"
            icon={<PieChartIcon />}
          />
          <div className="px-4 py-4 sm:px-5 flex flex-col items-center justify-center text-center flex-1">
            <DistributionDonut
              high={highCount}
              medium={mediumCount}
              low={lowCount}
              size={132}
              stroke={12}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 w-full">
              {[
                {
                  label: "High",
                  count: highCount,
                  tone: RISK_THEME.high,
                },
                {
                  label: "Medium",
                  count: mediumCount,
                  tone: RISK_THEME.medium,
                },
                {
                  label: "Low",
                  count: lowCount,
                  tone: RISK_THEME.low,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`rounded-xl border ${row.tone.badge} px-2 py-2.5 text-center`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${row.tone.dot}`} />
                    <span
                      className={`text-xl font-extrabold leading-none ${row.tone.text}`}
                    >
                      {row.count}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-300">
                    {row.label} risk
                  </p>
                  {row.count > 0 ? (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {Math.round((row.count / distributionTotal) * 100)}% of
                      portfolio
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-600 mt-0.5">None yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 px-4 py-3 sm:px-5 flex flex-col items-start gap-3 mb-6 sm:flex-row sm:items-center sm:mb-8">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
          <LightbulbIcon />
        </div>
        <p className="text-sm text-indigo-200 leading-snug">
          {view.topRiskCategory && assessedProjects >= 3 ? (
            <>
              <span className="font-semibold text-indigo-300">
                {view.topRiskCategory} risk
              </span>{" "}
              is your most common concern across projects — it is the
              highest-scoring category in{" "}
              <span className="font-semibold text-indigo-300">
                {view.topRiskCategoryPercentage}%
              </span>{" "}
              of them.
            </>
          ) : (
            <>
              Your portfolio averages{" "}
              <span className="font-semibold text-indigo-300">
                {avgRisk}/100 risk
              </span>{" "}
              with a{" "}
              <span className="font-semibold text-indigo-300">
                {avgSuccess}%
              </span>{" "}
              average success probability.
              {assessedProjects < 3 &&
                " Assess more projects to unlock portfolio-level insights like your most common risk category."}
            </>
          )}
        </p>
      </div>

      {sortedProjects.length >= 2 && (
        <Card className="mb-6 sm:mb-8">
          <CardHeader
            title="Project Comparison"
            subtitle="Risk, success probability, and feasibility side-by-side"
            icon={<PieChartIcon />}
          />
          <div className="px-5 py-4">
            <ComparisonRows projects={sortedProjects} />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Projects Overview"
          subtitle="Click a project to open its full Risk Assessment"
          icon={<GridIcon />}
        />
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm min-w-200">
            <thead>
              <tr className="border-b border-gray-700/50">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-3 whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                        col.align === "right" ? "justify-end" : ""
                      } ${
                        sortConfig.key === col.key
                          ? "text-indigo-300"
                          : "text-gray-400 hover:text-indigo-300"
                      }`}
                    >
                      {col.label}
                      <SortArrow
                        active={sortConfig.key === col.key}
                        direction={sortConfig.direction}
                      />
                    </button>
                  </th>
                ))}
                <th className="px-5 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => {
                const theme = themeFor(project.riskLevel);
                return (
                  <tr
                    key={project.projectId}
                    onClick={() => onSelectProjectForAssessment?.(project)}
                    className="border-b border-gray-700/30 last:border-0 odd:bg-gray-900/40 hover:bg-indigo-500/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-medium text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap">
                      {project.projectName}
                    </td>
                    <td className="px-5 py-3.5 text-gray-300 whitespace-nowrap">
                      {project.industry || "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 w-48 min-w-45 max-w-45">
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        <span className={`font-bold ${theme.text}`}>
                          {project.riskScore != null
                            ? project.riskScore
                            : "\u2014"}
                          <span className="text-[10px] text-gray-500 font-medium">
                            /100
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${theme.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
                          />
                          {project.riskLevel || "Unknown"}
                        </span>
                      </div>
                      <div className="max-w-45 ml-auto">
                        <Bar value={project.riskScore} colorClass={theme.bar} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-200 font-semibold whitespace-nowrap">
                      {project.successProbability != null
                        ? `${project.successProbability}%`
                        : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-200 font-semibold whitespace-nowrap">
                      {project.feasibilityScore != null
                        ? project.feasibilityScore
                        : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        View
                        <svg
                          className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-700/30 lg:hidden">
          {sortedProjects.map((project) => {
            const theme = themeFor(project.riskLevel);
            return (
              <div
                key={project.projectId}
                className="px-4 py-4 transition-colors hover:bg-indigo-500/10 active:bg-indigo-500/15 sm:px-5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectProjectForAssessment?.(project)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <p className="truncate text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                      {project.projectName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {project.industry || "\u2014"} &middot;{" "}
                      {formatDate(project.createdAt)}
                    </p>
                  </button>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-400">
                    View
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-gray-700/30 bg-gray-900/40 px-2 py-2 text-center">
                    <p
                      className={`text-sm font-bold ${theme.text}`}
                    >
                      {project.riskScore != null
                        ? project.riskScore
                        : "\u2014"}
                      <span className="text-[10px] font-medium text-gray-500">
                        /100
                      </span>
                    </p>
                    <Bar value={project.riskScore} colorClass={theme.bar} />
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {project.riskLevel || "Unknown"} risk
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-700/30 bg-gray-900/40 px-2 py-2 text-center">
                    <p className="text-sm font-bold text-gray-200">
                      {project.successProbability != null
                        ? `${project.successProbability}%`
                        : "\u2014"}
                    </p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Success
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-700/30 bg-gray-900/40 px-2 py-2 text-center">
                    <p className="text-sm font-bold text-gray-200">
                      {project.feasibilityScore != null
                        ? project.feasibilityScore
                        : "\u2014"}
                    </p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Feasibility
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
