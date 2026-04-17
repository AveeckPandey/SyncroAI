export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Background gradients / Glassmorphism */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto p-8 md:p-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-10 shadow-lg shadow-blue-500/5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          Next.js API Online
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
          SyncroAI
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 leading-relaxed font-light">
          The intelligent backend powering your LinkedIn algorithm.
          Bridging the gap between your real-world achievements and online visibility.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <a
            href="https://github.com/aveeckpandey" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-semibold transition-all transform hover:scale-105 hover:-translate-y-1 shadow-[0_0_40px_rgba(59,130,246,0.3)] shadow-blue-500/30"
          >
            Download Extension
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          <div className="flex items-center justify-center px-8 py-4 bg-slate-800/80 border border-slate-700/50 text-slate-300 rounded-2xl font-mono text-sm cursor-default hover:bg-slate-700/80 transition-colors shadow-lg">
            <span className="text-purple-400 mr-2">POST</span> /api/analyze
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-md border border-slate-700/50 hover:border-blue-500/50 transition-colors shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-3">Resume AI</h3>
            <p className="text-slate-400 leading-relaxed">Extracts key technical skills and matrix data from your uploaded PDF completely locally.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-md border border-slate-700/50 hover:border-indigo-500/50 transition-colors shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">💼</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-3">Profile Scraper</h3>
            <p className="text-slate-400 leading-relaxed">Reads your active LinkedIn profile directly from the page context without requiring passwords.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-md border border-slate-700/50 hover:border-purple-500/50 transition-colors shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-3">Gemini Agents</h3>
            <p className="text-slate-400 leading-relaxed">Multi-agent AI analysis compares your inputs to suggest high-impact optimization tweaks.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
