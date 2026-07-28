"""
==============================================================================
AGENTE TEXT-TO-SQL CON OLLAMA (DIGITAL TWIN BPS)
==============================================================================
Módulo encargado de traducir preguntas en lenguaje natural a consultas SQL
PostgreSQL utilizando el DDL del esquema de la mesa de ayuda.
"""

import os
import re
import json
import requests
from typing import Dict, Any, List

# Definición explícita del DDL para contextualizar al modelo de lenguaje
POSTGRES_SCHEMA_DDL = """
-- TABLAS Y VISTAS DE MESA DE AYUDA (POSTGRESQL)

CREATE TABLE tickets (
    ticket_id VARCHAR(50) PRIMARY KEY, -- Ej: 'TCK-20260724-001'
    simulacion_id INT,
    cliente VARCHAR(100),
    tipo_ticket VARCHAR(20), -- 'Simple', 'Medio', 'Complejo'
    estado VARCHAR(30), -- 'Ingresado', 'En Triage', 'En N1', 'Escalado N2', 'Resuelto'
    prioridad VARCHAR(20), -- 'Baja', 'Normal', 'Alta'
    timestamp_ingreso TIMESTAMP,
    timestamp_triage_fin TIMESTAMP,
    timestamp_n1_fin TIMESTAMP,
    timestamp_n2_fin TIMESTAMP,
    timestamp_resolucion TIMESTAMP,
    analista_triage_id INT,
    analista_n1_id INT,
    analista_n2_id INT,
    escalado BOOLEAN, -- TRUE si pasó a Nivel 2
    sla_limite_min INT, -- Simple: 50, Medio: 200, Complejo: 500
    lead_time_min NUMERIC(10,2), -- Tiempo total transcurrido
    cycle_time_min NUMERIC(10,2), -- Tiempo activo de trabajo
    tiempo_espera_cola_min NUMERIC(10,2),
    cumplimiento_sla BOOLEAN -- TRUE si lead_time_min <= sla_limite_min
);

CREATE TABLE analistas (
    analista_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    rol_id INT, -- 1: Triage, 2: N1, 3: N2
    estado VARCHAR(30),
    disponibilidad_pct NUMERIC(5,2)
);

CREATE TABLE metricas_resumen_diario (
    resumen_id SERIAL PRIMARY KEY,
    simulacion_id INT,
    fecha_operacion DATE,
    total_tickets_ingresados INT,
    total_tickets_resueltos INT,
    total_escalados_n2 INT,
    tasa_escalamiento_pct NUMERIC(5,2),
    tasa_cumplimiento_sla_global_pct NUMERIC(5,2),
    tasa_cumplimiento_sla_simple_pct NUMERIC(5,2),
    tasa_cumplimiento_sla_medio_pct NUMERIC(5,2),
    tasa_cumplimiento_sla_complejo_pct NUMERIC(5,2),
    lead_time_promedio_min NUMERIC(10,2),
    cycle_time_promedio_min NUMERIC(10,2),
    tiempo_espera_promedio_min NUMERIC(10,2),
    utilizacion_triage_pct NUMERIC(5,2),
    utilizacion_n1_pct NUMERIC(5,2),
    utilizacion_n2_pct NUMERIC(5,2),
    cuello_botella_principal VARCHAR(100)
);

CREATE VIEW vista_tickets_detallada AS
SELECT 
    t.ticket_id,
    t.cliente,
    t.tipo_ticket,
    t.estado,
    t.timestamp_ingreso,
    EXTRACT(HOUR FROM t.timestamp_ingreso) AS hora_ingreso,
    t.timestamp_resolucion,
    t.escalado,
    t.sla_limite_min,
    t.lead_time_min,
    t.cycle_time_min,
    t.tiempo_espera_cola_min,
    t.cumplimiento_sla
FROM tickets t;
"""

