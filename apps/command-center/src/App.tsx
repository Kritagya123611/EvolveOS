import { useState } from 'react';
import { Terminal, Play, Folder, Activity, CheckCircle, Clock, Send } from 'lucide-react';

function App() {
  const [intent, setIntent] = useState('');

  return (
    <div className="h-screen w-screen flex bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      
      {/* LEFT PANEL: Workspace Explorer */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Activity className="text-emerald-500 w-5 h-5" />
          <h1 className="font-bold text-zinc-100 tracking-wider">AXIOM OS</h1>
        </div>
        <div className="p-4 flex-1">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Folder className="w-4 h-4" /> Sandbox
          </h2>
          <ul className="text-sm space-y-2 text-zinc-400">
            <li className="hover:text-zinc-200 cursor-pointer">hazmat.js</li>
            <li className="hover:text-zinc-200 cursor-pointer">math.txt</li>
          </ul>
        </div>
      </div>

      {/* CENTER PANEL: Task Engine & Input */}
      <div className="flex-1 flex flex-col relative">
        {/* Active Task Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6">Task Queue</h2>
          
          {/* Mock Task Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded font-mono border border-blue-500/20">
                ID: a7b9-4f21
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
                <Play className="w-3 h-3" /> ACTIVE
              </span>
            </div>
            <p className="text-sm text-zinc-300 mb-4">
              "Create a file called hazmat.js. Inside it, write a console.log that says Hello from the Glass Box!"
            </p>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Lead: Architect Agent</span>
              <span className="animate-pulse text-blue-400">Executing tools...</span>
            </div>
          </div>

          {/* Mock Completed Task Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 opacity-75">
            <div className="flex justify-between items-start mb-2">
              <span className="text-zinc-500 text-xs font-mono">ID: 9c21-88fa</span>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <CheckCircle className="w-3 h-3" /> COMPLETED
              </span>
            </div>
            <p className="text-sm text-zinc-400 line-through">
              "Calculate the 10th Fibonacci number."
            </p>
          </div>
        </div>

        {/* The Human Input Bar */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950">
          <div className="relative">
            <textarea 
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Give AXIOM a task..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pr-12 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-none h-24"
            />
            <button className="absolute bottom-4 right-4 bg-zinc-100 text-zinc-900 p-2 rounded-lg hover:bg-zinc-300 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Terminal */}
      <div className="w-96 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col font-mono text-xs">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-500">
          <Terminal className="w-4 h-4" />
          <span>SYSTEM_LOGS</span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2 text-zinc-400">
          <div className="text-zinc-500">System booted.</div>
          <div className="text-emerald-500/80">[DISPATCHER] Auction started for task a7b9-4f21</div>
          <div className="text-blue-400/80">[LLM] Architect Agent bid 95/100</div>
          <div className="text-amber-400/80">[SYSCALL] Executing: writeLocalFile</div>
          <div className="text-zinc-300">&gt; Waiting for next event...</div>
        </div>
      </div>

    </div>
  );
}

export default App;