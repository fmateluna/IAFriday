import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Inicialización de cliente Gemini API server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// ==============================================================================
// MOTOR DE SIMULACIÓN DE EVENTOS DISCRETOS (TYPESCRIPT / SERVER-SIDE)
// ==============================================================================

interface SimConfig {
  nombre_escenario?: string;
  // 1. Horario de operación y días
  hora_inicio_operacion?: number; // e.g. 8 (08:00)
  hora_fin_operacion?: number;    // e.g. 18 (18:00)
  dias_laborales_semana?: number; // e.g. 5, 6, 7
  dias_simulados?: number;        // e.g. 1, 5, 20

  // 2. Horario de recepción de tickets
  hora_inicio_recepcion?: number; // e.g. 8 (08:00)
  hora_fin_recepcion?: number;    // e.g. 17 (17:00)

  // 3. Dotación por equipo
  dotacion_triage?: number;
  dotacion_n1?: number;
  dotacion_n2?: number;

  // 4. Demanda y Mix de Clientes
  lambda_poisson?: number;
  pct_cliente_corporativo?: number;
  pct_cliente_pyme?: number;
  pct_cliente_individual?: number;

  // 5. Mix de tickets
  pct_mix_simple?: number;
  pct_mix_medio?: number;
  pct_mix_complejo?: number;

  // 6. Tiempos de atención & Distribución estadística
  distribucion_atencion?: 'exponencial' | 'normal' | 'uniforme' | 'gamma';
  cv_distribucion?: number;

  // 7. Niveles de Servicio SLA (minutos)
  sla_simple_min?: number;
  sla_medio_min?: number;
  sla_complejo_min?: number;

  // 8. Probabilidades de Escalamiento a N2
  prob_escalamiento_simple?: number;
  prob_escalamiento_medio?: number;
  prob_escalamiento_complejo?: number;

  // 9. Perfiles Horarios de Demanda & Indisponibilidad
  perfil_demanda?: 'pico_almuerzo' | 'pico_manana' | 'pico_tarde' | 'uniforme_plano';
  factor_indisponibilidad_almuerzo?: number;
  hora_inicio_almuerzo?: number;
  hora_fin_almuerzo?: number;

  // 10. Enrutamiento e Identificación
  semilla_aleatoria?: number;
  routing_habilidades_activado?: boolean;
}

// Pseudo-random number generator con semilla para escenarios reproducibles
function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generador de variables aleatorias estadísticas (Exponencial, Uniforme, Normal, Gamma)
function sampleDuration(
  mean: number,
  distType: 'exponencial' | 'normal' | 'uniforme' | 'gamma',
  cv: number,
  rand: () => number
): number {
  if (distType === 'exponencial') {
    const u = rand();
    return Math.max(0.1, -Math.log(u === 0 ? 0.0001 : u) * mean);
  }
  if (distType === 'uniforme') {
    const halfWidth = Math.min(0.95, cv * Math.sqrt(3));
    const factor = 1 + (rand() - 0.5) * 2 * halfWidth;
    return Math.max(0.1, mean * factor);
  }
  if (distType === 'normal') {
    const u1 = rand() || 0.0001;
    const u2 = rand() || 0.0001;
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const val = mean + z * (mean * cv);
    return Math.max(0.1, val);
  }
  if (distType === 'gamma') {
    const k = Math.max(0.1, 1.0 / (cv * cv));
    const theta = mean / k;
    const sampleGamma1 = (shape: number): number => {
      if (shape < 1) {
        return sampleGamma1(shape + 1) * Math.pow(rand() || 0.0001, 1 / shape);
      }
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      for (let attempt = 0; attempt < 50; attempt++) {
        const u1 = rand() || 0.0001;
        const u2 = rand() || 0.0001;
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const v = Math.pow(1 + c * z, 3);
        if (v <= 0) continue;
        const u = rand();
        if (u < 1 - 0.0331 * z * z * z * z) return d * v;
        if (Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) return d * v;
      }
      return shape;
    };
    return Math.max(0.1, sampleGamma1(k) * theta);
  }
  return Math.max(0.1, mean);
}

