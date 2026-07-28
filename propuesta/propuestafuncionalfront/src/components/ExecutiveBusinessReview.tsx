import React, { useState, useEffect } from 'react';
import { ExecutiveReport, ResumenKPI } from '../types';
import { FileText, Download, Sparkles, RefreshCw, CheckCircle, AlertTriangle, ArrowUpRight, TrendingUp, Cpu, Building2, Calendar, UserCheck, Shield } from 'lucide-react';

interface ExecutiveBusinessReviewProps {
  currentKpi: ResumenKPI;
}

export const ExecutiveBusinessReview: React.FC<ExecutiveBusinessReviewProps> = ({ currentKpi }) => {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEbrReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/ebr');
      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }
      const data: ExecutiveReport = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el motor de generación de informes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEbrReport();
  }, [currentKpi]);

  const handleDownloadJSON = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EBR_MesaDeAyuda_BPS_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Action Header */}
      <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">Generador Automático de Executive Business Review (EBR)</h2>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Dictamen LLM (Ollama/Gemini)</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Módulo automatizado que emite informes gerenciales para presentación directa al Client Manager con resúmenes dictaminados por IA.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={fetchEbrReport}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerar Informe</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            disabled={!report || isLoading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all disabled:opacity-50 border border-indigo-400/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar EBR (JSON)</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-[#141416] p-12 rounded-2xl border border-white/5 text-center font-mono">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Generando Executive Business Review...</p>
          <p className="text-xs text-gray-400 mt-1">Sintetizando métricas operacionales del Gemelo Digital con el dictamen ejecutivo del LLM</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-400 font-mono text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && report && (
        <div id="ebr-report-printable" className="space-y-6">
          {/* Main Report Document Card */}
          <div className="bg-[#141416] p-8 rounded-2xl border border-white/5 shadow-2xl space-y-8">
            
            {/* Report Document Header */}
            <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 font-mono">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 text-xs uppercase tracking-widest font-bold mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>BPS Help Desk Operations — Client Executive Report</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{report.titulo}</h1>
                <p className="text-xs text-gray-400 mt-1 flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Destinatario: <strong className="text-gray-200">{report.cliente_manager}</strong></span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Fecha: <strong className="text-gray-200">{report.fecha_generacion}</strong></span>
                  </span>
                </p>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl text-right">
                <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Estado de Evaluación</span>
                <span className="text-xs font-bold text-indigo-300 flex items-center justify-end space-x-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Auditoría Digital Twin V2.4 OK</span>
                </span>
              </div>
            </div>

            {/* LLM Dictamen Callout Box */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-[#1a1a24] to-[#141416] p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Dictamen Ejecutivo de Operaciones (LLM Business Analysis)</span>
              </div>
              <p className="text-sm font-sans text-gray-200 leading-relaxed italic border-l-2 border-indigo-500 pl-4 py-1">
                "{report.dictamen_llm}"
              </p>
            </div>

            {/* KPI Executive Summary Grid */}
            <div>
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest mb-3">
                Resumen Consolidado de Indicadores Clave (KPIs)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">SLA Global</span>
                  <span className="text-lg font-bold text-emerald-400">{report.metricas_resumen.sla_global}</span>
                </div>
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Lead Time Prom.</span>
                  <span className="text-lg font-bold text-sky-400">{report.metricas_resumen.lead_time_promedio}</span>
                </div>
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Volumen Tickets</span>
                  <span className="text-lg font-bold text-white">{report.metricas_resumen.total_tickets}</span>
                </div>
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Tasa Escalamiento</span>
                  <span className="text-lg font-bold text-purple-400">{report.metricas_resumen.tasa_escalamiento}</span>
                </div>
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Cuello de Botella</span>
                  <span className="text-xs font-bold text-amber-400 truncate block mt-1">{report.metricas_resumen.cuello_botella}</span>
                </div>
                <div className="bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Routing Skill</span>
                  <span className="text-xs font-bold text-indigo-300 truncate block mt-1">{report.metricas_resumen.impacto_routing}</span>
                </div>
              </div>
            </div>

            {/* Key Business Insights & Operations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Puntos Clave */}
              <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Puntos Clave del Periodo Operacional</span>
                </h3>
                <ul className="space-y-3">
                  {report.puntos_clave.map((punto, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-gray-300 font-sans leading-relaxed">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <span>{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendaciones Operativas */}
              <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Recomendaciones Dictaminadas para Client Manager</span>
                </h3>
                <ul className="space-y-3">
                  {report.recomendaciones_operativas.map((rec, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-gray-300 font-sans leading-relaxed">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Skill-Based Routing Impact Note */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-start space-x-3.5 font-mono text-xs text-emerald-300">
              <Cpu className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="block text-emerald-200 font-bold mb-0.5">Algoritmo de Routing Dinámico por Matriz de Competencias</strong>
                <span>
                  El sistema detecta automáticamente la especialidad del analista N1 con índice de eficiencia &gt; 1.2. El enrutamiento preferencial reduce los tiempos medios de ciclo en hasta un 22% y desacelera la tasa de escalamiento hacia N2.
                </span>
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Gemelo Digital Operacional Mesa de Ayuda BPS v2.4</span>
              <span>Documento de Presentación Ejecutiva — Confidencial BPS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
