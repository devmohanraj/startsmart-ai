const STEPS = [
  {
    step: 1,
    title: "Submit your idea",
    desc: "Tell us about your startup — industry, business model, target market, and budget.",
  },
  {
    step: 2,
    title: "AI analyzes market & competitors",
    desc: "Our AI scans your industry, sizes the market (TAM/SAM/SOM), and maps the competitive landscape.",
  },
  {
    step: 3,
    title: "Get your risk score",
    desc: "Receive a detailed risk assessment with success probability, failure risk factors, and market fit evaluation.",
  },
  {
    step: 4,
    title: "Receive tailored recommendations",
    desc: "Actionable insights and strategies to improve your project's chances of success.",
  },
];

const HIGHLIGHTS = [
  { label: "AI-Powered Analysis", desc: "Gemini-driven market & risk evaluation" },
  { label: "Real-time Market Data", desc: "Current TAM/SAM/SOM estimates" },
  { label: "Actionable Insights", desc: "Tailored recommendations to reduce risk" },
];

function AboutPanel() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-sm font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-Powered Risk Analysis Platform
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
          The smartest step<br />
          <span className="text-indigo-400">before your first step</span>
        </h1>
        <p className="text-base text-gray-300 leading-relaxed">
          StartSmart AI analyzes your startup or project idea and predicts failure risk,
          success probability, market fit, and gives strategic recommendations — powered by
          advanced AI models and real-time market data.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
          How it works
        </h3>
        <div className="space-y-5">
          {STEPS.map((item, i) => (
            <div key={item.step} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-sm group-hover:shadow-md transition-shadow">
                  {item.step}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-linear-to-b from-indigo-500/30 to-transparent mt-1.5" />
                )}
              </div>
              <div className="pb-1">
                <p className="text-base font-semibold text-white">{item.title}</p>
                <p className="text-sm text-gray-300 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.label}
            className="group bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-indigo-500/30 hover:bg-gray-800 hover:shadow-sm transition-all duration-300"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:bg-indigo-500/30 transition-colors">
              <div className="w-3 h-3 rounded-full bg-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AboutPanel;