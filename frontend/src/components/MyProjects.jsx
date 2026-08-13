function MyProjects({ projects, onSelectProject, onDeleteProject, deletingProjectId }) {
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="max-w-345 mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No projects yet</h3>
          <p className="text-sm text-gray-300">
            Submit a project to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-345 mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white tracking-tight">My Projects</h2>
        <p className="text-sm text-gray-300 mt-1">
          {projects.length} {projects.length === 1 ? "project" : "projects"} submitted
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.projectId}
            onClick={() => onSelectProject(project)}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 text-left hover:border-indigo-500/30 hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">
                {formatDate(project.createdAt)}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
              {project.projectName}
            </h3>
            <p className="text-xs text-gray-300">
              {project.projectType || project.industry || "—"}
            </p>

            <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
              <span className="text-xs text-gray-300">
                {project.businessModel || "—"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject?.(project.projectId);
                  }}
                  disabled={deletingProjectId === project.projectId}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete project"
                >
                  {deletingProjectId === project.projectId ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
                <span className="text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                  View
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyProjects;