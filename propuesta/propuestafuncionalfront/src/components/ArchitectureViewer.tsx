import React, { useState } from 'react';
import { Code, Database, Server, Layers, FileText, Check, Copy } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'schema' | 'compose' | 'simulation' | 'text2sql' | 'fastapi'>('schema');
  const [copied, setCopied] = useState<boolean>(false);

  const snippets = {
    schema: `-- SECCIÓN A: Esquema PostgreSQL (schema.sql)
CREATE TABLE tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    simulacion_id INT,
    cliente VARCHAR(100) NOT NULL,
    tipo_ticket VARCHAR(20) CHECK (tipo_ticket IN ('Simple', 'Medio', 'Complejo')),
    estado VARCHAR(30),
    timestamp_ingreso TIMESTAMP NOT NULL,
    timestamp_triage_fin TIMESTAMP,
    timestamp_n1_fin TIMESTAMP,
    timestamp_n2_fin TIMESTAMP,
    timestamp_resolucion TIMESTAMP,
    escalado BOOLEAN DEFAULT FALSE,
    sla_limite_min INT NOT NULL,
    lead_time_min NUMERIC(10,2),
    cycle_time_min NUMERIC(10,2),
    cumplimiento_sla BOOLEAN DEFAULT TRUE
);

CREATE TABLE analistas (
    analista_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    rol_id INT REFERENCES roles(rol_id),
    estado VARCHAR(30) DEFAULT 'Disponible'
);

CREATE TABLE metricas_resumen_diario (
    resumen_id SERIAL PRIMARY KEY,
    fecha_operacion DATE NOT NULL,
    total_tickets_ingresados INT,
    total_tickets_resueltos INT,
    tasa_cumplimiento_sla_global_pct NUMERIC(5,2),
    utilizacion_n1_pct NUMERIC(5,2),
    cuello_botella_principal VARCHAR(100)
);`,

    compose: `# SECCIÓN D: Orquestación e Infraestructura (docker-compose.yml)
version: '3.8'

services:
  postgres_db:
    image: postgres:15-alpine
    container_name: digital_twin_postgres
    environment:
      POSTGRES_DB: helpdesk_db
      POSTGRES_USER: bps_admin
      POSTGRES_PASSWORD: bps_secure_password_2026
    ports:
      - "5432:5432"
    volumes:
      - ./schema.sql:/docker-entrypoint-initdb.d/01_schema.sql

  ollama_service:
    image: ollama/ollama:latest
    container_name: digital_twin_ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_storage:/root/.ollama
    entrypoint: ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama pull llama3 && tail -f /dev/null"]

  python_backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://bps_admin:bps_secure_password_2026@postgres_db:5432/helpdesk_db
      OLLAMA_URL: http://ollama_service:11434/api/generate
    depends_on:
      - postgres_db
      - ollama_service`,

    simulation: `# SECCIÓN B: Motor de Simulación de Eventos Discretos (backend/simulation.py)
import random
from datetime import datetime, timedelta

class DiscreteEventSimulator:
    def __init__(self, config=None):
        self.lambda_avg = float(config.get("lambda_poisson", 3.53))
        self.n_triage = int(config.get("dotacion_triage", 3))
        self.n_n1 = int(config.get("dotacion_n1", 15))
        self.n_n2 = int(config.get("dotacion_n2", 5))

    def run_simulation(self):
        # Arribos de Poisson no homogéneos (09:00 - 18:00)
        # Etapa 1: Triage (5-20 min uniformes)
        # Etapa 2: N1 (Simple 20-60m, Medio 60-240m, Complejo 300-600m)
        # Etapa 3: Escalamiento N2 (5%, 10%, 40%)
        # Cálculo de Lead Time, Cycle Time y cumplimiento SLA
        pass`,

    text2sql: `# SECCIÓN B: Agente Text-to-SQL con Ollama (backend/text_to_sql.py)
import requests, re

class TextToSQLAgent:
    def process_question(self, question: str, simulation_data=None):
        prompt = f"""Escribirás solo una consulta PostgreSQL basada en:
        {POSTGRES_SCHEMA_DDL}
        Pregunta: "{question}" """
        
        response = requests.post("http://ollama_service:11434/api/generate", json={"model":"llama3", "prompt":prompt})
        sql = self.clean_sql(response.json()["response"])
        return {"sql_query": sql, "data": executed_results}`,

    fastapi: `# SECCIÓN B: Endpoints REST FastAPI (backend/app.py)
from fastapi import FastAPI
app = FastAPI()

@app.post("/api/simulate")
async def run_simulation(req: SimulationRequest):
    return DiscreteEventSimulator(req.dict()).run_simulation()

@app.get("/api/metrics/dashboard")
async def get_dashboard():
    return {"resumen_kpi": kpi_data}

@app.post("/api/llm/query")
async def text_to_sql(req: TextToSQLRequest):
    return TextToSQLAgent().process_question(req.pregunta)`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Inspección de Código de Arquitectura & Entregables</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Visualiza las secciones del MVP: DDL de PostgreSQL, Orquestación Docker Compose y Motores de Backend Python.
            </p>
          </div>
        </div>

        {/* Code Tabs */}
        <div className="flex space-x-2 mt-5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveCodeTab('schema')}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
              activeCodeTab === 'schema'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold border border-blue-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>schema.sql</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('compose')}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
              activeCodeTab === 'compose'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold border border-blue-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>docker-compose.yml</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('simulation')}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
              activeCodeTab === 'simulation'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold border border-blue-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>simulation.py</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('text2sql')}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
              activeCodeTab === 'text2sql'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold border border-blue-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>text_to_sql.py</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('fastapi')}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
              activeCodeTab === 'fastapi'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold border border-blue-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>app.py (FastAPI)</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-[#0a0a0b] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="bg-white/5 px-5 py-3 border-b border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
          <span className="text-blue-400 font-semibold">{activeCodeTab}.{activeCodeTab === 'schema' ? 'sql' : activeCodeTab === 'compose' ? 'yml' : 'py'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        <pre className="p-5 text-xs font-mono text-sky-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {snippets[activeCodeTab]}
        </pre>
      </div>
    </div>
  );
};