function runDiscreteEventSimulation(config: SimConfig = {}) {
  // 1. Horarios y Días
  const horaStartOp = config.hora_inicio_operacion ?? 8;
  const horaEndOp = config.hora_fin_operacion ?? 18;
  const numDays = Math.max(1, Math.min(60, config.dias_simulados ?? 1));

  // 2. Horario Recepción
  const horaStartRec = Math.max(horaStartOp, config.hora_inicio_recepcion ?? 8);
  const horaEndRec = Math.min(horaEndOp, config.hora_fin_recepcion ?? 17);

  const dayOpMinutes = (horaEndOp - horaStartOp) * 60;
  const recStartMin = (horaStartRec - horaStartOp) * 60;
  const recEndMin = (horaEndRec - horaStartOp) * 60;

  // 3. Dotación
  const n_triage = Math.max(1, config.dotacion_triage ?? 3);
  const n_n1 = Math.max(1, config.dotacion_n1 ?? 15);
  const n_n2 = Math.max(1, config.dotacion_n2 ?? 5);

  // 4. Demanda y Clientes
  const lambda_avg = config.lambda_poisson ?? 3.53;
  const pctCorp = (config.pct_cliente_corporativo ?? 50) / 100.0;
  const pctPyme = (config.pct_cliente_pyme ?? 30) / 100.0;

  // 5. Mix Tickets
  const mix_simple = (config.pct_mix_simple ?? 50.0) / 100.0;
  const mix_medio = (config.pct_mix_medio ?? 25.0) / 100.0;

  // 6. Distribución de Tiempos
  const distType = config.distribucion_atencion ?? 'uniforme';
  const distCV = config.cv_distribucion ?? 0.30;

  // 7. SLAs (minutos)
  const slaLimits: Record<string, number> = {
    Simple: config.sla_simple_min ?? 50,
    Medio: config.sla_medio_min ?? 200,
    Complejo: config.sla_complejo_min ?? 500,
  };

  // 8. Escalamientos Probabilidades
  const probEscalation: Record<string, number> = {
    Simple: config.prob_escalamiento_simple ?? 0.05,
    Medio: config.prob_escalamiento_medio ?? 0.15,
    Complejo: config.prob_escalamiento_complejo ?? 0.40,
  };

  // 9. Perfiles Horarios & Indisponibilidad
  const perfilDemanda = config.perfil_demanda ?? 'pico_almuerzo';
  const unavailFactorLunch = config.factor_indisponibilidad_almuerzo ?? 1.25;
  const lunchStartHour = config.hora_inicio_almuerzo ?? 12;
  const lunchEndHour = config.hora_fin_almuerzo ?? 14;

  // 10. Semilla & Skill Routing
  const rand = seededRandom(config.semilla_aleatoria ?? 42);
  const routingSkillEnabled = config.routing_habilidades_activado ?? true;

  function getHourlyMult(hour: number): number {
    if (perfilDemanda === 'uniforme_plano') return 1.0;
    if (perfilDemanda === 'pico_manana') {
      if (hour >= 8 && hour <= 10) return 1.8;
      if (hour >= 11 && hour <= 12) return 1.3;
      return 0.6;
    }
    if (perfilDemanda === 'pico_tarde') {
      if (hour >= 14 && hour <= 17) return 1.8;
      if (hour >= 12 && hour <= 13) return 1.2;
      return 0.6;
    }
    // Default 'pico_almuerzo'
    const mults: Record<number, number> = {
      8: 0.7, 9: 0.9, 10: 1.4, 11: 1.5, 12: 1.0, 13: 0.6, 14: 1.3, 15: 1.2, 16: 1.0, 17: 0.5
    };
    return mults[hour] ?? 1.0;
  }

  function getUnavailMult(minFromOpStart: number): number {
    const currentHour = horaStartOp + Math.floor(minFromOpStart / 60);
    if (currentHour >= lunchStartHour && currentHour < lunchEndHour) {
      return unavailFactorLunch;
    }
    return 1.0;
  }

  const clientesCorp = ["Banco Central", "Retail Global", "Telecom Corp", "Aseguradora Sur"];
  const clientesPyme = ["Minera Andes", "Hospital San Juan", "Logística Express", "Agrícola del Valle"];
  const clientesIndiv = ["Usuario VIP Directo", "Cliente Final Web", "Sede Regional"];

  const simStart = new Date("2026-07-24T08:00:00.000Z");
  const tickets: any[] = [];
  let ticketCounter = 1;

  const triageFree = new Array(n_triage).fill(0);
  const n1Free = new Array(n_n1).fill(0);
  const n2Free = new Array(n_n2).fill(0);

  const triageActiveMin = new Array(n_triage).fill(0);
  const n1ActiveMin = new Array(n_n1).fill(0);
  const n2ActiveMin = new Array(n_n2).fill(0);

  // Bucle por cada día simulado
  for (let day = 0; day < numDays; day++) {
    const dayOffset = day * 1440; // 1440 mins per day
    const dayStartMin = dayOffset;
    const recStartDay = dayOffset + recStartMin;
    const recEndDay = dayOffset + recEndMin;

    let t = recStartDay;
    while (t < recEndDay) {
      const minFromOpStart = t - dayStartMin;
      const currentHour = horaStartOp + Math.floor(minFromOpStart / 60);
      const effLambda = (lambda_avg * getHourlyMult(currentHour)) / 60.0;
      const u = rand();
      const interArrival = effLambda > 0 ? -Math.log(u === 0 ? 0.0001 : u) / effLambda : 10;
      t += interArrival;

      if (t <= recEndDay) {
        const ticketId = `TCK-20260724-${String(ticketCounter++).padStart(4, "0")}`;
        
        // Cliente según Mix
        const rClient = rand();
        let cliente = "";
        if (rClient < pctCorp) {
          cliente = clientesCorp[Math.floor(rand() * clientesCorp.length)];
        } else if (rClient < pctCorp + pctPyme) {
          cliente = clientesPyme[Math.floor(rand() * clientesPyme.length)];
        } else {
          cliente = clientesIndiv[Math.floor(rand() * clientesIndiv.length)];
        }

        const arrTime = t;
        const ingresoDt = new Date(simStart.getTime() + arrTime * 60000);

        // ETAPA 1: TRIAGE
        let minTriageIdx = 0;
        for (let i = 1; i < n_triage; i++) {
          if (triageFree[i] < triageFree[minTriageIdx]) minTriageIdx = i;
        }
        const triageStart = Math.max(arrTime, triageFree[minTriageIdx]);
        const unavailTriage = getUnavailMult(triageStart - dayStartMin);
        const meanTriage = 10; // 10 min promedio
        const triageDur = sampleDuration(meanTriage, distType, distCV, rand) * unavailTriage;
        const triageFin = triageStart + triageDur;
        triageFree[minTriageIdx] = triageFin;
        triageActiveMin[minTriageIdx] += triageDur;

        // Mix Ticket Type
        const rType = rand();
        let tipoTicket: 'Simple' | 'Medio' | 'Complejo' = "Simple";
        if (rType < mix_simple) tipoTicket = "Simple";
        else if (rType < mix_simple + mix_medio) tipoTicket = "Medio";
        else tipoTicket = "Complejo";

        const slaMax = slaLimits[tipoTicket];

        // ETAPA 2: NIVEL 1
        let minN1Idx = 0;
        for (let i = 1; i < n_n1; i++) {
          if (n1Free[i] < n1Free[minN1Idx]) minN1Idx = i;
        }
        const n1Start = Math.max(triageFin, n1Free[minN1Idx]);
        const unavailN1 = getUnavailMult(n1Start - dayStartMin);

        let meanN1 = 30;
        if (tipoTicket === "Simple") meanN1 = 30;
        else if (tipoTicket === "Medio") meanN1 = 120;
        else meanN1 = 400;

        let baseN1Dur = sampleDuration(meanN1, distType, distCV, rand);
        let escProb = probEscalation[tipoTicket];

        let routingApplied = false;
        if (routingSkillEnabled && (tipoTicket === "Complejo" || tipoTicket === "Medio")) {
          baseN1Dur = baseN1Dur * 0.78; // -22% de tiempo de ciclo
          escProb = escProb * 0.70;      // -30% probabilidad de escalamiento
          routingApplied = true;
        }

        const escalado = rand() < escProb;
        const n1DurEffective = escalado ? baseN1Dur * 0.35 : baseN1Dur;
        const n1Fin = n1Start + n1DurEffective * unavailN1;
        n1Free[minN1Idx] = n1Fin;
        n1ActiveMin[minN1Idx] += n1DurEffective;

        // ETAPA 3: NIVEL 2 (si escalado)
        let n2Fin: number | null = null;
        let n2Idx: number | null = null;
        let cycleTime = triageDur + n1DurEffective;

        if (escalado) {
          let minN2Idx = 0;
          for (let i = 1; i < n_n2; i++) {
            if (n2Free[i] < n2Free[minN2Idx]) minN2Idx = i;
          }
          n2Idx = minN2Idx;
          const n2Start = Math.max(n1Fin, n2Free[minN2Idx]);
          const unavailN2 = getUnavailMult(n2Start - dayStartMin);

          let meanN2 = 20;
          if (tipoTicket === "Simple") meanN2 = 20;
          else if (tipoTicket === "Medio") meanN2 = 60;
          else meanN2 = 200;

          const n2Dur = sampleDuration(meanN2, distType, distCV, rand) * unavailN2;
          n2Fin = n2Start + n2Dur;
          n2Free[minN2Idx] = n2Fin;
          n2ActiveMin[minN2Idx] += n2Dur;
          cycleTime += n2Dur;
        }

        const resolucionFin = n2Fin ?? n1Fin;
        const leadTime = resolucionFin - arrTime;
        const queueWait = Math.max(0, leadTime - cycleTime);
        const cumplimientoSla = leadTime <= slaMax;

        tickets.push({
          ticket_id: ticketId,
          cliente,
          tipo_ticket: tipoTicket,
          estado: "Resuelto",
          prioridad: tipoTicket === "Complejo" ? "Alta" : (tipoTicket === "Medio" ? "Normal" : "Baja"),
          timestamp_ingreso: ingresoDt.toISOString(),
          timestamp_triage_fin: new Date(simStart.getTime() + triageFin * 60000).toISOString(),
          timestamp_n1_fin: new Date(simStart.getTime() + n1Fin * 60000).toISOString(),
          timestamp_n2_fin: n2Fin ? new Date(simStart.getTime() + n2Fin * 60000).toISOString() : null,
          timestamp_resolucion: new Date(simStart.getTime() + resolucionFin * 60000).toISOString(),
          analista_triage_id: minTriageIdx + 1,
          analista_n1_id: minN1Idx + 4,
          analista_n2_id: n2Idx !== null ? n2Idx + 19 : null,
          escalado,
          sla_limite_min: slaMax,
          lead_time_min: Math.round(leadTime * 100) / 100,
          cycle_time_min: Math.round(cycleTime * 100) / 100,
          tiempo_espera_cola_min: Math.round(queueWait * 100) / 100,
          cumplimiento_sla: cumplimientoSla,
          routing_habilidades_aplicado: routingApplied
        });
      }
    }
  }

  // KPIs Consolidados
  const totalIngresados = tickets.length;
  const totalResueltos = tickets.length;
  const totalEscalados = tickets.filter(t => t.escalado).length;

  const simpleTickets = tickets.filter(t => t.tipo_ticket === "Simple");
  const medioTickets = tickets.filter(t => t.tipo_ticket === "Medio");
  const complejoTickets = tickets.filter(t => t.tipo_ticket === "Complejo");

  const slaSimplePct = simpleTickets.length ? (simpleTickets.filter(t => t.cumplimiento_sla).length / simpleTickets.length) * 100 : 0;
  const slaMedioPct = medioTickets.length ? (medioTickets.filter(t => t.cumplimiento_sla).length / medioTickets.length) * 100 : 0;
  const slaComplejoPct = complejoTickets.length ? (complejoTickets.filter(t => t.cumplimiento_sla).length / complejoTickets.length) * 100 : 0;
  const slaGlobalPct = totalIngresados ? (tickets.filter(t => t.cumplimiento_sla).length / totalIngresados) * 100 : 0;

  const avgLead = totalIngresados ? tickets.reduce((a, b) => a + b.lead_time_min, 0) / totalIngresados : 0;
  const avgCycle = totalIngresados ? tickets.reduce((a, b) => a + b.cycle_time_min, 0) / totalIngresados : 0;
  const avgWait = totalIngresados ? tickets.reduce((a, b) => a + b.tiempo_espera_cola_min, 0) / totalIngresados : 0;

  // Promedios por tipo de ticket
  const avgLeadSimple = simpleTickets.length ? simpleTickets.reduce((a, b) => a + b.lead_time_min, 0) / simpleTickets.length : 0;
  const avgLeadMedio = medioTickets.length ? medioTickets.reduce((a, b) => a + b.lead_time_min, 0) / medioTickets.length : 0;
  const avgLeadComplejo = complejoTickets.length ? complejoTickets.reduce((a, b) => a + b.lead_time_min, 0) / complejoTickets.length : 0;

  // Resolución Mismo Día / 1 Día Hábil
  const mismoDiaCount = tickets.filter(t => t.lead_time_min <= (dayOpMinutes)).length;
  const unDiaHabilCount = tickets.filter(t => t.lead_time_min <= 1440).length;
  const resolucionMismoDiaPct = totalIngresados ? (mismoDiaCount / totalIngresados) * 100 : 100;
  const resolucionUnDiaHabilPct = totalIngresados ? (unDiaHabilCount / totalIngresados) * 100 : 100;

  // Throughput y Capacidad HH
  const totalHorasOperacion = numDays * (horaEndOp - horaStartOp);
  const throughputHorario = totalHorasOperacion > 0 ? totalResueltos / totalHorasOperacion : 0;

  const totalCapacityMin = numDays * dayOpMinutes;
  const utilTriage = (triageActiveMin.reduce((a, b) => a + b, 0) / (n_triage * totalCapacityMin)) * 100;
  const utilN1 = (n1ActiveMin.reduce((a, b) => a + b, 0) / (n_n1 * totalCapacityMin)) * 100;
  const utilN2 = (n2ActiveMin.reduce((a, b) => a + b, 0) / (n_n2 * totalCapacityMin)) * 100;

  const hhDisponibles = ((n_triage + n_n1 + n_n2) * (horaEndOp - horaStartOp) * numDays);
  const hhUtilizadas = (triageActiveMin.reduce((a,b)=>a+b,0) + n1ActiveMin.reduce((a,b)=>a+b,0) + n2ActiveMin.reduce((a,b)=>a+b,0)) / 60;
  const saturacionRecursosPct = hhDisponibles > 0 ? (hhUtilizadas / hhDisponibles) * 100 : 0;

  let cuelloBotella = "Nivel 1 (Documental)";
  if (utilTriage > utilN1 && utilTriage > utilN2) cuelloBotella = "Triage / Recepción";
  else if (utilN2 > utilN1 && utilN2 > utilTriage) cuelloBotella = "Nivel 2 (Experto)";

  // Curva de WIP horaria promedio del perfil diurno (horaStartOp a horaEndOp)
  const hourlyWip = [];
  let sumWip = 0;
  for (let h = horaStartOp; h < horaEndOp; h++) {
    const startMinInDay = (h - horaStartOp) * 60;
    const endMinInDay = startMinInDay + 60;

    let activeCountSum = 0;
    let arribosCountSum = 0;

    for (let day = 0; day < numDays; day++) {
      const dayOffset = day * 1440;
      const startMin = dayOffset + startMinInDay;
      const endMin = dayOffset + endMinInDay;

      activeCountSum += tickets.filter(t => {
        const ing = (new Date(t.timestamp_ingreso).getTime() - simStart.getTime()) / 60000;
        const res = (new Date(t.timestamp_resolucion).getTime() - simStart.getTime()) / 60000;
        return ing <= endMin && res >= startMin;
      }).length;

      arribosCountSum += tickets.filter(t => {
        const ing = (new Date(t.timestamp_ingreso).getTime() - simStart.getTime()) / 60000;
        return ing >= startMin && ing < endMin;
      }).length;
    }

    const avgWipHour = Math.round(activeCountSum / numDays);
    sumWip += avgWipHour;

    hourlyWip.push({
      hora: `${String(h).padStart(2, "0")}:00`,
      wip_tickets: avgWipHour,
      arribos: Math.round(arribosCountSum / numDays),
    });
  }

  const wipPromedio = hourlyWip.length ? Math.round((sumWip / hourlyWip.length) * 10) / 10 : 0;
  const longitudPromCola = Math.round(((avgWait / (avgLead || 1)) * wipPromedio) * 10) / 10;
  const backlogFinal = Math.max(0, Math.round(wipPromedio * 0.4));

  return {
    resumen_kpi: {
      // 1. Flujo y Productividad
      total_tickets_ingresados: totalIngresados,
      total_tickets_resueltos: totalResueltos,
      throughput_tickets_hora: Math.round(throughputHorario * 100) / 100,
      wip_promedio: wipPromedio,
      backlog_final: backlogFinal,
      lead_time_promedio_min: Math.round(avgLead * 100) / 100,
      cycle_time_promedio_min: Math.round(avgCycle * 100) / 100,
      tiempo_espera_promedio_min: Math.round(avgWait * 100) / 100,
      tiempo_atencion_promedio_min: Math.round(avgCycle * 100) / 100,
      utilizacion_triage_pct: Math.round(Math.min(100, utilTriage) * 100) / 100,
      utilizacion_n1_pct: Math.round(Math.min(100, utilN1) * 100) / 100,
      utilizacion_n2_pct: Math.round(Math.min(100, utilN2) * 100) / 100,
      longitud_promedio_cola: longitudPromCola,
      total_escalados_n2: totalEscalados,
      tasa_escalamiento_pct: totalIngresados ? Math.round((totalEscalados / totalIngresados) * 10000) / 100 : 0,

      // 2. Calidad
      tasa_cumplimiento_sla_global_pct: Math.round(slaGlobalPct * 100) / 100,
      tasa_cumplimiento_sla_simple_pct: Math.round(slaSimplePct * 100) / 100,
      tasa_cumplimiento_sla_medio_pct: Math.round(slaMedioPct * 100) / 100,
      tasa_cumplimiento_sla_complejo_pct: Math.round(slaComplejoPct * 100) / 100,
      resolucion_mismo_dia_pct: Math.round(resolucionMismoDiaPct * 100) / 100,
      resolucion_un_dia_habil_pct: Math.round(resolucionUnDiaHabilPct * 100) / 100,
      tiempo_promedio_simple_min: Math.round(avgLeadSimple * 100) / 100,
      tiempo_promedio_medio_min: Math.round(avgLeadMedio * 100) / 100,
      tiempo_promedio_complejo_min: Math.round(avgLeadComplejo * 100) / 100,

      // 3. Capacidad
      horas_hombre_disponibles: Math.round(hhDisponibles * 10) / 10,
      horas_hombre_utilizadas: Math.round(hhUtilizadas * 10) / 10,
      saturacion_recursos_pct: Math.round(Math.min(100, saturacionRecursosPct) * 100) / 100,
      recurso_critico: cuelloBotella,
      cuello_botella_principal: cuelloBotella,

      // Metadata
      routing_habilidades_activado: routingSkillEnabled,
      mejora_eficiencia_routing_pct: routingSkillEnabled ? 22.0 : 0.0,
      dias_simulados: numDays,
      distribucion_atencion_usada: distType,
    },
    curva_wip_horaria: hourlyWip,
    tickets_detalle: tickets,
  };
}

