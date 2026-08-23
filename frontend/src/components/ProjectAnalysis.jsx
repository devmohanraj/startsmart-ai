import { useState } from "react";
import MarketAnalysisPanel from "./MarketAnalysisPanel";
import ProjectSelector from "./ProjectSelector";
import ProjectCatalog from "./ProjectCatalog";
import AuthGateMessage from "./AuthGateMessage";

function ProjectAnalysis({
  project,
  projects = [],
  isLoggedIn,
  onSelectProject,
  onLoginClick,
  onAnalysisComplete,
  onCacheAnalysis,
  onReset,
  analysisCache = {},
}) {
  const [selected, setSelected] = useState(project || null);
  const [prevProjectId, setPrevProjectId] = useState(project?.projectId ?? null);

  // React-documented "adjust state when a prop changes" pattern (render-phase
  // update, not an effect): syncs local selection with the parent's project.
  if ((project?.projectId ?? null) !== prevProjectId) {
    setPrevProjectId(project?.projectId ?? null);
    setSelected(project || null);
  }

  const handleSelectProject = (project) => {
    setSelected(project);
    if (onSelectProject) onSelectProject(project);
  };

  if (!isLoggedIn) {
    return (
      <AuthGateMessage
        title="Login to access Project Analysis"
        description="Login and create a project to get detailed market analysis, competitor landscape, and growth insights powered by AI."
        onLoginClick={onLoginClick}
      />
    );
  }

  return (
    <div className="max-w-345 mx-auto px-4 sm:px-6 py-8">
      {(selected || projects.length === 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Project Analysis
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              Market size, growth, and competitor analysis for your project.
            </p>
          </div>
          {selected && (
            <div className="flex flex-wrap items-center gap-3">
              {projects.length > 1 && (
                <ProjectSelector
                  projects={projects}
                  value={selected?.projectId}
                  onChange={(picked) => {
                    setSelected(picked);
                    if (onSelectProject) onSelectProject(picked);
                  }}
                  label=""
                />
              )}
              <button
                onClick={() => {
                  setSelected(null);
                  if (onReset) onReset();
                }}
                className="h-10 px-3 text-xs font-medium text-gray-400 hover:text-indigo-400 border border-gray-700/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                Back to all projects
              </button>
            </div>
          )}
        </div>
      )}

      {selected ? (
        <MarketAnalysisPanel
          key={selected.projectId}
          projectId={selected.projectId}
          project={selected}
          onAnalysisComplete={onAnalysisComplete}
          onCacheAnalysis={onCacheAnalysis}
          cachedData={analysisCache[selected.projectId]}
          onReset={onReset}
        />
      ) : projects.length > 0 ? (
        <ProjectCatalog
          title="Select a Project"
          subtitle="Choose a project to view its market analysis."
          ctaLabel="Open Analysis"
          projects={projects}
          onSelect={handleSelectProject}
        />
      ) : (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-300 max-w-md mx-auto">
            You have no projects yet. Submit a project from the{" "}
            <span className="text-indigo-400 font-medium">Project Input</span>{" "}
            tab first.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProjectAnalysis;