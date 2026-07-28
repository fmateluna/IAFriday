"""
==============================================================================
FASTAPI BACKEND SERVICE - DIGITAL TWIN OPERACIONAL (MESA DE AYUDA BPS)
==============================================================================
Expone la API REST para simulación What-If de eventos discretos, dashboard de
métricas operacionales y el asistente Text-to-SQL con Ollama + PostgreSQL.
"""

import os
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

from simulation import DiscreteEventSimulator
from text_to_sql import TextToSQLAgent

app = FastAPI(
    title="Digital Twin Operacional Mesa de Ayuda BPS API",
    description="Backend API REST con motor de simulación de eventos discretos y agente Text-to-SQL con Ollama.",
    version="1.0.0"
)

# Configuración CORS para integración fluida con Frontend Angular / React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado global en memoria para la última simulación ejecutada
global_simulation_state: Dict[str, Any] = {}

# Inicialización de motores
text_to_sql_agent = TextToSQLAgent()

# Modelo Pydantic para parámetros de simulación What-If
class SimulationRequest(BaseModel):
    nombre_escenario: Optional[str] = "Escenario Personalizado"
    lambda_poisson: Optional[float] = Field(default=3.53, ge=0.5, le=20.0, description="Tasa promedio de arribos por hora")
    dotacion_triage: Optional[int] = Field(default=3, ge=1, le=10)
    dotacion_n1: Optional[int] = Field(default=15, ge=1, le=50)
    dotacion_n2: Optional[int] = Field(default=5, ge=1, le=20)
    pct_mix_simple: Optional[float] = Field(default=50.0, ge=0.0, le=100.0)
    pct_mix_medio: Optional[float] = Field(default=25.0, ge=0.0, le=100.0)
    pct_mix_complejo: Optional[float] = Field(default=25.0, ge=0.0, le=100.0)
    semilla_aleatoria: Optional[int] = Field(default=42)

class TextToSQLRequest(BaseModel):
    pregunta: str = Field(..., example="¿Cuál fue la tasa de cumplimiento de SLA en tickets medios durante las horas de almuerzo?")

@app.on_event("startup")
async def startup_event():
    """Ejecuta la simulación Baseline inicial al arrancar el servidor"""
    global global_simulation_state
    simulator = DiscreteEventSimulator()
    global_simulation_state = simulator.run_simulation()
    print("[DigitalTwin API] Simulación Baseline ejecutada exitosamente en el arranque.")

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "Digital Twin Operacional Mesa de Ayuda BPS",
        "engine": "Discrete Event Simulation + Text-to-SQL",
        "database": "PostgreSQL Ready"
    }

@app.post("/api/simulate")
async def run_simulation_endpoint(request: SimulationRequest = Body(...)):
    """
    POST /api/simulate
    Ejecuta un escenario de simulación What-If con la parametrización recibida.
    """
    global global_simulation_state
    try:
        config = request.dict()
        simulator = DiscreteEventSimulator(config)
        result = simulator.run_simulation()
        global_simulation_state = result
        return {
            "status": "success",
            "escenario": request.nombre_escenario,
            "resumen_kpi": result["resumen_kpi"],
            "curva_wip_horaria": result["curva_wip_horaria"],
            "total_tickets": len(result["tickets_detalle"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en simulación: {str(e)}")

@app.get("/api/metrics/dashboard")
async def get_dashboard_metrics():
    """
    GET /api/metrics/dashboard
    Retorna los KPIs consolidados de la última simulación para renderizar los paneles del dashboard.
    """
    global global_simulation_state
    if not global_simulation_state:
        simulator = DiscreteEventSimulator()
        global_simulation_state = simulator.run_simulation()
        
    return {
        "status": "success",
        "resumen_kpi": global_simulation_state["resumen_kpi"],
        "curva_wip_horaria": global_simulation_state["curva_wip_horaria"],
        "tickets_muestra": global_simulation_state["tickets_detalle"][:15] # Muestra para tabla rápida
    }

@app.post("/api/llm/query")
async def query_text_to_sql_endpoint(request: TextToSQLRequest = Body(...)):
    """
    POST /api/llm/query
    Procesa preguntas en lenguaje natural utilizando el agente Text-to-SQL alimentado con Ollama.
    """
    global global_simulation_state
    if not global_simulation_state:
        simulator = DiscreteEventSimulator()
        global_simulation_state = simulator.run_simulation()
        
    try:
        response = text_to_sql_agent.process_question(
            question=request.pregunta,
            simulation_data=global_simulation_state
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando consulta Text-to-SQL: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
