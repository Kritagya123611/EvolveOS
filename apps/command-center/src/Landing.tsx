import { Terminal, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('docker compose up -d');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center">
      
      {/* The Ambient Red Glow Effect */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-1 w-full max-w-4xl px-6 pt-32 pb-16 flex flex-col items-center text-center z-10">
        
        {/* Release Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-wide mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          AXIOM OS v1.0 IS LIVE
        </div>

        {/* Hero Typography */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tracking-tight mb-6">
          AXIOM <span className="text-red-500">OS</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mb-12 tracking-wide">
          The sovereign AI operating system. 
          Spawn autonomous agents, isolate them in secure Docker sandboxes, and watch them build your infrastructure.
        </p>

        {/* The OpenClaw-Style Terminal Quick Start */}
        <div className="w-full max-w-2xl text-left mb-24">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-4">
            <span className="text-red-500">›</span> Quick Start
          </h3>
          
          <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl shadow-red-900/10">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#121214]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <Terminal className="w-3 h-3" /> bash
              </div>
            </div>
            
            {/* Terminal Body */}
            <div className="p-6 flex items-center justify-between group">
              <div className="font-mono text-sm text-zinc-300">
                <span className="text-red-500 mr-2">$</span>
                docker compose up -d
              </div>
              <button 
                onClick={handleCopy}
                className="text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-800/50 p-2 rounded-md opacity-0 group-hover:opacity-100"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center font-mono">
            Requires Docker and Node.js 20+. Safely isolated from your host OS.
          </p>
        </div>

      </main>
    </div>
  );
}