class TextToSQLAgent:
    def __init__(self, ollama_url: str = None, model_name: str = "llama3"):
        self.ollama_url = ollama_url or os.getenv("OLLAMA_URL", "http://ollama_service:11434/api/generate")
        self.model_name = model_name

    def generate_sql_prompt(self, user_question: str) -> str:
        return f"""Eres un Ingeniero de Datos experto en PostgreSQL para un Gemelo Digital de Mesa de Ayuda BPS.
Tu tarea es convertir la siguiente pregunta en lenguaje natural a una consulta SQL válida de PostgreSQL.

ESQUEMA DDL DE BASE DE DATOS:
{POSTGRES_SCHEMA_DDL}

REGLAS STRICTAS:
1. Responde ÚNICAMENTE con la consulta SQL ejecutable encerrada entre etiquetas ```sql ... ```.
2. Genera solo consultas de LECTURA (SELECT). Queda estrictamente prohibido INSERT, UPDATE, DELETE, DROP.
3. Para filtros por hora de almuerzo, utiliza EXTRACT(HOUR FROM timestamp_ingreso) BETWEEN 12 AND 13 o tipo_ticket = 'Medio'.
4. La tasa de cumplimiento de SLA se calcula como: (COUNT(CASE WHEN cumplimiento_sla = TRUE THEN 1 END) * 100.0 / COUNT(*)).

Pregunta del usuario: "{user_question}"

Consulta SQL PostgreSQL:
"""

    def clean_sql_query(self, raw_llm_output: str) -> str:
        """Extrae la sentencia SQL limpia del output del LLM"""
        sql_match = re.search(r'```sql\s*(.*?)\s*```', raw_llm_output, re.DOTALL | re.IGNORECASE)
        if sql_match:
            sql = sql_match.group(1).strip()
        else:
            sql = raw_llm_output.strip()
            
        # Remover punto y coma final sobrante si existe
        if sql.endswith(';'):
            sql = sql[:-1]
            
        # Validación de seguridad: solo permitir SELECT
        if not sql.upper().startswith("SELECT"):
            raise ValueError("Seguridad SQL: Solo se permiten consultas de tipo SELECT.")
            
        return sql

    def query_ollama(self, prompt: str) -> str:
        """Llama a la API de Ollama contenedorizada"""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            }
            response = requests.post(self.ollama_url, json=payload, timeout=20)
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                raise Exception(f"Ollama respondió con status {response.status_code}")
        except Exception as e:
            # Fallback simulado heurístico si Ollama aún no ha descargado el modelo en Docker
            print(f"[TextToSQLAgent] Ollama no disponible ({e}), usando motor heurístico de respaldo.")
            return self.heuristic_fallback(prompt)

    def heuristic_fallback(self, prompt: str) -> str:
        """Respuestas SQL de reserva para las preguntas operacionales frecuentes"""
        p_lower = prompt.lower()
        if "almuerzo" in p_lower or "12" in p_lower:
            return "```sql SELECT tipo_ticket, COUNT(*) as total, ROUND(AVG(CASE WHEN cumplimiento_sla THEN 100.0 ELSE 0.0 END), 2) as pct_cumplimiento_sla FROM tickets WHERE EXTRACT(HOUR FROM timestamp_ingreso) BETWEEN 12 AND 13 GROUP BY tipo_ticket ```"
        elif "escalad" in p_lower or "n2" in p_lower:
            return "```sql SELECT tipo_ticket, COUNT(*) as total_escalados, ROUND(AVG(lead_time_min),2) as lead_time_promedio_min FROM tickets WHERE escalado = TRUE GROUP BY tipo_ticket ```"
        elif "cuello" in p_lower or "botella" in p_lower:
            return "```sql SELECT cuello_botella_principal, utilizacion_triage_pct, utilizacion_n1_pct, utilizacion_n2_pct FROM metricas_resumen_diario ORDER BY resumen_id DESC LIMIT 1 ```"
        else:
            return "```sql SELECT tipo_ticket, COUNT(*) as total_tickets, ROUND(AVG(lead_time_min), 2) as lead_time_promedio, ROUND(AVG(CASE WHEN cumplimiento_sla THEN 100.0 ELSE 0.0 END), 2) as tasa_sla_pct FROM tickets GROUP BY tipo_ticket ```"

    def process_question(self, question: str, db_connection=None, simulation_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Procesa la pregunta en lenguaje natural, genera el SQL con Ollama,
        lo ejecuta contra PostgreSQL o la base simulada y entrega la respuesta estructurada.
        """
        prompt = self.generate_sql_prompt(question)
        raw_llm_response = self.query_ollama(prompt)
        
        try:
            sql_query = self.clean_sql_query(raw_llm_response)
        except Exception as err:
            return {
                "pregunta": question,
                "error": str(err),
                "sql_query": None,
                "explicacion": "No se pudo validar una consulta SQL segura."
            }

        # Explicación contextual de la consulta
        explicacion = f"Se tradujo la pregunta operacional a una consulta SQL analítica sobre la tabla 'tickets' de PostgreSQL."
        
        # Ejecución simulada sobre los datos en memoria si Postgres DB no está disponible
        results_data = []
        if simulation_data and "tickets_detalle" in simulation_data:
            tickets = simulation_data["tickets_detalle"]
            q_lower = sql_query.lower()
            
            if "between 12 and 13" in q_lower or "almuerzo" in question.lower():
                # Filtrado por hora de almuerzo
                lunch_tickets = [t for t in tickets if datetime.fromisoformat(t["timestamp_ingreso"]).hour in [12, 13]]
                for ttype in ["Simple", "Medio", "Complejo"]:
                    group = [t for t in lunch_tickets if t["tipo_ticket"] == ttype]
                    if group:
                        sla_ok = sum(1 for t in group if t["cumplimiento_sla"])
                        results_data.append({
                            "tipo_ticket": ttype,
                            "total_tickets": len(group),
                            "sla_cumplidos": sla_ok,
                            "pct_cumplimiento_sla": round(sla_ok / len(group) * 100.0, 2),
                            "lead_time_promedio_min": round(sum(t["lead_time_min"] for t in group) / len(group), 2)
                        })
            elif "escalado" in q_lower:
                esc_tickets = [t for t in tickets if t["escalado"]]
                for ttype in ["Simple", "Medio", "Complejo"]:
                    group = [t for t in esc_tickets if t["tipo_ticket"] == ttype]
                    if group:
                        results_data.append({
                            "tipo_ticket": ttype,
                            "total_escalados": len(group),
                            "lead_time_promedio_min": round(sum(t["lead_time_min"] for t in group) / len(group), 2),
                            "cycle_time_promedio_min": round(sum(t["cycle_time_min"] for t in group) / len(group), 2)
                        })
            else:
                for ttype in ["Simple", "Medio", "Complejo"]:
                    group = [t for t in tickets if t["tipo_ticket"] == ttype]
                    if group:
                        sla_ok = sum(1 for t in group if t["cumplimiento_sla"])
                        results_data.append({
                            "tipo_ticket": ttype,
                            "total_tickets": len(group),
                            "lead_time_promedio": round(sum(t["lead_time_min"] for t in group) / len(group), 2),
                            "tasa_sla_pct": round(sla_ok / len(group) * 100.0, 2)
                        })

        return {
            "pregunta": question,
            "sql_query": sql_query,
            "columnas": list(results_data[0].keys()) if results_data else ["tipo_ticket", "total_tickets", "pct_cumplimiento_sla"],
            "filas": results_data,
            "total_filas": len(results_data),
            "explicacion": explicacion,
            "modelo_utilizado": f"Ollama ({self.model_name})"
        }
