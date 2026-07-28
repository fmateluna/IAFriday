import React, { useState } from 'react';
import { ResumenKPI, CurvaWIPHoraria, TicketDetalle } from '../types';
import {
  TrendingUp, Clock, AlertTriangle, Users, ShieldCheck, ArrowUpRight,
  Filter, CheckCircle2, XCircle, AlertCircle, Play, Pause, RefreshCw, BarChart2,
  Layers, Zap, Activity, Cpu, Briefcase, Award, CheckSquare
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

interface MetricsDashboardProps {
  kpi: ResumenKPI;
  wipCurve: CurvaWIPHoraria[];
  tickets: TicketDetalle[];
  onRefreshSim: () => void;
  isLoading: boolean;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  kpi,
  wipCurve,
  tickets,
  onRefreshSim,
  isLoading
}) => {
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterEstado, setFilterEstado] = useState<string>('Todos');

  const filteredTickets = tickets.filter(t => {
    if (filterTipo !== 'Todos' && t.tipo_ticket !== filterTipo) return false;
    if (filterEstado !== 'Todos' && t.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2.5">
            <span>Panel de Control Operacional & Gemelo Digital</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1 rounded-full border border-emerald-500/20 font-mono tracking-wider">
              {kpi.dias_simulados ?? 1} DÍA(S) SIMULADO(S)
            </span>
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Distribución Tiempos: <b className="text-gray-200 uppercase">{kpi.distribucion_atencion_usada ?? 'uniforme'}</b> • Skill Routing: <b className="text-emerald-400">{kpi.routing_habilidades_activado ? 'ACTIVADO (-22% Cycle Time)' : 'INACTIVO'}</b>
          </p>
        </div>

        <button
          onClick={onRefreshSim}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 border border-blue-400/30 font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'SIMULANDO...' : 'RE-EJECUTAR SIMULACIÓN'}</span>
        </button>
      </div>

      {/* SECCIÓN 1: FLUJO Y PRODUCTIVIDAD */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            1. Indicadores de Flujo & Productividad
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tickets Creados, Resueltos & Throughput */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Tickets & Throughput</span>
            <div className="mt-3">
              <div className="text-2xl font-light text-white font-mono">
                {kpi.total_tickets_ingresados} <span className="text-xs text-gray-400">creados</span>
              </div>
              <div className="text-xs font-mono text-emerald-400 mt-1 font-semibold">
                {kpi.total_tickets_resueltos} resueltos
              </div>
              <div className="mt-3 text-[11px] font-mono text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 flex justify-between">
                <span>Throughput:</span>
                <span className="font-bold">{kpi.throughput_tickets_hora} tck/hora</span>
              </div>
            </div>
          </div>

          {/* WIP Promedio & Backlog Final */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">WIP & Backlog</span>
            <div className="mt-3">
              <div className="text-2xl font-light text-white font-mono">
                {kpi.wip_promedio} <span className="text-xs text-gray-400">tck WIP prom.</span>
              </div>
              <div className="text-xs font-mono text-amber-400 mt-1">
                Backlog Final: <b className="text-white">{kpi.backlog_final} tck</b>
              </div>
              <div className="mt-3 text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 flex justify-between">
                <span>Longitud Cola Prom:</span>
                <span className="font-bold text-sky-400">{kpi.longitud_promedio_cola} tck</span>
              </div>
            </div>
          </div>

          {/* Lead Time & Cycle Time */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Tiempos de Flujo</span>
            <div className="mt-3">
              <div className="text-2xl font-light text-white font-mono">
                {kpi.lead_time_promedio_min} <span className="text-xs text-gray-400">m Lead Time</span>
              </div>
              <div className="text-xs font-mono text-gray-300 mt-1">
                Atención (Cycle): <b className="text-white">{kpi.cycle_time_promedio_min} min</b>
              </div>
              <div className="mt-3 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex justify-between">
                <span>Tiempo Espera Cola:</span>
                <span className="font-bold">{kpi.tiempo_espera_promedio_min} min</span>
              </div>
            </div>
          </div>

          {/* Escalamiento & Utilización Equipos */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Escalamiento & Utilización</span>
            <div className="mt-3">
              <div className="text-2xl font-light text-purple-300 font-mono">
                {kpi.tasa_escalamiento_pct}% <span className="text-xs text-gray-400">a N2</span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 mt-1 space-y-0.5">
                <div className="flex justify-between"><span>Triage: {kpi.utilizacion_triage_pct}%</span><span>N1: {kpi.utilizacion_n1_pct}%</span></div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 flex justify-between">
                <span>Ocupación N2:</span>
                <span className="font-bold">{kpi.utilizacion_n2_pct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CALIDAD */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            2. Indicadores de Calidad & SLA
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SLA Global */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Cumplimiento SLA Global</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-emerald-400 font-mono">
                {kpi.tasa_cumplimiento_sla_global_pct}%
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Meta Corporativa: <b>80%</b>
              </div>
            </div>
          </div>

          {/* Resolución Mismo Día */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Resolución Mismo Día</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-sky-400 font-mono">
                {kpi.resolucion_mismo_dia_pct}%
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Resueltos en la jornada activa
              </div>
            </div>
          </div>

          {/* Resolución 1 Día Hábil */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Resolución 1 Día Hábil</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-indigo-400 font-mono">
                {kpi.resolucion_un_dia_habil_pct}%
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Resueltos en &lt;= 24h hábiles
              </div>
            </div>
          </div>

          {/* Tiempos por Tipo de Ticket */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Tiempo Prom. por Tipo</span>
            <div className="mt-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-emerald-400 font-semibold">Simple:</span>
                <span className="text-white font-bold">{kpi.tiempo_promedio_simple_min} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sky-400 font-semibold">Medio:</span>
                <span className="text-white font-bold">{kpi.tiempo_promedio_medio_min} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400 font-semibold">Complejo:</span>
                <span className="text-white font-bold">{kpi.tiempo_promedio_complejo_min} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CAPACIDAD */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Briefcase className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            3. Capacidad de Recursos & Saturación
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Horas Hombre Disponibles */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">HH Disponibles (Capacidad)</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-white font-mono">
                {kpi.horas_hombre_disponibles} <span className="text-xs text-gray-400">HH</span>
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Capacidad instalada del periodo
              </div>
            </div>
          </div>

          {/* Horas Hombre Utilizadas */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">HH Utilizadas (Operación)</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-sky-400 font-mono">
                {kpi.horas_hombre_utilizadas} <span className="text-xs text-gray-400">HH</span>
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Horas efectivas en tickets
              </div>
            </div>
          </div>

          {/* Saturación de Recursos */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest font-mono">Saturación de Recursos Global</span>
            <div className="mt-3">
              <div className="text-3xl font-light text-amber-400 font-mono">
                {kpi.saturacion_recursos_pct}%
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Carga general de operación
              </div>
            </div>
          </div>

          {/* Recurso Crítico / Bottleneck */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-rose-500/20 shadow-lg flex flex-col justify-between bg-rose-950/10">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-widest font-mono flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Recurso Crítico</span>
            </span>
            <div className="mt-3">
              <div className="text-lg font-bold text-rose-300 font-mono truncate">
                {kpi.recurso_critico}
              </div>
              <div className="text-xs font-mono text-gray-400 mt-2">
                Etapa con mayor uso/cola
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Curva WIP */}
        <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4" />
                <span>Curva WIP y Arribos Promedio Diurnos</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Tickets activos por hora de operación</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wipCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorArribos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262a" />
                <XAxis dataKey="hora" stroke="#6b7280" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#6b7280" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141416', borderColor: '#26262a', color: '#fff', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="wip_tickets" name="Tickets Activos WIP" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWip)" />
                <Area type="monotone" dataKey="arribos" name="Nuevos Arribos (Poisson)" stroke="#10b981" fillOpacity={1} fill="url(#colorArribos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: SLA por Tipo */}
        <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Cumplimiento SLA por Tipo de Ticket</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Simple • Medio • Complejo vs Meta 80%</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { tipo: 'Simple', cumplimiento: kpi.tasa_cumplimiento_sla_simple_pct, goal: 80 },
                  { tipo: 'Medio', cumplimiento: kpi.tasa_cumplimiento_sla_medio_pct, goal: 80 },
                  { tipo: 'Complejo', cumplimiento: kpi.tasa_cumplimiento_sla_complejo_pct, goal: 80 }
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#26262a" />
                <XAxis dataKey="tipo" stroke="#6b7280" fontSize={10} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={10} fontFamily="monospace" unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141416', borderColor: '#26262a', color: '#fff', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Meta 80%', fill: '#ef4444', fontSize: 10, fontFamily: 'monospace' }} />
                <Bar dataKey="cumplimiento" name="% SLA Cumplido" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETAILED TICKETS TABLE */}
      <div className="bg-[#141416] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">Muestra de Tickets Simulados</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Eventos de atenciones individuales con cálculo de Lead Time y SLA</p>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <div className="flex items-center space-x-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Tipo:</span>
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#141416] text-white">Todos</option>
                <option value="Simple" className="bg-[#141416] text-white">Simple</option>
                <option value="Medio" className="bg-[#141416] text-white">Medio</option>
                <option value="Complejo" className="bg-[#141416] text-white">Complejo</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-gray-400">Estado:</span>
              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#141416] text-white">Todos</option>
                <option value="Resuelto" className="bg-[#141416] text-white">Resuelto</option>
                <option value="En Proceso" className="bg-[#141416] text-white">En Proceso</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/5 text-gray-400 border-b border-white/5 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Hora Ingreso</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4">Cycle Time</th>
                <th className="py-3 px-4">Escalado N2</th>
                <th className="py-3 px-4">SLA (Límite)</th>
                <th className="py-3 px-4">Estado SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredTickets.slice(0, 15).map(ticket => (
                <tr key={ticket.ticket_id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono text-blue-400 font-medium">
                    {ticket.ticket_id}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-200">{ticket.cliente}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      ticket.tipo_ticket === 'Simple'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : ticket.tipo_ticket === 'Medio'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {ticket.tipo_ticket}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {new Date(ticket.timestamp_ingreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{ticket.lead_time_min} min</td>
                  <td className="py-3 px-4 text-gray-400">{ticket.cycle_time_min} min</td>
                  <td className="py-3 px-4">
                    {ticket.escalado ? (
                      <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full text-[10px] border border-rose-500/20 font-semibold">
                        SÍ (N2)
                      </span>
                    ) : (
                      <span className="text-gray-500">NO</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400">{ticket.sla_limite_min} min</td>
                  <td className="py-3 px-4">
                    {ticket.cumplimiento_sla ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SLA OK</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-rose-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>INCUMPLIDO</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
