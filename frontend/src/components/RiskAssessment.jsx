import { useState, useEffect, useCallback } from "react";
import ProjectSelector from "./ProjectSelector";
import ProjectCatalog from "./ProjectCatalog";
import AuthGateMessage from "./AuthGateMessage";

const CATEGORY_ORDER = [
  { key: "financial_risk", label: "Financial" },
  { key: "market_risk", label: "Market" },
  { key: "technical_risk", label: "Technical" },
  { key: "operational_risk", label: "Operational" },
  { key: "execution_risk", label: "Execution" },
];

const METRIC_LABELS = {
  financial_sustainability: "Financial Sustainability",
  team_capability: "Team Capability",
  competitive_advantage: "Competitive Advantage",
  resource_availability: "Resource Availability",
  market_opportunity: "Market Opportunity",
  execution_readiness: "Execution Readiness",
  scalability_potential: "Scalability Potential",
};

// ---------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------
function severityOf(score) {
  if (score == null || Number.isNaN(Number(score))) return "none";
  if (Number(score) >= 67) return "high";
  if (Number(score) >= 34) return "medium";
  return "low";
}

// Risk-level color theme: low = green, medium = orange, high = red
const RISK_THEME = {
  low:    { ring: "#10b981", text: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  medium: { ring: "#f59e0b", text: "text-amber-400",   badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",   bar: "bg-amber-500",   dot: "bg-amber-500" },
  high:   { ring: "#ef4444", text: "text-red-400",     badge: "bg-red-500/10 text-red-400 border border-red-500/20",       bar: "bg-red-500",     dot: "bg-red-500" },
  none:   { ring: "#94a3b8", text: "text-gray-400",   badge: "bg-gray-500/10 text-gray-400 border border-gray-500/20",   bar: "bg-gray-500",   dot: "bg-gray-500" },
};

function themeFor(level) {
  return RISK_THEME[String(level || "none").toLowerCase()] || RISK_THEME.none;
}

// Success-probability label: High / Moderate / Low
function successMeta(sp) {
  if (sp == null) return null;
  if (sp >= 70) return { label: "High", bar: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-500/10 text-emerald-400" };
  if (sp >= 40) return { label: "Moderate", bar: "bg-amber-500", text: "text-amber-400", chip: "bg-amber-500/10 text-amber-400" };
  return { label: "Low", bar: "bg-red-500", text: "text-red-400", chip: "bg-red-500/10 text-red-400" };
}

// ---------------------------------------------------------------
// Human-readable risk factor naming (presentation only).
// Raw ML feature names + SHAP contributions are kept internally and
// only used to derive user-friendly labels, explanations and impact
// levels - they are never shown directly to end users.
// ---------------------------------------------------------------
const KNOWN_FEATURE_LABELS = {
  funding_total_usd_log: "Funding Level Compared to Historical Startups",
  is_india: "India Market Context",
};

const CATEGORY_LABELS = {
  software: "Software Industry Advantage",
  analytics: "Analytics Sector Impact",
  unknown: "Industry Classification Uncertainty",
  other: "General Industry Category Impact",
  others: "General Industry Category Impact",
};

const NOISE_TOKENS = new Set(["is", "has", "log", "count"]);

function toTitleCaseWord(token) {
  if (token === "usd") return "USD";
  if (token === "india") return "India";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function snakeCaseToWords(raw) {
  const words = raw
    .split("_")
    .map((w) => w.trim())
    .filter((w) => w && !NOISE_TOKENS.has(w.toLowerCase()))
    .map((w) => toTitleCaseWord(w.toLowerCase()));
  return words.length > 0 ? words.join(" ") : "Unknown Factor";
}

function industryCategoryLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  const readable = value
    ? toTitleCaseWord(value[0].toUpperCase() + value.slice(1).toLowerCase())
    : "Missing";
  return `${readable} Industry Advantage`;
}

function humanizeFeatureName(feature) {
  if (!feature) return "Unknown Factor";
  if (KNOWN_FEATURE_LABELS[feature]) return KNOWN_FEATURE_LABELS[feature];
  const cat = /^primary_category_(.+)$/i.exec(feature);
  if (cat) return industryCategoryLabel(cat[1]);
  return snakeCaseToWords(feature);
}

// Business-friendly explanations for known features.
const EXPLANATIONS = {
  funding_total_usd_log: {
    increases_risk:
      "Lower funding compared to previously funded companies increases financial risk.",
    increases_success:
      "Higher funding compared to previously funded companies improves your chances of success.",
  },
  is_india: {
    increases_success:
      "Operating in the India market context supports a stronger chance of success.",
  },
};

function explanationFor(feature, direction) {
  const map = EXPLANATIONS[feature];
  if (map && map[direction]) return map[direction];
  const title = humanizeFeatureName(feature);
  return direction === "increases_risk"
    ? `${title} is a factor pushing this project toward higher risk.`
    : `${title} is a factor helping this project toward success.`;
}

function impactMeta(contribution) {
  const magnitude = Math.abs(Number(contribution));
  if (contribution == null || Number.isNaN(magnitude)) {
    return { label: "Low", cls: "bg-gray-500/10 text-gray-400" };
  }
  if (magnitude >= 1.5) return { label: "High", cls: "bg-amber-500/10 text-amber-400" };
  if (magnitude >= 0.5) return { label: "Medium", cls: "bg-sky-500/10 text-sky-400" };
  return { label: "Low", cls: "bg-gray-500/10 text-gray-400" };
}

function Skeleton({ className = "" }) {
  return <div className={`bg-gray-700 rounded-xl animate-pulse ${className}`} />;
}

// Circular progress gauge
function RingGauge({ value, size = 128, stroke = 11, color = "#6366f1", subLabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value != null ? Math.min(Math.max(Number(value), 0), 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-gray-700" />
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
        <span className="text-3xl font-extrabold text-white leading-none">{value != null ? value : "\u2014"}</span>
        {subLabel && <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-0.5">{subLabel}</span>}
      </div>
    </div>
  );
}

// Horizontal progress bar
function Bar({ value, colorClass = "bg-indigo-500", track = "bg-gray-700" }) {
  const pct = value != null ? Math.min(Math.max(Number(value), 0), 100) : 0;
  return (
    <div className={`h-2 w-full rounded-full overflow-hidden ${track}`}>
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-sm ${className}`}>{children}</div>
  );
}

function CardHeader({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-700/50 px-5 py-4">
      {icon && <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">{icon}</div>}
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Inline icon set
// ---------------------------------------------------------------
function RiskIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M5.636 5.636l1.591 1.591M16.773 16.773l1.591 1.591M5.636 18.364l1.591-1.591M16.773 7.227l1.591-1.591M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v6m0 0l3.5-3.5M12 10.5l-3.5-3.5M3.5 5.25V4.5m0 0h.75M3.5 4.5v.75M20.5 4.5V3.5m0 0h.75m-.75 0v.75M3 15.75A9 9 0 1121 15.75M3 15.75h18" />
    </svg>
  );
}

function AlertIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function SuccessIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StrengthIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function WeaknessIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ThreatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.5l7 2.8v5.1c0 4.3-3 7.6-7 9.3-4-1.7-7-5-7-9.3V5.25l7-2.8z" />
    </svg>
  );
}

function SwotIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function FeasibilityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

const SWOT_TONES = {
  green: { header: "text-emerald-400", chip: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/20", soft: "bg-emerald-500/10", bullet: "text-emerald-500" },
  red:   { header: "text-red-400",     chip: "bg-red-500/10 text-red-400",         border: "border-red-500/20",     soft: "bg-red-500/10",     bullet: "text-red-500" },
  blue:  { header: "text-sky-400",     chip: "bg-sky-500/10 text-sky-400",         border: "border-sky-500/20",     soft: "bg-sky-500/10",     bullet: "text-sky-500" },
  amber: { header: "text-amber-400",   chip: "bg-amber-500/10 text-amber-400",     border: "border-amber-500/20",   soft: "bg-amber-500/10",   bullet: "text-amber-500" },
};

function SwotBlock({ title, icon, items = [], tone }) {
  const t = SWOT_TONES[tone] || SWOT_TONES.green;
  const list = Array.isArray(items) ? items : [];
  return (
    <div className={`rounded-xl border ${t.border} ${t.soft} p-4`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-7 h-7 rounded-lg ${t.chip} flex items-center justify-center`}>{icon}</div>
        <h4 className={`text-sm font-bold ${t.header}`}>{title}</h4>
      </div>
      {list.length > 0 ? (
        <ul className="space-y-1.5">
          {list.map((item, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-300 leading-snug">
              <span className={`mt-px shrink-0 ${t.bullet}`}>{"\u2022"}</span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{"\u2014"}</p>
      )}
    </div>
  );
}

function RiskAssessment({
  project,
  projects = [],
  isLoggedIn,
  onSelectProject,
  onLoginClick,
  onReset,
}) {
  const [selected, setSelected] = useState(project || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAllFactors, setShowAllFactors] = useState(false);

  const projectId = selected?.projectId;

  const urlFor = useCallback(
    (id) => `${import.meta.env.VITE_API_URL}/api/projects/${id}/risk-analysis`,
    [],
  );

  const fetchAssessment = useCallback(
    async (id, method) => {
      const res = await fetch(urlFor(id), { method });
      if (res.status === 404 && method === "GET") throw new Error("NOT_FOUND");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed with status ${res.status}`);
      }
      return res.json();
    },
    [urlFor],
  );

  // Load cached assessment, or generate a fresh one when none exists
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    fetchAssessment(projectId, "GET")
      .then((cached) => {
        if (!cancelled) {
          setData(cached);
          setShowAllFactors(false);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.message === "NOT_FOUND") {
          fetchAssessment(projectId, "POST")
            .then((generated) => {
              if (!cancelled) {
                setData(generated);
                setShowAllFactors(false);
                setLoading(false);
              }
            })
            .catch((postErr) => {
              if (cancelled) return;
              setError(postErr.message);
              setLoading(false);
              if (/Request failed with status (500|502|503)/.test(postErr.message)) {
                setIsPolling(true);
              }
            });
        } else {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, reloadKey, fetchAssessment]);

  // Poll while a server-side generation is being retried
  useEffect(() => {
    if (!projectId || !error || !isPolling) return;
    if (!/Request failed with status (500|502|503)/.test(error)) return;
    const interval = setInterval(() => {
      fetchAssessment(projectId, "GET")
        .then((json) => {
          setData(json);
          setShowAllFactors(false);
          setError("");
          setIsPolling(false);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [projectId, error, isPolling, fetchAssessment]);

  const retry = () => setReloadKey((k) => k + 1);

  // ---------------------------------------------------------------
  // Derived data mapped from the API response (unchanged)
  // ---------------------------------------------------------------
  const breakdown = data?.risk_breakdown || {};
  const categories = CATEGORY_ORDER.map((c) => ({ ...c, item: breakdown[c.key] || {} }));
  const overall = data?.overallRiskScore != null ? Number(data.overallRiskScore) : null;
  const riskTheme = themeFor(data?.riskLevel);
  const overallLevel = data?.riskLevel || "Unknown";
  const successSp = data?.successProbability;
  const spMeta = successMeta(successSp);
  const financial = data?.financialRiskScore;
  const mlOnlyFinancialRisk = data?.mlOnlyFinancialRisk;
  const budgetAdequacy = data?.budgetAdequacy || {};
  const topFactors = data?.topRiskFactors || [];
  const metrics = data?.assessmentMetrics || {};
  const swot = data?.swot || {};
  const feasibility = data?.feasibilityScore;
  const metricsEntries = Object.entries(metrics);
  const budgetAdequacyRisk = budgetAdequacy.score != null ? Number(budgetAdequacy.score) : null;
  const recommendations = data?.recommendations || [];

    // ---------------------------------------------------------------
  // Not logged in — show auth gate
  // ---------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <AuthGateMessage
        title="Login to access Risk Assessment"
        description="Login and create a project to get a detailed risk assessment with success probability, failure risk factors, SWOT analysis, and actionable recommendations."
        onLoginClick={onLoginClick}
      />
    );
  }

  // ---------------------------------------------------------------
  // Empty / selector state
  // ---------------------------------------------------------------
  if (!projectId) {
    return (
      <div className="max-w-345 mx-auto px-6 py-8">
        <ProjectCatalog
          title="Select a Project"
          subtitle="Choose a project to view its risk assessment."
          ctaLabel="Open Assessment"
          projects={projects}
          onSelect={(picked) => {
            setSelected(picked);
            setData(null);
            setShowAllFactors(false);
            setLoading(true);
            setError("");
            if (onSelectProject) onSelectProject(picked);
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------
  if (loading && !data) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-345 mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-64" />
            </div>
            <div className="lg:col-span-6">
              <Skeleton className="h-[30rem]" />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="h-56" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------
  if (error && !data) {
    return (
      <div className="min-h-screen flex justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-5">
            <AlertIcon />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Could not generate the risk assessment</h2>
          <p className="text-sm text-gray-400 mb-2">{error}</p>
          {isPolling && (
            <p className="text-xs font-medium text-indigo-400 mb-3 flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Waiting for the analysis service...
            </p>
          )}
          <button
            onClick={retry}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {isPolling ? "Retry now" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-345 mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Risk Assessment</h1>
            <p className="mt-1 text-sm text-gray-400">
              {selected?.projectName}{" "}
              <span className="text-gray-600">{"\u2022"}</span>{" "}
              {selected?.projectType || "General"}
              {selected?.businessModel ? ` \u2022 ${selected.businessModel}` : ""}
              {selected?.targetMarket ? ` \u2022 ${selected.targetMarket}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {projects.length > 1 && (
              <ProjectSelector
                projects={projects}
                value={projectId}
                onChange={(picked) => {
                  setSelected(picked);
                  setData(null);
                  setShowAllFactors(false);
                  setLoading(true);
                  setError("");
                  if (onSelectProject) onSelectProject(picked);
                }}
                label=""
              />
            )}
            <button
              onClick={retry}
              className="h-10 px-4 text-sm font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                setSelected(null);
                setData(null);
                setShowAllFactors(false);
                setLoading(true);
                setError("");
                if (onReset) onReset();
              }}
                className="h-10 px-3 text-xs font-medium text-gray-400 hover:text-indigo-400 border border-gray-700/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                Back to all projects
              </button>
          </div>
        </div>

        {/* 3-column dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT - Risk summary */}
          <div className="lg:col-span-3 flex flex-col gap-6 h-full">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Risk Score" icon={<RiskIcon />} />
              <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center text-center">
                <RingGauge value={overall} size={150} stroke={12} color={riskTheme.ring} subLabel="/100" />
                <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${riskTheme.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${riskTheme.dot}`} />
                  {overallLevel} Risk
                </span>
                <p className="mt-3 text-xs text-gray-500">Weighted across all five risk categories</p>
              </div>
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-gray-900/40 border border-gray-700/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">Success Probability</span>
                    {spMeta && <span className={`text-sm font-bold ${spMeta.text}`}>{successSp != null ? successSp : "\u2014"}%</span>}
                  </div>
                  <Bar value={successSp} colorClass={spMeta ? spMeta.bar : "bg-gray-500"} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Likelihood of a successful outcome</span>
                    {spMeta && (
                      <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${spMeta.chip}`}>{spMeta.label}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Risk by Category - below Risk Score */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Risk by Category" subtitle="Five-category breakdown" icon={<ListIcon />} />
              <div className="flex-1 px-5 py-4 space-y-4 flex flex-col justify-center">
                {categories.map((c) => {
                  const cs = c.item?.score != null ? Number(c.item.score) : null;
                  const t = themeFor(severityOf(cs));
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-300 font-medium">{c.label}</span>
                        <span className={`font-bold ${t.text}`}>{cs != null ? cs : "\u2014"}<span className="text-[10px] text-gray-500 font-medium">/100</span></span>
                      </div>
                      <Bar value={cs} colorClass={t.bar} />
                      {c.item?.reason ? (
                        <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                          {c.item.reason}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Financial Details - below Risk by Category */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Financial Details" subtitle="Budget adequacy vs historical comparison" icon={<GaugeIcon />} />
              <div className="flex-1 px-5 py-4 space-y-3 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Blended Financial Risk</span>
                  <span className={`text-sm font-bold ${themeFor(severityOf(financial)).text}`}>
                    {financial != null ? financial : "\u2014"}<span className="text-[10px] text-gray-500 font-medium">/100</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">ML historical comparison</span>
                  <span className="text-sm font-semibold text-gray-200">{mlOnlyFinancialRisk != null ? mlOnlyFinancialRisk : "\u2014"}</span>
                </div>
                <div className="border-t border-gray-700/30 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Budget Adequacy</span>
                    <span className={`text-sm font-bold ${themeFor(severityOf(budgetAdequacyRisk != null ? 100 - budgetAdequacyRisk : null)).text}`}>
                      {budgetAdequacyRisk != null ? budgetAdequacyRisk : "\u2014"}<span className="text-[10px] text-gray-500 font-medium">/100</span>
                    </span>
                  </div>
                  {budgetAdequacy.reasoning && (
                    <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">{budgetAdequacy.reasoning}</p>
                  )}
                </div>
              </div>
            </Card>

          </div>

          {/* CENTER - SWOT */}
          <div className="lg:col-span-6 flex flex-col gap-6 h-full">
            <Card className="shrink-0">
              <CardHeader title="SWOT Analysis" subtitle="Gemini's structured assessment" icon={<SwotIcon />} />
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SwotBlock title="Strengths" icon={<StrengthIcon />} items={swot.strengths} tone="green" />
                <SwotBlock title="Weaknesses" icon={<WeaknessIcon />} items={swot.weaknesses} tone="red" />
                <SwotBlock title="Opportunities" icon={<OpportunityIcon />} items={swot.opportunities} tone="blue" />
                <SwotBlock title="Threats" icon={<ThreatIcon />} items={swot.threats} tone="amber" />
              </div>
            </Card>

            {/* Key Risk Factors - below SWOT, same width */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Key Risk Factors" subtitle="Primary drivers of the financial baseline" icon={<ListIcon />} />
              <div className={`flex-1 px-5 py-4 space-y-2 ${showAllFactors ? "overflow-y-auto max-h-96" : ""}`}>
                {topFactors.length > 0 ? (
                  (showAllFactors ? topFactors : topFactors.slice(0, 4)).map((f, i) => {
                    const negative = f.direction === "increases_risk";
                    const title = humanizeFeatureName(f.feature);
                    const explanation = explanationFor(f.feature, f.direction);
                    const impact = impactMeta(f.contribution);
                    return (
                      <div
                        key={i}
                        data-feature={f.feature}
                        data-contribution={f.contribution}
                        className="rounded-xl border border-gray-700/30 bg-gray-900/30 p-3"
                      >
                        <div className="flex gap-3 items-start">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${negative ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {negative ? <AlertIcon className="w-4 h-4" /> : <SuccessIcon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-white leading-snug">{title}</p>
                              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${impact.cls}`}>
                                Impact: {impact.label}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-300 leading-relaxed">{explanation}</p>
                            <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${negative ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                              {negative ? "Increases risk" : "Improves success"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">No risk factors returned.</p>
                )}
              </div>
              {topFactors.length > 4 && (
                <div className="px-5 pb-4">
                  <button
                    type="button"
                    onClick={() => setShowAllFactors((s) => !s)}
                    className="w-full h-9 text-xs font-semibold rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    {showAllFactors ? "Show less" : `Show all ${topFactors.length} risk factors`}
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT - Feasibility */}
          <div className="lg:col-span-3 flex flex-col gap-6 h-full">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Project Feasibility" icon={<FeasibilityIcon />} />
              <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center text-center">
                <RingGauge value={feasibility} size={140} stroke={12} color="#6366f1" subLabel="% feasible" />
                <p className="mt-4 text-sm text-gray-300 leading-relaxed">
                  {data?.feasibilityVerdict || "No feasibility verdict provided."}
                </p>
              </div>
            </Card>

            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader title="Assessment Metrics" subtitle="Gemini's 0-100 health metrics" icon={<GaugeIcon />} />
              <div className="flex-1 px-5 py-4 space-y-3.5 overflow-y-auto">
                {metricsEntries.length > 0 ? (
                  metricsEntries.map(([key, value]) => {
                    const v = value != null ? Number(value) : null;
                    const msev = v != null ? severityOf(100 - v) : "none";
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-300 font-medium">{METRIC_LABELS[key] || key}</span>
                          <span className="font-bold text-gray-100">{v != null ? v : "\u2014"}</span>
                        </div>
                        <Bar value={v} colorClass={RISK_THEME[msev]?.bar || "bg-gray-500"} />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">No metrics returned.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Recommendations - below the 3-column dashboard */}
          <div className="mt-6 lg:col-span-12">
            <Card>
              <CardHeader title="Recommendations" subtitle="Actionable next steps to de-risk your startup" icon={<SuccessIcon />} />
              <div className="px-5 py-5">
                {recommendations.length > 0 ? (
                  <ul className="space-y-3">
                    {recommendations.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="min-w-0">{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    No actionable recommendations were returned for this assessment.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskAssessment;