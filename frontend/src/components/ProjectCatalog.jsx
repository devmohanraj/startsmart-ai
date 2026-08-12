function formatDate(dateString) {
  if (!dateString) return "\u2014";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProjectCatalog({
  projects = [],
  onSelect,
  title = "Your Projects",
  subtitle,
  ctaLabel = "Open",
}) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="w-full animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 shrink-0 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <svg
            className="w-5.5 h-5.5"
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
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-gray-300 mt-0.5">
            {subtitle ||
              `${projects.length} ${
                projects.length === 1 ? "project" : "projects"
              } available \u2014 click to view`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.projectId}
            onClick={() => onSelect && onSelect(project)}
            className="group flex items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/40 px-4 sm:px-5 py-4 hover:border-indigo-500/40 hover:bg-gray-700/60 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer"
          >
            <div className="w-11 h-11 shrink-0 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-colors">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                {project.projectName}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {project.projectType || project.industry || "\u2014"}{" "}
                <span className="text-gray-600">{"\u2022"}</span>{" "}
                {project.businessModel || "\u2014"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Created {formatDate(project.createdAt)}
              </p>
            </div>

            <div className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              {ctaLabel}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectCatalog;