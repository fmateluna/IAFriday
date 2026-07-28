import React from 'react';
import { Cpu, Database, Bot, Activity, Sliders, MessageSquare, Code, Layers, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'whatif' | 'text2sql' | 'ebr';
  setActiveTab: (tab: 'dashboard' | 'whatif' | 'text2sql' | 'ebr') => void;
  scenarioName: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, scenarioName }) => {
  return (
    <header className="bg-[#0a0a0b]/90 backdrop-blur-md border-b border-white/10 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          {/* Brand & Digital Twin Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 text-white border border-blue-400/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  DT-OPS / DIGITAL TWIN
                </h1>
                <span className="bg-white/5 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono tracking-wider">
                  Mesa de Ayuda BPS
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                BPS SERVICE DESK ARCHITECTURE & SIMULATION ENGINE
              </p>
            </div>
          </div>

          {/* Infrastructure Health Status Indicators */}
          <div className="flex items-center space-x-3 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] font-mono tracking-wider">
            <div className="flex items-center space-x-1.5" title="Motor de Simulación en tiempo real">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5"></span>
              <Activity className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-200">ENGINE: ACTIVE</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10"></div>
            <div className="flex items-center space-x-1.5" title="PostgreSQL Schema en Docker">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-200">POSTGRES: READY</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10"></div>
            <div className="flex items-center space-x-1.5" title="Ollama Llama3 / Mistral LLM Service">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-gray-200">OLLAMA: LLAMA3-8B</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30 font-semibold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="uppercase tracking-wider">Dashboard Operacional</span>
          </button>

          <button
            onClick={() => setActiveTab('whatif')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'whatif'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30 font-semibold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="uppercase tracking-wider">Simulador What-If</span>
          </button>

          <button
            onClick={() => setActiveTab('text2sql')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'text2sql'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30 font-semibold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="uppercase tracking-wider">Asistente Text-to-SQL</span>
            <span className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-mono border border-purple-500/30">
              OLLAMA IA
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ebr')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'ebr'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30 font-semibold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="uppercase tracking-wider">Reporte EBR Client Manager</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded font-mono border border-indigo-500/30">
              LLM REPORT
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
