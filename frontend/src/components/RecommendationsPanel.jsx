import { useCallback, useEffect, useState } from "react";

const PHASES = ["Immediate", "Next 30 Days", "Next Quarter"];

const PRIORITY_THEME = {
  High: { badge: "bg-red-500/10 text-red-400 border border-red-500/25", dot: "bg-red-500" },
  Medium: { badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25", dot: "bg-amber-500" },
  Low: { badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25", dot: "bg-emerald-500" },
};

const CATEGORY_LABELS = {
  financial: "Financial",
  market: "Market",
  technical: "Technical",
  operational: "Operational",
  execution: "Execution",
};

const EMPTY_PHASE_TEXT = {
  Immediate: "No immediate actions identified",
  "Next 30 Days": "No actions identified for the next 30 days",
  "Next Quarter": "No actions identified for next quarter",
};

function priorityTheme(priority) {
  return PRIORITY_THEME[priority] || PRIORITY_THEME.Low;
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function CategoryTag({ category }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-2.5 py-0.5">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M15 12l-3 3M15 12l-3-3" />
      </svg>
      {categoryLabel(category)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const theme = priorityTheme(priority);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${theme.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
      {priority}
    </span>
  );
}

function RecommendationCard({ item }) {
  return (
    <div className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CategoryTag category={item.riskCategory} />
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="text-sm text-gray-100 leading-relaxed">{item.recommendationText}</p>
      {item.mitigationStrategy && (
        <div className="mt-3 pt-3 border-t border-gray-700/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400 mb-1">Mitigation Strategy</p>
          <p className="text-[13px] text-gray-300 leading-relaxed">{item.mitigationStrategy}</p>
        </div>
      )}
    </div>
  );
}

function RecommendationsPanel({ projectId, riskData, cachedData, onCache }) {
  const [recommendations, setRecommendations] = useState(cachedData || null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loading = recommendations === null && !error && !generating;

  const urlFor = useCallback(
    (id) => `${import.meta.env.VITE_API_URL}/api/projects/${id}/recommendations`,
    [],
  );

  const fetchRecommendations = useCallback(
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

  useEffect(() => {
    if (!projectId || !riskData) return;
    if (cachedData) return;
    let cancelled = false;
    let pollInterval = null;

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    fetchRecommendations(projectId, "GET")
      .then((cached) => {
        if (!cancelled) {
          setRecommendations(cached);
          setError("");
          if (onCache) onCache(projectId, cached);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.message === "NOT_FOUND") {
          setGenerating(true);
          fetchRecommendations(projectId, "POST")
            .then((generated) => {
              if (!cancelled) {
                setRecommendations(generated);
                setError("");
                stopPolling();
                if (onCache) onCache(projectId, generated);
              }
            })
            .catch((postErr) => {
              if (cancelled) return;
              setError(postErr.message);
              if (/Request failed with status (500|502|503)/.test(postErr.message)) {
                // Server is retrying the Gemini generation — poll until it lands
                pollInterval = setInterval(() => {
                  fetchRecommendations(projectId, "GET")
                    .then((json) => {
                      if (!cancelled) {
                        setRecommendations(json);
                        setError("");
                        stopPolling();
                        if (onCache) onCache(projectId, json);
                      }
                    })
                    .catch(() => {});
                }, 3000);
              }
            })
            .finally(() => {
              if (!cancelled) setGenerating(false);
            });
        } else {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [projectId, riskData, cachedData, fetchRecommendations, onCache]);

  if (!projectId || !riskData) return null;

  const grouped = PHASES.map((phase) => ({
    phase,
    items: (recommendations || []).filter((r) => (r.phase || "Next 30 Days") === phase),
  }));

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-700/50 px-5 py-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Recommendations</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Actionable next steps to de-risk your startup
          </p>
        </div>
        {(generating || loading) && (
          <span className="ml-auto text-[11px] text-indigo-300 animate-pulse inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
            {generating ? "Generating with AI…" : "Loading…"}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        {error ? (
          <div>
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <p className="text-xs text-gray-400">
              If generation failed on the server, the panel will retry automatically once the
              recommendations are ready.
            </p>
          </div>
        ) : recommendations === null ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-gray-300">
              {generating ? "Crafting tailored recommendations…" : "No recommendations yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {grouped.map(({ phase, items }) => (
              <div key={phase} className="flex flex-col h-full min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-200">{phase}</span>
                  <span className="h-px flex-1 bg-gray-700/50" />
                </div>
                {items.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <RecommendationCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-gray-700/50 p-4 text-center text-xs text-gray-500">
                    {EMPTY_PHASE_TEXT[phase] || `No ${phase.toLowerCase()} actions identified`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPanel;