import React, { useState } from 'react';
import { SimulationParams, ResumenKPI } from '../types';
import { Sliders, Play, RotateCcw, ArrowRight, ShieldCheck, Clock, Users, TrendingUp, Cpu, CheckCircle, AlertCircle, Calendar, Building2, BarChart2, Activity, Sparkles, AlertTriangle } from 'lucide-react';

interface WhatIfSimulatorProps {
  baselineKpi: ResumenKPI;
  onRunSimulation: (params: SimulationParams) => void;
  isLoading: boolean;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  baselineKpi,
  onRunSimulation,
  isLoading
}) => {
  const [params, setParams] = useState<SimulationParams>({
    nombre_escenario: 'Escenario Optimizado What-If',
    // 1. Horarios y Días
    hora_inicio_operacion: 8,
    hora_fin_operacion: 18,
    dias_laborales_semana: 5,
    dias_simulados: 1,

    // 2. Recepción
    hora_inicio_recepcion: 8,
    hora_fin_recepcion: 17,

    // 3. Dotación
    dotacion_triage: 3,
    dotacion_n1: 15,
    dotacion_n2: 5,

    // 4. Demanda & Clientes
    lambda_poisson: 3.53,
    pct_cliente_corporativo: 50,
    pct_cliente_pyme: 30,
    pct_cliente_individual: 20,

    // 5. Mix Tickets
    pct_mix_simple: 50.0,
    pct_mix_medio: 25.0,
    pct_mix_complejo: 25.0,

    // 6. Distribución de Tiempos
    distribucion_atencion: 'uniforme',
    cv_distribucion: 0.30,

    // 7. SLAs
    sla_simple_min: 50,
    sla_medio_min: 200,
    sla_complejo_min: 500,

    // 8. Escalamientos
    prob_escalamiento_simple: 0.05,
    prob_escalamiento_medio: 0.15,
    prob_escalamiento_complejo: 0.40,

    // 9. Perfiles Horarios & Indisponibilidad
    perfil_demanda: 'pico_almuerzo',
    factor_indisponibilidad_almuerzo: 1.25,
    hora_inicio_almuerzo: 12,
    hora_fin_almuerzo: 14,

    // 10. Semilla & Skill Routing
    semilla_aleatoria: 42,
    routing_habilidades_activado: true
  });

  const [activePreset, setActivePreset] = useState<string>('custom');

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey === 'baseline') {
      setParams({
        nombre_escenario: 'Baseline Operativo Estándar',
        hora_inicio_operacion: 8,
        hora_fin_operacion: 18,
        dias_laborales_semana: 5,
        dias_simulados: 1,
        hora_inicio_recepcion: 8,
        hora_fin_recepcion: 17,
        dotacion_triage: 3,
        dotacion_n1: 15,
        dotacion_n2: 5,
        lambda_poisson: 3.53,
        pct_cliente_corporativo: 50,
        pct_cliente_pyme: 30,
        pct_cliente_individual: 20,
        pct_mix_simple: 50,
        pct_mix_medio: 25,
        pct_mix_complejo: 25,
        distribucion_atencion: 'uniforme',
        cv_distribucion: 0.30,
        sla_simple_min: 50,
        sla_medio_min: 200,
        sla_complejo_min: 500,
        prob_escalamiento_simple: 0.05,
        prob_escalamiento_medio: 0.15,
        prob_escalamiento_complejo: 0.40,
        perfil_demanda: 'pico_almuerzo',
        factor_indisponibilidad_almuerzo: 1.25,
        hora_inicio_almuerzo: 12,
        hora_fin_almuerzo: 14,
        semilla_aleatoria: 42,
        routing_habilidades_activado: false
      });
    } else if (presetKey === 'skill_routing') {
      setParams({
        ...params,
        nombre_escenario: 'Routing Dinámico por Competencias',
        routing_habilidades_activado: true
      });
    } else if (presetKey === 'multi_day') {
      setParams({
        ...params,
        nombre_escenario: 'Simulación Mensual (20 Días Laborales)',
        dias_simulados: 20,
        dias_laborales_semana: 5
      });
    } else if (presetKey === 'high_demand') {
      setParams({
        ...params,
        nombre_escenario: 'Pico de Demanda (+50% Tickets)',
        lambda_poisson: 5.30,
        perfil_demanda: 'pico_manana'
      });
    } else if (presetKey === 'gamma_dist') {
      setParams({
        ...params,
        nombre_escenario: 'Distribución Gamma de Tiempos',
        distribucion_atencion: 'gamma',
        cv_distribucion: 0.45
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation(params);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Intro Header */}
      <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Simulador Avanzado de Escenarios Operacionales (What-If)</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Configura los 14 grupos de parámetros del Gemelo Digital Operacional: horarios, días, distribuciones de tiempo, indisponibilidad, SLAs, mix de clientes y routing por competencias.
            </p>
          </div>
        </div>

        {/* Preset Badges */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-mono">
          <span className="text-gray-400 font-medium py-1">Escenarios Predeterminados:</span>
          <button
            type="button"
            onClick={() => applyPreset('baseline')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activePreset === 'baseline'
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Baseline Estándar
          </button>
          <button
            type="button"
            onClick={() => applyPreset('skill_routing')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activePreset === 'skill_routing'
                ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Skill-based Routing
          </button>
          <button
            type="button"
            onClick={() => applyPreset('multi_day')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activePreset === 'multi_day'
                ? 'bg-purple-600 text-white font-semibold shadow-lg shadow-purple-600/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Simulación 1 Mes (20 Días)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('high_demand')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activePreset === 'high_demand'
                ? 'bg-amber-600 text-white font-semibold shadow-lg shadow-amber-600/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Pico Demanda (+50%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('gamma_dist')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activePreset === 'gamma_dist'
                ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Distribución Gamma
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1. HORARIOS & DÍAS DE OPERACIÓN */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>1. Horario de Operación & Días</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Inicio Operación</label>
                <select
                  value={params.hora_inicio_operacion}
                  onChange={e => setParams({ ...params, hora_inicio_operacion: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={7}>07:00 hrs</option>
                  <option value={8}>08:00 hrs</option>
                  <option value={9}>09:00 hrs</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Fin Operación</label>
                <select
                  value={params.hora_fin_operacion}
                  onChange={e => setParams({ ...params, hora_fin_operacion: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={17}>17:00 hrs</option>
                  <option value={18}>18:00 hrs</option>
                  <option value={19}>19:00 hrs</option>
                  <option value={20}>20:00 hrs</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Inicio Recepción</label>
                <select
                  value={params.hora_inicio_recepcion}
                  onChange={e => setParams({ ...params, hora_inicio_recepcion: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={7}>07:00 hrs</option>
                  <option value={8}>08:00 hrs</option>
                  <option value={9}>09:00 hrs</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Fin Recepción</label>
                <select
                  value={params.hora_fin_recepcion}
                  onChange={e => setParams({ ...params, hora_fin_recepcion: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={16}>16:00 hrs</option>
                  <option value={17}>17:00 hrs</option>
                  <option value={18}>18:00 hrs</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Días Laborales / Sem</label>
                <select
                  value={params.dias_laborales_semana}
                  onChange={e => setParams({ ...params, dias_laborales_semana: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={5}>5 Días (Lun - Vie)</option>
                  <option value={6}>6 Días (Lun - Sáb)</option>
                  <option value={7}>7 Días (Continuo)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Días Simulados</label>
                <select
                  value={params.dias_simulados}
                  onChange={e => setParams({ ...params, dias_simulados: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value={1}>1 Día (Jornada)</option>
                  <option value={5}>5 Días (1 Semana)</option>
                  <option value={20}>20 Días (1 Mes)</option>
                  <option value={60}>60 Días (1 Trimestre)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. DOTACIÓN POR EQUIPO & SKILL ROUTING */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>2. Dotación por Equipo & Routing</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Triage / Recepción</span>
                <span className="font-bold text-white">{params.dotacion_triage} analistas</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={params.dotacion_triage}
                onChange={e => setParams({ ...params, dotacion_triage: parseInt(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Documental Nivel 1</span>
                <span className="font-bold text-white">{params.dotacion_n1} analistas</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={params.dotacion_n1}
                onChange={e => setParams({ ...params, dotacion_n1: parseInt(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Experto Nivel 2</span>
                <span className="font-bold text-white">{params.dotacion_n2} expertos</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={params.dotacion_n2}
                onChange={e => setParams({ ...params, dotacion_n2: parseInt(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div className="bg-[#1a1a1e] p-3 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-white block">Routing por Competencias</span>
                <span className="text-[10px] text-gray-400 font-mono block">Prioriza analistas N1 eficientes (-22% cycle time)</span>
              </div>
              <input
                type="checkbox"
                checked={params.routing_habilidades_activado ?? false}
                onChange={e => setParams({ ...params, routing_habilidades_activado: e.target.checked })}
                className="w-4 h-4 rounded text-sky-500 bg-black/40 cursor-pointer"
              />
            </div>
          </div>

          {/* 3. DEMANDA & MIX DE CLIENTES */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>3. Demanda & Mix de Clientes</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Tasa Poisson λ (llegadas/hora)</span>
                <span className="font-bold text-white">{params.lambda_poisson} tck/h</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.1"
                value={params.lambda_poisson}
                onChange={e => setParams({ ...params, lambda_poisson: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-gray-400 block font-bold">Distribución Mix de Clientes</span>
              
              <div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-gray-300">Corporativo</span>
                  <span className="text-amber-300 font-bold">{params.pct_cliente_corporativo}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={params.pct_cliente_corporativo}
                  onChange={e => {
                    const corp = parseInt(e.target.value);
                    const rem = 100 - corp;
                    setParams({
                      ...params,
                      pct_cliente_corporativo: corp,
                      pct_cliente_pyme: Math.round(rem * 0.6),
                      pct_cliente_individual: Math.round(rem * 0.4)
                    });
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
                <span>PyME: <strong className="text-gray-200">{params.pct_cliente_pyme}%</strong></span>
                <span>Individual: <strong className="text-gray-200">{params.pct_cliente_individual}%</strong></span>
              </div>
            </div>
          </div>

          {/* 4. MIX DE TICKETS & SLAS */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Mix de Tickets & SLAs</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">% Mix Ticket Simple</span>
                <span className="font-bold text-purple-300">{params.pct_mix_simple}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={params.pct_mix_simple}
                onChange={e => {
                  const simp = parseFloat(e.target.value);
                  const rem = 100 - simp;
                  setParams({
                    ...params,
                    pct_mix_simple: simp,
                    pct_mix_medio: Math.round(rem * 0.5),
                    pct_mix_complejo: Math.round(rem * 0.5)
                  });
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1">SLA Simple</label>
                <input
                  type="number"
                  value={params.sla_simple_min}
                  onChange={e => setParams({ ...params, sla_simple_min: parseInt(e.target.value) || 30 })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-mono text-center"
                />
                <span className="text-[9px] font-mono text-gray-500 block text-center mt-0.5">min</span>
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1">SLA Medio</label>
                <input
                  type="number"
                  value={params.sla_medio_min}
                  onChange={e => setParams({ ...params, sla_medio_min: parseInt(e.target.value) || 120 })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-mono text-center"
                />
                <span className="text-[9px] font-mono text-gray-500 block text-center mt-0.5">min</span>
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1">SLA Complejo</label>
                <input
                  type="number"
                  value={params.sla_complejo_min}
                  onChange={e => setParams({ ...params, sla_complejo_min: parseInt(e.target.value) || 400 })}
                  className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-mono text-center"
                />
                <span className="text-[9px] font-mono text-gray-500 block text-center mt-0.5">min</span>
              </div>
            </div>
          </div>

          {/* 5. DISTRIBUCIÓN ESTADÍSTICA & ESCALAMIENTOS */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>5. Distribución Estadística</span>
            </h3>

            <div>
              <label className="text-[11px] font-mono text-gray-400 block mb-1">Distribución de Tiempos</label>
              <select
                value={params.distribucion_atencion}
                onChange={e => setParams({ ...params, distribucion_atencion: e.target.value as any })}
                className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              >
                <option value="uniforme">Uniforme (Rango ±CV)</option>
                <option value="normal">Normal (Gaussiana Box-Muller)</option>
                <option value="gamma">Gamma (Marsaglia & Tsang)</option>
                <option value="exponencial">Exponencial (Markoviana)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Coeficiente Variación (CV)</span>
                <span className="font-bold text-emerald-300">{params.cv_distribucion}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={params.cv_distribucion}
                onChange={e => setParams({ ...params, cv_distribucion: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-mono text-gray-400 block mb-1">Probabilidad Escalamiento N2</span>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="bg-[#1a1a1e] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block">Simple</span>
                  <span className="font-bold text-white">{Math.round(params.prob_escalamiento_simple * 100)}%</span>
                </div>
                <div className="bg-[#1a1a1e] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block">Medio</span>
                  <span className="font-bold text-white">{Math.round(params.prob_escalamiento_medio * 100)}%</span>
                </div>
                <div className="bg-[#1a1a1e] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block">Complejo</span>
                  <span className="font-bold text-white">{Math.round(params.prob_escalamiento_complejo * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. PERFIL DEMANDA & INDISPONIBILIDAD */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center space-x-2">
              <BarChart2 className="w-4 h-4" />
              <span>6. Demanda & Indisponibilidad</span>
            </h3>

            <div>
              <label className="text-[11px] font-mono text-gray-400 block mb-1">Perfil Horario de Demanda</label>
              <select
                value={params.perfil_demanda}
                onChange={e => setParams({ ...params, perfil_demanda: e.target.value as any })}
                className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              >
                <option value="pico_almuerzo">Pico Mediodía (11:00 - 13:00)</option>
                <option value="pico_manana">Pico Mañana (08:00 - 11:00)</option>
                <option value="pico_tarde">Pico Tarde (14:00 - 17:00)</option>
                <option value="uniforme_plano">Uniforme Plano (Sin Picos)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Factor Indisponibilidad Almuerzo</span>
                <span className="font-bold text-indigo-300">{params.factor_indisponibilidad_almuerzo}x</span>
              </div>
              <input
                type="range"
                min="1.00"
                max="2.00"
                step="0.05"
                value={params.factor_indisponibilidad_almuerzo}
                onChange={e => setParams({ ...params, factor_indisponibilidad_almuerzo: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 pt-1">
              <span>Ventana Almuerzo:</span>
              <span className="text-indigo-300 font-bold text-right">{params.hora_inicio_almuerzo}:00 a {params.hora_fin_almuerzo}:00 hrs</span>
            </div>
          </div>

        </div>

        {/* BOTTOM CONFIG: ESCENARIO, SEMILLA & SUBMIT */}
        <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto flex-1">
            <div>
              <label className="text-[11px] font-mono text-gray-400 block mb-1">Nombre del Escenario</label>
              <input
                type="text"
                value={params.nombre_escenario}
                onChange={e => setParams({ ...params, nombre_escenario: e.target.value })}
                className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-gray-400 block mb-1">Semilla Aleatoria Monte Carlo</label>
              <input
                type="number"
                value={params.semilla_aleatoria}
                onChange={e => setParams({ ...params, semilla_aleatoria: parseInt(e.target.value) || 42 })}
                className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 border border-blue-400/30 flex-shrink-0"
          >
            <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Simulando Escenario...' : 'Ejecutar Simulación'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
