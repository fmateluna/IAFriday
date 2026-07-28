import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricsDashboard } from './components/MetricsDashboard';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { TextToSqlAssistant } from './components/TextToSqlAssistant';
import { ExecutiveBusinessReview } from './components/ExecutiveBusinessReview';
import { SimulationState, SimulationParams, TextToSQLResponse } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'whatif' | 'text2sql' | 'ebr'>('dashboard');
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentScenarioName, setCurrentScenarioName] = useState<string>('Baseline Operativo Estándar');

  // Carga inicial de datos desde el backend API REST
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/metrics/dashboard');
      if (res.ok) {
        const data = await res.json();
        setSimState({
          resumen_kpi: data.resumen_kpi,
          curva_wip_horaria: data.curva_wip_horaria,
          tickets_muestra: data.tickets_muestra
        });
      }
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Ejecutar simulación What-If
  const handleRunSimulation = async (params: SimulationParams) => {
    setIsLoading(true);
    setCurrentScenarioName(params.nombre_escenario);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        await fetchDashboardData();
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Error en simulación What-If:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar consulta Text-to-SQL
  const handleSendText2Sql = async (pregunta: string): Promise<TextToSQLResponse | null> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/llm/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error procesando Text-to-SQL:', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased selection:bg-blue-500/30 selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scenarioName={currentScenarioName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && simState && (
          <MetricsDashboard
            kpi={simState.resumen_kpi}
            wipCurve={simState.curva_wip_horaria}
            tickets={simState.tickets_muestra}
            onRefreshSim={fetchDashboardData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'whatif' && simState && (
          <WhatIfSimulator
            baselineKpi={simState.resumen_kpi}
            onRunSimulation={handleRunSimulation}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'text2sql' && (
          <TextToSqlAssistant
            onSendQuery={handleSendText2Sql}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'ebr' && simState && (
          <ExecutiveBusinessReview
            currentKpi={simState.resumen_kpi}
          />
        )}
      </main>
    </div>
  );
}
