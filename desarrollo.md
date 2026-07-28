## Digital Twin MVP: Service Operations BPS
**Modelo de Simulación de Eventos Discretos & Motor Prescriptivo de IA**
 
---
 
### 1. Arquitectura del MVP Operacional
 
El MVP del **Gemelo Digital** integra modelamiento de colas estocásticas, analítica en tiempo real y capacidad conversacional basada en Inteligencia Artificial:
 
1. **Engine de Simulación:** Desarrollado en Python con arquitectura orientada a eventos discretos. Modela llegadas de Poisson no homogéneas ($\lambda = 3.53$ tickets/h) y tiempos de atención con distribución Uniforme por nivel.
2. **Copiloto de IA (LLM / Ollama):** Mapea indicadores operativos (WIP, Lead Time, Utilización) e interpreta causas raíz de incumplimiento de SLA mediante análisis probabilístico.
3. **Asistente "What-If":** Permite interactuar en lenguaje natural para proyectar variaciones de demanda, cambios en el mix de clientes/tickets o indisponibilidad de personal.
 
---
 
### 2. Resultados de Simulación y Análisis de SLA
 
Resultados obtenidos tras simular **5 días hábiles de operación continua** (45 horas efectivas de servicio):
 
#### **KPIs Clave**
* **Cumplimiento SLA (Base):** `33.3%` *(Meta de Servicio: ≥ 80.0%)*
* **SLA Estresado (+50% Demanda):** `27.4%` *(Caída acelerada de servicio)*
* **Espera Promedio Nivel 1:** `11.3 min` *(Punto crítico de acumulación)*
 
#### **Métricas Detalladas por Escenario**
 
| Indicador / KPI | Configuración Base (100% Demanda) | Escenario Estresado (+50% Demanda) | Meta / Límite SLA |
| :--- | :---: | :---: | :---: |
| **Total Tickets Recibidos** | 150 tickets | 215 tickets | N/A |
| **Cumplimiento SLA Global** | **33.3%** ❌ | **27.4%** ❌ | $\ge 80.0\%$ |
| **SLA Ticket Simple** ($\le 50$ min) | 25.3% | 17.0% | $\ge 80.0\%$ |
| **SLA Ticket Medio** ($\le 200$ min) | 51.5% | 44.4% | $\ge 80.0\%$ |
| **SLA Ticket Complejo** ($\le 500$ min) | 34.2% | 28.3% | $\ge 80.0\%$ |
| **Tiempo de Ciclo Promedio (Lead Time)** | 228.6 min | 240.7 min | Optimización continua |
| **Tasa de Escalamiento a Nivel 2** | 12.7% | 12.1% | Teórico esperable: ~15% |
 
---
 
### 🤖 Diagnóstico del Asistente de IA (Interpretación de Cuellos de Botella)
 
> **Diagnóstico Técnico:**
> La dotación inicial (15 analistas N1) es insuficiente para los tiempos de atención requeridos (hasta 600 min en tickets complejos). Además, el pico de indisponibilidad (20% entre 12:00 y 14:00 hrs por colaciones/pausas) provoca una acumulación en la cola de Nivel 1 que invalida el cumplimiento de SLA del 80% en tickets Simples y Medios.
 
**Plan de Acción Prescriptivo:**
* Incrementar la dotación de Nivel 1 a **24 analistas** o rebalancear dinámicamente el mix de atención reasignando 2 analistas de Backlog/Triage a Nivel 1 durante el bloque del mediodía.
* Implementar escalonamiento de pausas en bloques de 10% de indisponibilidad máxima continua.
 