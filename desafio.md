# AI Friday Challenge
# Digital Twin para Operaciones de Service Desk
 
---
 
# 1. Contexto
 
Una organización de soporte recibe solicitudes (tickets) de clientes durante el día.
 
Cada ticket pasa por distintas etapas operacionales:
 
- Recepción
- Clasificación
- Atención Nivel 1
- Escalamiento (opcional)
- Atención Nivel 2
- Resolución
 
La empresa desea conocer el comportamiento futuro de la operación antes de realizar cambios en producción.
 
Algunas preguntas que busca responder son:
 
- ¿Cumpliremos el SLA?
- ¿Cuántos analistas necesitamos?
- ¿Qué ocurre si aumenta la demanda?
- ¿Qué sucede si disminuye la dotación?
- ¿Cuál es el cuello de botella?
- ¿Qué impacto tiene modificar el mix de tickets?
- ¿Cómo optimizar la operación minimizando costos?
 
Para responder estas preguntas se requiere construir un Digital Twin basado en simulación de eventos discretos complementado con Inteligencia Artificial.
 
---
 
# 2. Objetivo
 
Construir una plataforma que permita:
 
- Modelar una operación.
- Simular distintos escenarios.
- Analizar resultados.
- Comparar escenarios.
- Recomendar mejoras mediante IA.
 
---
 
# 3. Flujo Operacional
 
```text
Ingreso Ticket
      │
      ▼
Backlog / Triage
      │
      ▼
Asignación Nivel 1
      │
      ▼
Atención Nivel 1
      │
      ▼
¿Escala?
┌─────────────┐
│             │
No            Sí
│             │
▼             ▼
Cerrar     Nivel 2
                │
                ▼
          Resolución
```
 
---
 
# 4. Recursos Operacionales
 
## Backlog
 
Cantidad de analistas
 
**3**
 
Responsabilidades
 
- Recepción
- Clasificación
- Priorización
- Asignación
 
---
 
## Nivel 1
 
Cantidad de analistas
 
**15**
 
Responsabilidades
 
- Atención principal
- Resolución de incidentes
- Escalamiento
 
---
 
## Nivel 2
 
Cantidad de especialistas
 
**5**
 
Responsabilidades
 
- Casos complejos
- Casos escalados
 
---
 
# 5. Horario Operacional
 
Horario laboral
 
09:00 - 18:00
 
Recepción máxima de tickets
 
17:00
 
Días laborales
 
Lunes a Viernes
 
Estos parámetros deben ser completamente configurables.
 
---
 
# 6. Distribución de Clientes
 
Distribución inicial
 
| Cliente | Porcentaje |
|----------|------------|
| A | 40% |
| B | 30% |
| C | 20% |
| D | 10% |
 
Debe permitir cualquier cantidad de clientes.
 
---
 
# 7. Distribución de Tickets
 
| Tipo | Distribución |
|-------|--------------|
| Simple | 50% |
| Medio | 25% |
| Complejo | 25% |
 
Configuración completamente editable.
 
---
 
# 8. Distribución de Llegadas
 
Modelo
 
Poisson No Homogénea
 
Ejemplo
 
| Hora | λ |
|------|---|
|09-10|3.53|
|10-11|3.53|
|11-12|3.53|
|12-13|3.53|
 
Debe aceptar múltiples distribuciones.
 
---
 
# 9. Distribución de Tiempo de Atención
 
## Backlog
 
Distribución
 
Uniforme
 
Tiempo
 
5 a 20 minutos
 
---
 
## Nivel 1
 
### Ticket Simple
 
Distribución
 
Uniforme
 
20 - 60 minutos
 
Escalamiento
 
5%
 
SLA
 
50 minutos
 
---
 
### Ticket Medio
 
Distribución
 
Uniforme
 
60 - 240 minutos
 
Escalamiento
 
10%
 
SLA
 
200 minutos
 
---
 
### Ticket Complejo
 
Distribución
 
Uniforme
 
300 - 600 minutos
 
Escalamiento
 
40%
 
SLA
 
500 minutos
 
---
 
