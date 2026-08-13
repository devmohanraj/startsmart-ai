function ProjectSelector({
  projects = [],
  value,
  onChange,
  label = "Project",
  placeholder = "No projects available",
}) {
  const selectedValue = value != null ? String(value) : "";

  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedValue}
          onChange={(e) => {
            const picked = projects.find(
              (p) => String(p.projectId) === e.target.value,
            );
            if (picked && onChange) onChange(picked);
          }}
          disabled={projects.length === 0}
          className="h-10 pl-3 pr-9 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none max-w-[60vw] sm:max-w-xs truncate"
        >
          {projects.length === 0 ? (
            <option value="">{placeholder}</option>
          ) : (
            projects.map((p) => (
              <option key={p.projectId} value={String(p.projectId)}>
                {p.projectName}
              </option>
            ))
          )}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default ProjectSelector;