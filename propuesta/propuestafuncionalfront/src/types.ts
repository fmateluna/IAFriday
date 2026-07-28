export interface ResumenKPI {
  // 1. Flujo y Productividad
  total_tickets_ingresados: number; // tickets creados
  total_tickets_resueltos: number;  // tickets resueltos
  throughput_tickets_hora: number;  // throughput (tck/hr)
  wip_promedio: number;             // wip promedio
  backlog_final: number;            // backlog de tickets pendientes
  lead_time_promedio_min: number;   // lead time
  cycle_time_promedio_min: number;  // cycle time
  tiempo_espera_promedio_min: number; // tiempo promedio de espera
  tiempo_atencion_promedio_min: number; // tiempo promedio de atención
  utilizacion_triage_pct: number;   // utilización equipo Triage
  utilizacion_n1_pct: number;       // utilización equipo N1
  utilizacion_n2_pct: number;       // utilización equipo N2
  longitud_promedio_cola: number;   // longitud promedio de colas
  total_escalados_n2: number;
  tasa_escalamiento_pct: number;    // % escalamiento N2

  // 2. Calidad
  tasa_cumplimiento_sla_global_pct: number; // cumplimiento SLA
  tasa_cumplimiento_sla_simple_pct: number;
  tasa_cumplimiento_sla_medio_pct: number;
  tasa_cumplimiento_sla_complejo_pct: number;
  resolucion_mismo_dia_pct: number;          // resolución el mismo día
  resolucion_un_dia_habil_pct: number;       // resolución dentro de 1 día hábil (24h)
  tiempo_promedio_simple_min: number;        // tiempo promedio ticket Simple
  tiempo_promedio_medio_min: number;         // tiempo promedio ticket Medio
  tiempo_promedio_complejo_min: number;      // tiempo promedio ticket Complejo

  // 3. Capacidad
  horas_hombre_disponibles: number;  // HH disponibles
  horas_hombre_utilizadas: number;   // HH utilizadas
  saturacion_recursos_pct: number;   // saturación de recursos global
  recurso_critico: string;           // recursos críticos (cuello de botella)
  cuello_botella_principal: string;

  // Metadata de Configuración
  routing_habilidades_activado?: boolean;
  mejora_eficiencia_routing_pct?: number;
  dias_simulados?: number;
  distribucion_atencion_usada?: string;
}

export interface CurvaWIPHoraria {
  hora: string;
  wip_tickets: number;
  arribos: number;
}

export interface TicketDetalle {
  ticket_id: string;
  cliente: string;
  tipo_ticket: 'Simple' | 'Medio' | 'Complejo';
  estado: string;
  prioridad: string;
  timestamp_ingreso: string;
  timestamp_triage_fin: string;
  timestamp_n1_fin: string;
  timestamp_n2_fin: string | null;
  timestamp_resolucion: string;
  analista_triage_id: number;
  analista_n1_id: number;
  analista_n2_id: number | null;
  escalado: boolean;
  sla_limite_min: number;
  lead_time_min: number;
  cycle_time_min: number;
  tiempo_espera_cola_min: number;
  cumplimiento_sla: boolean;
  routing_habilidades_aplicado?: boolean;
}

export interface SimulationState {
  resumen_kpi: ResumenKPI;
  curva_wip_horaria: CurvaWIPHoraria[];
  tickets_muestra: TicketDetalle[];
}

export interface SimulationParams {
  nombre_escenario: string;
  // 1. Horario de operación y días
  hora_inicio_operacion: number; // e.g. 8 (08:00)
  hora_fin_operacion: number;    // e.g. 18 (18:00)
  dias_laborales_semana: number; // e.g. 5, 6, 7
  dias_simulados: number;        // e.g. 1, 5, 20 (1 mes)

  // 2. Horario de recepción de tickets
  hora_inicio_recepcion: number; // e.g. 8 (08:00)
  hora_fin_recepcion: number;    // e.g. 17 (17:00)

  // 3. Dotación por equipo
  dotacion_triage: number;
  dotacion_n1: number;
  dotacion_n2: number;

  // 4. Demanda y Mix de Clientes
  lambda_poisson: number;
  pct_cliente_corporativo: number; // e.g. 50%
  pct_cliente_pyme: number;        // e.g. 30%
  pct_cliente_individual: number;  // e.g. 20%

  // 5. Mix de tickets
  pct_mix_simple: number;
  pct_mix_medio: number;
  pct_mix_complejo: number;

  // 6. Tiempos de atención & Distribución estadística
  distribucion_atencion: 'exponencial' | 'normal' | 'uniforme' | 'gamma';
  cv_distribucion: number; // Coeficiente de Variación (Desviación/Media) e.g. 0.30

  // 7. Niveles de Servicio SLA (minutos)
  sla_simple_min: number;
  sla_medio_min: number;
  sla_complejo_min: number;

  // 8. Probabilidades de Escalamiento a N2
  prob_escalamiento_simple: number; // e.g. 0.05
  prob_escalamiento_medio: number;  // e.g. 0.15
  prob_escalamiento_complejo: number; // e.g. 0.40

  // 9. Perfiles Horarios de Demanda & Indisponibilidad
  perfil_demanda: 'pico_almuerzo' | 'pico_manana' | 'pico_tarde' | 'uniforme_plano';
  factor_indisponibilidad_almuerzo: number; // e.g. 1.25 (25% más lento por descansos)
  hora_inicio_almuerzo: number; // e.g. 12
  hora_fin_almuerzo: number;    // e.g. 14

  // 10. Enrutamiento e Identificación
  semilla_aleatoria: number;
  routing_habilidades_activado?: boolean;
}

export interface ExecutiveReport {
  titulo: string;
  fecha_generacion: string;
  cliente_manager: string;
  dictamen_llm: string;
  puntos_clave: string[];
  metricas_resumen: {
    sla_global: string;
    lead_time_promedio: string;
    total_tickets: number;
    tasa_escalamiento: string;
    cuello_botella: string;
    impacto_routing: string;
  };
  recomendaciones_operativas: string[];
}

export interface TextToSQLResponse {
  pregunta: string;
  sql_query: string;
  columnas: string[];
  filas: Record<string, any>[];
  total_filas: number;
  explicacion: string;
  modelo_utilizado: string;
}