## Nivel 2
 
### Simple
 
15 - 30 minutos
 
### Medio
 
50 - 100 minutos
 
### Complejo
 
150 - 320 minutos
 
---
 
# 10. Disponibilidad de Recursos
 
Debe existir una probabilidad de indisponibilidad.
 
Ejemplo
 
| Hora | Disponibilidad |
|------|----------------|
|09-10|95%|
|10-11|95%|
|11-12|90%|
|12-14|80%|
 
Esto simula:
 
- Reuniones
- Almuerzo
- Ausencias
- Capacitación
- Licencias
 
---
 
# 11. Motor de Simulación
 
Cada ticket sigue el flujo:
 
Llegada
 
↓
 
Cola
 
↓
 
Asignación
 
↓
 
Atención
 
↓
 
Escalamiento (opcional)
 
↓
 
Resolución
 
Cada simulación debe poder ejecutarse con una semilla aleatoria para reproducibilidad.
 
---
 
# 12. Indicadores
 
## Productividad
 
- Tickets creados
- Tickets resueltos
- Throughput
- WIP
- Backlog
 
---
 
## Tiempo
 
- Lead Time
- Cycle Time
- Espera promedio
- Atención promedio
 
---
 
## Calidad
 
- Cumplimiento SLA
- Resolución mismo día
- Escalamientos
 
---
 
## Recursos
 
- Utilización por analista
- Utilización por equipo
- Horas utilizadas
- Horas disponibles
- Saturación
 
---
 
# 13. Escenarios
 
La plataforma debe permitir crear escenarios.
 
Ejemplos
 
- Escenario Base
- Alta demanda
- Baja demanda
- Mayor dotación
- Menor dotación
- Cambio SLA
- Cambio Mix
- Cambio Horario
 
Todos los escenarios deberán ser comparables.
 
---
 
# 14. Inteligencia Artificial
 
La IA deberá analizar automáticamente los resultados.
 
Capacidades esperadas
 
- Detectar cuellos de botella.
- Explicar incumplimientos.
- Recomendar mejoras.
- Comparar escenarios.
- Responder preguntas del usuario.
 
Ejemplos
 
¿Cuántos analistas necesito para cumplir el SLA?
 
¿Qué ocurre si aumenta la demanda un 20%?
 
¿Cuál es el recurso más crítico?
 
¿Dónde se genera el backlog?
 
---
 
# 15. Optimización
 
La IA deberá ser capaz de ejecutar múltiples simulaciones automáticamente para encontrar la mejor configuración.
 
Ejemplo
 
Objetivo
 
Maximizar cumplimiento SLA
 
Restricciones
 
- No aumentar más del 15% la dotación.
- Mantener el costo operacional.
 
Salida
 
Configuración recomendada.
 
---
 
# 16. Flujo Ejecutivo
 
```text
Definir Operación
        │
        ▼
Configurar Parámetros
        │
        ▼
Ejecutar Simulación
        │
        ▼
Generar KPIs
        │
        ▼
Analizar Resultados
        │
        ▼
IA Detecta Problemas
        │
        ▼
Simular Escenarios
        │
        ▼
Optimización
        │
        ▼
Recomendación
        │
        ▼
Decisión Ejecutiva
```
 
---
 
# 17. Problema de Negocio
 
Actualmente las decisiones operacionales se realizan utilizando experiencia, hojas de cálculo o análisis históricos.
 
Esto genera incertidumbre al modificar:
 
- Dotación.
- SLA.
- Horarios.
- Distribución de clientes.
- Mix de tickets.
- Recursos disponibles.
 
El Digital Twin permite experimentar virtualmente antes de aplicar cambios reales.
 
---
 
# 18. Solución Esperada
 
Una plataforma web que combine:
 
- Simulación de eventos discretos.
- Configuración flexible.
- Dashboard de KPIs.
- Comparador de escenarios.
- Motor de IA Generativa.
- Motor de optimización.
- Recomendaciones automáticas.
 
El objetivo final es transformar la simulación en una herramienta de apoyo para la toma de decisiones estratégicas y operacionales.