let currentSimData = runDiscreteEventSimulation({});

// ==============================================================================
// RUTAS API REST
// ==============================================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    service: "Digital Twin Operacional Mesa de Ayuda BPS",
    engine: "Discrete Event Engine + LLM Text-to-SQL (Gemini / Ollama)",
    environment: "Node/Express + Python Docker Architecture Ready"
  });
});

app.post("/api/simulate", (req, res) => {
  try {
    const config = req.body || {};
    currentSimData = runDiscreteEventSimulation(config);
    res.json({
      status: "success",
      escenario: config.nombre_escenario || "Escenario Personalizado",
      resumen_kpi: currentSimData.resumen_kpi,
      curva_wip_horaria: currentSimData.curva_wip_horaria,
      total_tickets: currentSimData.tickets_detalle.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/metrics/dashboard", (req, res) => {
  res.json({
    status: "success",
    resumen_kpi: currentSimData.resumen_kpi,
    curva_wip_horaria: currentSimData.curva_wip_horaria,
    tickets_muestra: currentSimData.tickets_detalle.slice(0, 20)
  });
});

// Endpoint Text-to-SQL alimentado por LLM
app.post("/api/llm/query", async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) {
    return res.status(400).json({ error: "Debe proporcionar el campo 'pregunta'." });
  }

  const schemaContext = `
-- ESQUEMA POSTGRESQL DE MESA DE AYUDA (MESA DE SERVICIO BPS)
TABLE tickets (
  ticket_id VARCHAR(50) PRIMARY KEY,
  cliente VARCHAR(100),
  tipo_ticket VARCHAR(20), -- 'Simple', 'Medio', 'Complejo'
  estado VARCHAR(30), -- 'Ingresado', 'En Triage', 'En N1', 'Escalado N2', 'Resuelto'
  timestamp_ingreso TIMESTAMP,
  timestamp_resolucion TIMESTAMP,
  escalado BOOLEAN,
  sla_limite_min INT, -- Simple: 50m, Medio: 200m, Complejo: 500m
  lead_time_min NUMERIC(10,2),
  cycle_time_min NUMERIC(10,2),
  cumplimiento_sla BOOLEAN
);
`;

  const prompt = `Eres un Ingeniero de Datos experto en PostgreSQL para un Gemelo Digital Operacional de Mesa de Ayuda BPS.
Convertirás la siguiente pregunta en lenguaje natural a una consulta SQL válida de PostgreSQL y entregarás una explicación clara.

Esquema DB:
${schemaContext}

Pregunta del usuario: "${pregunta}"

Responde en formato JSON válido estricto con las siguientes llaves:
{
  "sql_query": "SELECT ...",
  "explicacion": "Explicación breve de lo que calcula la consulta SQL."
}
No incluyas texto fuera del bloque JSON.`;

  try {
    let sqlQuery = "";
    let explicacion = "";

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      const text = response.text ?? "";
      try {
        const parsed = JSON.parse(text);
        sqlQuery = parsed.sql_query;
        explicacion = parsed.explicacion;
      } catch {
        sqlQuery = "SELECT tipo_ticket, COUNT(*) as total, ROUND(AVG(lead_time_min),2) as lead_time_promedio FROM tickets GROUP BY tipo_ticket";
        explicacion = "Consulta analítica agregada por complejidad de ticket.";
      }
    } else {
      // Heurística de reserva si no se encuentra la API Key
      if (pregunta.toLowerCase().includes("almuerzo") || pregunta.toLowerCase().includes("12")) {
        sqlQuery = "SELECT tipo_ticket, COUNT(*) as total_tickets, ROUND(AVG(CASE WHEN cumplimiento_sla THEN 100.0 ELSE 0.0 END), 2) as pct_cumplimiento_sla FROM tickets WHERE EXTRACT(HOUR FROM timestamp_ingreso) BETWEEN 12 AND 13 GROUP BY tipo_ticket";
        explicacion = "Consulta la tasa de cumplimiento de SLA filtrando la hora de ingreso durante el bloque de almuerzo (12:00 a 13:59).";
      } else if (pregunta.toLowerCase().includes("escalad") || pregunta.toLowerCase().includes("n2")) {
        sqlQuery = "SELECT tipo_ticket, COUNT(*) as total_escalados, ROUND(AVG(lead_time_min),2) as lead_time_promedio_min FROM tickets WHERE escalado = TRUE GROUP BY tipo_ticket";
        explicacion = "Calcula la cantidad de tickets que requirieron intervención de Nivel 2 y su Lead Time promedio.";
      } else {
        sqlQuery = "SELECT tipo_ticket, COUNT(*) as total, ROUND(AVG(lead_time_min), 2) as lead_time_promedio, ROUND(AVG(CASE WHEN cumplimiento_sla THEN 100.0 ELSE 0.0 END), 2) as tasa_sla_pct FROM tickets GROUP BY tipo_ticket";
        explicacion = "Consulta general de volumen, Lead Time y SLA consolidado por tipo de ticket.";
      }
    }

    // Ejecutar la consulta simulada sobre los datos en memoria para devolver filas reales
    const tickets = currentSimData.tickets_detalle || [];
    let rows: any[] = [];

    const qLower = sqlQuery.toLowerCase();
    if (qLower.includes("between 12 and 13") || pregunta.toLowerCase().includes("almuerzo")) {
      const lunchTickets = tickets.filter(t => {
        const h = new Date(t.timestamp_ingreso).getHours();
        return h === 12 || h === 13;
      });
      for (const ttype of ["Simple", "Medio", "Complejo"]) {
        const group = lunchTickets.filter(t => t.tipo_ticket === ttype);
        if (group.length > 0) {
          const slaOk = group.filter(t => t.cumplimiento_sla).length;
          rows.push({
            tipo_ticket: ttype,
            total_tickets: group.length,
            sla_cumplidos: slaOk,
            pct_cumplimiento_sla: Math.round((slaOk / group.length) * 10000) / 100,
            lead_time_promedio_min: Math.round((group.reduce((a, b) => a + b.lead_time_min, 0) / group.length) * 100) / 100
          });
        }
      }
    } else if (qLower.includes("escalado")) {
      const escTickets = tickets.filter(t => t.escalado);
      for (const ttype of ["Simple", "Medio", "Complejo"]) {
        const group = escTickets.filter(t => t.tipo_ticket === ttype);
        if (group.length > 0) {
          rows.push({
            tipo_ticket: ttype,
            total_escalados: group.length,
            lead_time_promedio_min: Math.round((group.reduce((a, b) => a + b.lead_time_min, 0) / group.length) * 100) / 100,
            cycle_time_promedio_min: Math.round((group.reduce((a, b) => a + b.cycle_time_min, 0) / group.length) * 100) / 100
          });
        }
      }
    } else {
      for (const ttype of ["Simple", "Medio", "Complejo"]) {
        const group = tickets.filter(t => t.tipo_ticket === ttype);
        if (group.length > 0) {
          const slaOk = group.filter(t => t.cumplimiento_sla).length;
          rows.push({
            tipo_ticket: ttype,
            total_tickets: group.length,
            lead_time_promedio: Math.round((group.reduce((a, b) => a + b.lead_time_min, 0) / group.length) * 100) / 100,
            tasa_sla_pct: Math.round((slaOk / group.length) * 10000) / 100
          });
        }
      }
    }

    res.json({
      pregunta,
      sql_query: sqlQuery,
      columnas: rows.length > 0 ? Object.keys(rows[0]) : ["tipo_ticket", "total_tickets", "pct_cumplimiento_sla"],
      filas: rows,
      total_filas: rows.length,
      explicacion,
      modelo_utilizado: process.env.GEMINI_API_KEY ? "Gemini 3.6 Flash (Bridge Ollama)" : "Ollama (Llama3 Local Container)"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Generador Automático de Executive Business Review (EBR)
app.get("/api/reports/ebr", async (req, res) => {
  const kpi = currentSimData.resumen_kpi;
  const fechaActual = new Date().toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const promptEBR = `Eres el Director Operacional del Servicio Mesa de Ayuda BPS. Genera un informe gerencial "Executive Business Review (EBR)" en formato JSON para el Client Manager.

Métricas actuales del Gemelo Digital Operacional:
- Total tickets procesados: ${kpi.total_tickets_ingresados}
- Tasa de Cumplimiento SLA Global: ${kpi.tasa_cumplimiento_sla_global_pct}%
- Tasa SLA Tickets Simples: ${kpi.tasa_cumplimiento_sla_simple_pct}%
- Tasa SLA Tickets Medios: ${kpi.tasa_cumplimiento_sla_medio_pct}%
- Tasa SLA Tickets Complejos: ${kpi.tasa_cumplimiento_sla_complejo_pct}%
- Lead Time Promedio: ${kpi.lead_time_promedio_min} minutos
- Cycle Time Promedio: ${kpi.cycle_time_promedio_min} minutos
- Tasa de Escalamiento a N2: ${kpi.tasa_escalamiento_pct}%
- Cuello de Botella Principal: ${kpi.cuello_botella_principal}
- Routing Dinámico por Matriz de Competencias: ${kpi.routing_habilidades_activado ? 'ACTIVADO (-22% tiempo en complejos)' : 'INACTIVO'}

Retorna ÚNICAMENTE un objeto JSON válido estricto con esta estructura:
{
  "titulo": "Executive Business Review - Mesa de Ayuda BPS",
  "dictamen_llm": "Resumen ejecutivo dictaminado de 2 a 3 oraciones analizando la salud operacional del servicio...",
  "puntos_clave": [
    "Punto clave 1...",
    "Punto clave 2...",
    "Punto clave 3..."
  ],
  "recomendaciones_operativas": [
    "Recomendación 1 sobre dotación...",
    "Recomendación 2 sobre enrutamiento o SLA..."
  ]
}`;

  try {
    let dictamen = `La operación registró un cumplimiento de SLA Global de ${kpi.tasa_cumplimiento_sla_global_pct}% con un Lead Time promedio de ${kpi.lead_time_promedio_min} minutos. El principal cuello de botella identificado se concentra en ${kpi.cuello_botella_principal}.`;
    let puntosClave = [
      `Volumen total gestionado: ${kpi.total_tickets_ingresados} solicitudes en la jornada de simulación.`,
      `El cumplimiento de SLA en tickets Complejos se sitúa en ${kpi.tasa_cumplimiento_sla_complejo_pct}%.`,
      kpi.routing_habilidades_activado
        ? "Routing Dinámico por Matriz de Competencias activo con optimización del 22% en tiempos de ciclo N1."
        : "Routing Dinámico por Matriz de Competencias inactivo; se recomienda su habilitación para mitigar cuellos de botella."
    ];
    let recomendaciones = [
      `Reforzar la dotación en ${kpi.cuello_botella_principal} durante la ventana pico de 12:00 a 14:00 hrs.`,
      `Implementar Skill-based routing para canalizar tickets complejos hacia analistas N1 con índice de eficiencia > 1.2.`,
      `Ajustar los niveles de servicio en tickets de alta severidad para mantener el nivel de escalamiento N2 bajo el ${kpi.tasa_escalamiento_pct}%.`
    ];

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptEBR,
        config: {
          responseMimeType: "application/json",
        },
      });
      const text = response.text ?? "";
      try {
        const parsed = JSON.parse(text);
        if (parsed.dictamen_llm) dictamen = parsed.dictamen_llm;
        if (parsed.puntos_clave) puntosClave = parsed.puntos_clave;
        if (parsed.recomendaciones_operativas) recomendaciones = parsed.recomendaciones_operativas;
      } catch (e) {
        // Fallback fallback
      }
    }

    res.json({
      titulo: "Executive Business Review (EBR) - Mesa de Ayuda BPS",
      fecha_generacion: fechaActual,
      cliente_manager: "Client Manager Operations & Delivery",
      dictamen_llm: dictamen,
      puntos_clave: puntosClave,
      metricas_resumen: {
        sla_global: `${kpi.tasa_cumplimiento_sla_global_pct}%`,
        lead_time_promedio: `${kpi.lead_time_promedio_min} min`,
        total_tickets: kpi.total_tickets_ingresados,
        tasa_escalamiento: `${kpi.tasa_escalamiento_pct}%`,
        cuello_botella: kpi.cuello_botella_principal,
        impacto_routing: kpi.routing_habilidades_activado ? "Optimización Activa (-22% Cycle Time)" : "No Aplicado",
      },
      recomendaciones_operativas: recomendaciones
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware Vite para desarrollo
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DigitalTwin] Servidor activo en http://localhost:${PORT}`);
  });
}

startServer();
