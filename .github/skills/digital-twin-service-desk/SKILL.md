---
name: digital-twin-service-desk
description: Conocimiento de dominio compartido del proyecto Digital Twin Operacional para Service Desk (simulación de eventos discretos + copiloto NL2SQL sobre Ollama). Usar cuando se trabaje en cualquiera de los componentes (frontend Angular, backend Python, servicio NL2SQL, modelo de datos Postgres, infraestructura Docker) para mantener consistencia de nombres, roles y reglas de negocio entre todos ellos.
license: Internal use
---

# Digital Twin Service Desk — Contexto de Dominio

Este skill resume el problema de negocio (`desafio.md`, `problema.md`, `desarrollo.md`) que deben
respetar TODOS los agentes de desarrollo del proyecto, para evitar inconsistencias entre capas.

## Stack obligatorio

- **Frontend:** Angular
- **Backend/Middleware:** Python (FastAPI recomendado)
- **Persistencia:** PostgreSQL
- **LLM:** Ollama (contenedor Docker dedicado), modelo `minimax-m3`
- **Todo componente corre como contenedor Docker**, orquestado con `docker-compose`. Ningún
  servicio debe asumir instalación local fuera de Docker.

## Flujo operacional simulado (dominio del negocio)

```
Ingreso Ticket → Backlog/Triage → Asignación Nivel 1 → Atención Nivel 1
   → ¿Escala? --No--> Cierre
                --Sí--> Nivel 2 → Resolución → Cierre
```

## Roles / recursos (dotación configurable, NO hardcodear)

| Rol | Dotación inicial | Responsabilidad |
|-----|------------------|------------------|
| Clasificador (Backlog/Triage) | 3 | Recepción, clasificación, priorización, asignación |
| Analista Documental Nivel 1 | 15 | Atención principal, resolución, escalamiento |
| Analista Experto Nivel 2 | 5 | Casos complejos / escalados |

Estos roles deben quedar representados como entidades configurables en la base de datos
(tabla de recursos/roles con dotación, horario, disponibilidad), nunca como constantes en código.

## Parámetros configurables del modelo

- **Mix de clientes**: N clientes con % configurable que debe sumar 100% (ejemplo inicial:
  A=40%, B=30%, C=20%, D=10%). Debe soportar cualquier cantidad de clientes.
- **Mix de tickets**: Simple 50% / Medio 25% / Complejo 25%.
- **Llegadas**: proceso de **Poisson no homogéneo** (λ(t) variable por hora, ej. 3.53 tickets/h
  09-13h). Debe aceptar múltiples distribuciones de tasa.
- **Tiempos de atención**: distribución Uniforme por nivel/tipo de ticket (ver tabla en
  `desafio.md` sección 9), con % de escalamiento y SLA objetivo (min) por tipo.
- **Disponibilidad de recursos**: probabilidad de indisponibilidad por hora (reuniones, almuerzo,
  capacitación, licencias).
- **Horario operacional**: 09:00-18:00, lunes a viernes, pico de llegada 17:00 — configurable.

## KPIs que debe calcular el sistema

Productividad (tickets creados/resueltos, throughput, WIP, backlog), Tiempo (lead time, cycle
time, espera/atención promedio), Calidad (cumplimiento SLA, resolución mismo día,
escalamientos), Recursos (utilización, horas usadas/disponibles, saturación).

## Copiloto NL2SQL

- El usuario hace preguntas en lenguaje natural (ej. "¿cuántos analistas necesito para cumplir
  el SLA?", "¿qué recurso está saturado?").
- El servicio NL2SQL (contenedor propio) usa Ollama + modelo `minimax-m3` para traducir la
  pregunta a SQL de solo lectura contra Postgres, usando el esquema real como contexto.
- Reglas de seguridad: solo `SELECT`, prohibir DDL/DML, límite de filas, allowlist de
  tablas/columnas, logging de cada consulta generada para auditoría.

## Modelo de datos

El modelo definitivo se diseñará a partir de una planilla de referencia que el usuario
entregará más adelante (pendiente al momento de escribir este skill). Hasta entonces, cualquier
agente que dependa del esquema debe proponer un modelo preliminar cubriendo: clientes, tipos de
ticket, roles/recursos, tickets, escenarios de simulación, resultados/KPIs por corrida, y
metadata/logging del copiloto NL2SQL — dejándolo fácilmente migrable.

## Cuándo usar este skill

- Al implementar o modificar cualquier componente del proyecto (frontend, backend, NL2SQL,
  modelo de datos, docker-compose) para no perder de vista roles, parámetros y reglas de negocio
  compartidas.
- Al coordinar entre agentes especializados (`arquitecto-digital-twin`, `db-architect-postgres`,
  `backend-python-dev`, `nl2sql-ollama-agent`, `frontend-angular-dev`, `devops-docker`) para
  mantener nombres y contratos consistentes.
