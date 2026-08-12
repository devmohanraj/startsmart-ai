const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function ProjectSummary({ project, onReset }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl shadow-sm h-126 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">Project Details</h3>
        </div>
          <button
            onClick={onReset}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
          New project
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5 py-4 gap-4 overflow-y-auto">
        <div className="space-y-3.5">
          <div className="pb-3 border-b border-gray-700/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Project Name</p>
            <p className="text-lg font-bold text-indigo-400 leading-tight">{project.projectName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Industry</p>
              <p className="text-sm font-semibold text-gray-100">{project.projectType}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Business Model</p>
              <p className="text-sm font-medium text-gray-300">{project.businessModel}</p>
            </div>
          </div>

          <div className="pb-3 border-b border-gray-700/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target Market</p>
            <p className="text-sm font-medium text-gray-300">{project.targetMarket}</p>
          </div>

          {project.budget && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Budget</span>
              <span className="text-sm font-bold text-emerald-400">
                {INR_FORMATTER.format(Number(project.budget))}
              </span>
            </div>
          )}
        </div>

        {project.description && (
          <div className="mt-auto bg-gray-900/40 rounded-lg p-3.5 border border-gray-700/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-xs text-gray-400 leading-relaxed">{project.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectSummary;