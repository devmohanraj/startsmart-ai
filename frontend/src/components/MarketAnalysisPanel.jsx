import { useState, useEffect } from "react";
import ProjectSummary from "./ProjectSummary";

function Skeleton({ className = "" }) {
  return (
    <div className={`bg-gray-700 rounded-lg animate-pulse ${className}`} />
  );
}

function formatCurrency(value) {
  if (!value) return "—";
  const num = Number(value);
  if (num >= 10_000_000) return "₹" + (num / 10_000_000).toFixed(1) + " Cr";
  if (num >= 100_000) return "₹" + (num / 100_000).toFixed(1) + " L";
  if (num >= 1_000) return "₹" + (num / 1_000).toFixed(1) + " K";
  return "₹" + num.toLocaleString("en-IN");
}


function MarketTrendsChart({ data, growthRate }) {
  if (!data || data.length === 0) return null;

  const width = 720;
  const height = 280;
  const pad = { top: 35, right: 30, bottom: 38, left: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const growthNum = parseFloat(growthRate) || 0;
  const values = data.map((d) => Number(d.value));
  const allValues = [...values, growthNum];
  const max = Math.max(...allValues);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad.left + (chartW * i) / (data.length - 1);
    const y = pad.top + chartH - ((Number(d.value) - min) / range) * chartH;
    return { ...d, x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${(pad.top + chartH).toFixed(1)} L ${first.x.toFixed(1)} ${(pad.top + chartH).toFixed(1)} Z`;

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const y = pad.top + (chartH * i) / 4;
    return { y, value: max - (range * i) / 4 };
  });

  const growthY = pad.top + chartH - ((growthNum - min) / range) * chartH;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-w-[300px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={g.y}
              x2={width - pad.right}
              y2={g.y}
              stroke="#374151"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={g.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
            >
              {g.value >= 1000 ? (g.value / 1000).toFixed(1) + "k" : Math.round(g.value)}
            </text>
          </g>
        ))}

        {growthNum > 0 && (
          <g>
            <line
              x1={pad.left}
              y1={growthY}
              x2={width - pad.right}
              y2={growthY}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text
              x={width - pad.right}
              y={growthY - 6}
              textAnchor="end"
              fontSize="10"
              fill="#10b981"
              fontWeight="600"
            >
              Growth Rate: {growthRate}
            </text>
          </g>
        )}

        <path d={areaPath} fill="url(#trendFill)" />

        <path
          d={linePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#ef4444"
              stroke="#fecaca"
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#e5e7eb"
              fontWeight="600"
            >
              {p.value}%
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={`x-${i}`}
            x={p.x}
            y={pad.top + chartH + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
          >
            {p.year}
          </text>
        ))}
      </svg>
    </div>
  );
}

function MarketAnalysisPanel({
  projectId,
  onAnalysisComplete,
  project,
  onReset,
  cachedData,
  onCacheAnalysis,
}) {
  const [data, setData] = useState(cachedData || null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (cachedData) {
      if (onAnalysisComplete) onAnalysisComplete();
      return;
    }

    let cancelled = false;

    fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/market-analysis`, {
      method: "GET",
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        if (res.status === 404) {
          throw new Error("NOT_FOUND");
        }
        throw new Error(`Request failed with status ${res.status}`);
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
          if (onAnalysisComplete) onAnalysisComplete();
          if (onCacheAnalysis) onCacheAnalysis(projectId, json);
        }
      })
      .catch(async (err) => {
        if (!cancelled && err.message === "NOT_FOUND") {
          try {
            const postRes = await fetch(
              `${import.meta.env.VITE_API_URL}/api/projects/${projectId}/market-analysis`,
              {
                method: "POST",
              },
            );
            if (!postRes.ok) {
              const body = await postRes.json().catch(() => null);
              throw new Error(
                body?.error || `Request failed with status ${postRes.status}`,
              );
            }
            const json = await postRes.json();
            if (!cancelled) {
              setData(json);
              setLoading(false);
              if (onAnalysisComplete) onAnalysisComplete();
              if (onCacheAnalysis) onCacheAnalysis(projectId, json);
            }
          } catch (postErr) {
            if (!cancelled) {
              setError(postErr.message);
              setLoading(false);
              if (onAnalysisComplete) onAnalysisComplete();
            }
          }
        } else if (!cancelled) {
          setError(err.message);
          setLoading(false);
          if (onAnalysisComplete) onAnalysisComplete();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, onAnalysisComplete, cachedData, onCacheAnalysis]);

  useEffect(() => {
    if (!error || !isPolling) return;

    const isServerError = error.match(
      /Request failed with status (500|502|503)/,
    );
    if (!isServerError) return;

    const pollInterval = setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/market-analysis`, {
        method: "GET",
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
          }
          return res.json();
        })
        .then((json) => {
          setData(json);
          setError("");
          setIsPolling(false);
          setLoading(false);
          if (onCacheAnalysis) onCacheAnalysis(projectId, json);
        })
        .catch((err) => {
          console.log("Polling...", err.message);
        });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [error, isPolling, projectId, onCacheAnalysis]);

  const startPolling = () => {
    setIsPolling(true);
  };

  const retry = () => {
    setLoading(true);
    setError("");
    setData(null);

    fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/market-analysis`, {
      method: "POST",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || `Request failed with status ${res.status}`,
          );
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        if (onCacheAnalysis) onCacheAnalysis(projectId, json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  let trends = [];
  if (data?.marketTrendsJson) {
    try {
      trends = JSON.parse(data.marketTrendsJson);
    } catch {
      trends = [];
    }
  }
  const growthNum = parseFloat(data?.growthRate) || 0;

  // Sort competitors by market share (highest first)
  const sortedCompetitors = data?.competitors
    ? [...data.competitors].sort((a, b) => {
        const shareA = parseFloat(a.marketShare) || 0;
        const shareB = parseFloat(b.marketShare) || 0;
        return shareB - shareA;
      })
    : [];

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 items-stretch lg:h-[calc(100vh-6rem)]">
        <div className="md:col-span-1 lg:col-span-6 flex flex-col gap-4 h-full">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="flex-1" />
        </div>
        <div className="md:col-span-1 lg:col-span-3 flex flex-col gap-4 h-full">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="flex-1" />
        </div>
        <div className="md:col-span-1 lg:col-span-3 flex flex-col gap-4 h-full">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    const isServerError = error.match(
      /Request failed with status (500|502|503)/,
    );
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch lg:h-[calc(100vh-6rem)]">
        <div className="lg:col-span-9 flex flex-col gap-4 h-full">
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3.5">
            <svg
              className="w-5 h-5 shrink-0 text-red-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">
                Analysis failed
              </p>
              <p className="text-sm text-red-300 mt-0.5">{error}</p>
              {isServerError && (
                <p className="text-sm text-gray-400 mt-1">
                  Backend is processing. This may take a minute...
                </p>
              )}
            </div>
          </div>
          {isServerError ? (
            <button
              onClick={startPolling}
              className="h-10 px-6 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              Check for results
            </button>
          ) : (
            <button
              onClick={retry}
              className="h-10 px-6 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
        {project && (
          <div className="lg:col-span-3 h-full">
            <ProjectSummary project={project} onReset={onReset} />
          </div>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 items-stretch lg:h-[calc(100vh-6rem)]">
      {/* Left column — Market Analysis */}
      <div className="md:col-span-1 lg:col-span-6 flex flex-col gap-3 md:gap-4 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 shrink-0">
          <h3 className="text-sm font-semibold text-white">Market Analysis</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-gray-300">Market Size</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-300">Growth Rate</span>
            </div>
            <button
              onClick={retry}
              disabled={loading}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* TAM/SAM/SOM cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 pb-2 md:pb-3 shrink-0">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <p className="text-lg font-bold text-white">
              {formatCurrency(data.marketSizeTam)}
            </p>
            <p className="text-[11px] text-gray-300 mt-1">TAM</p>
            <p className={`text-[10px] font-medium mt-1 ${growthNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {growthNum >= 0 ? "+" : "-"}{Math.abs(growthNum)}%
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <p className="text-lg font-bold text-white">
              {formatCurrency(data.marketSizeSam)}
            </p>
            <p className="text-[11px] text-gray-300 mt-1">SAM</p>
            <p className={`text-[10px] font-medium mt-1 ${growthNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {growthNum >= 0 ? "+" : "-"}{Math.abs(growthNum)}%
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <p className="text-lg font-bold text-white">
              {formatCurrency(data.marketSizeSom)}
            </p>
            <p className="text-[11px] text-gray-300 mt-1">SOM</p>
            <p className={`text-[10px] font-medium mt-1 ${growthNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {growthNum >= 0 ? "+" : "-"}{Math.abs(growthNum)}%
            </p>
          </div>
        </div>

        {/* Market trends chart — grows to fill remaining space */}
        {trends.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 md:p-4 flex flex-col gap-2 md:gap-3 min-h-0 h-72 md:h-84.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
              Market Trends
            </h4>
            <MarketTrendsChart data={trends} growthRate={data.growthRate} />
          </div>
        )}
      </div>

      {/* Center column — Competitor Landscape */}
      <div className="md:col-span-1 lg:col-span-3 flex flex-col gap-3 md:gap-4 h-full">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <h3 className="text-sm font-semibold text-white">
            Competitor Landscape
          </h3>
          <span className="text-xs text-gray-300">
            {sortedCompetitors.length} competitors
          </span>
        </div>

        {sortedCompetitors && sortedCompetitors.length > 0 ? (
          <div className="space-y-2 md:space-y-3 overflow-y-auto flex-1 pr-1">
            {sortedCompetitors.map((c) => {
              const shareNum = parseFloat(c.marketShare) || 0;
              const barColor = "bg-indigo-500";
              return (
                <div
                  key={c.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 md:p-4"
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm font-medium text-white">
                      {c.competitorName}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.position === "Direct"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-gray-700/50 text-gray-400 border border-gray-600/50"
                      }`}
                    >
                      {c.position}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Market Share
                      </p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {c.marketShare}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Revenue
                      </p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {c.revenue}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Growth
                      </p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {c.growth}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">
                      Market Position
                    </p>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(shareNum, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-sm text-gray-300">
            No competitor data available
          </div>
        )}
      </div>

      {/* Right column — Project Summary */}
      {project && (
        <div className="md:col-span-2 lg:col-span-3 h-full">
          <ProjectSummary project={project} onReset={onReset} />
        </div>
      )}
    </div>
  );
}

export default MarketAnalysisPanel;