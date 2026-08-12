function formatDate(dateString) {
  if (!dateString) return "\u2014";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProjectList({ projects = [], onSelect }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div
          key={project.projectId}
          onClick={() => onSelect && onSelect(project)}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 text-left hover:border-indigo-500/30 hover:shadow-md transition-all duration-200 group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xs text-gray-300">{formatDate(project.createdAt)}</span>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
            {project.projectName}
          </h3>
          <p className="text-xs text-gray-300">
            {project.projectType || project.industry || "\u2014"}
          </p>

          <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
            <span className="text-xs text-gray-300">{project.businessModel || "\u2014"}</span>
            <span className="text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
              View
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectList;