"""
==============================================================================
MOTOR DE SIMULACIÓN DE EVENTOS DISCRETOS PARA MESA DE AYUDA (DIGITAL TWIN BPS)
==============================================================================
Simulación orientada a eventos con arribos de Poisson no homogéneos, colas M/M/c,
escalamiento multinivel (Triage -> N1 -> N2), gestión de indisponibilidad/pausas
y cálculo de métricas de desempeño (SLA, Lead Time, Cycle Time, Cuellos de Botella).
"""

import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

class DiscreteEventSimulator:
    def __init__(self, config: Dict[str, Any] = None):
        if config is None:
            config = {}
            
        # Parametrización inicial basada en requerimientos BPS
        self.lambda_avg = float(config.get("lambda_poisson", 3.53)) # tickets / hora
        self.n_triage = int(config.get("dotacion_triage", 3))
        self.n_n1 = int(config.get("dotacion_n1", 15))
        self.n_n2 = int(config.get("dotacion_n2", 5))
        
        # Mix de complejidad
        self.mix_simple = float(config.get("pct_mix_simple", 50.0)) / 100.0
        self.mix_medio = float(config.get("pct_mix_medio", 25.0)) / 100.0
        self.mix_complejo = float(config.get("pct_mix_complejo", 25.0)) / 100.0
        
        # Semilla aleatoria para reproducibilidad What-If
        self.seed = int(config.get("semilla_aleatoria", 42))
        random.seed(self.seed)
        
        # Ventana Operativa: 09:00 a 18:00 (540 minutos total), recepción hasta 17:30 (510 minutos)
        self.sim_start_time = datetime(2026, 7, 24, 9, 0, 0)
        self.total_minutes = 540
        self.reception_cutoff_minutes = 510
        
        # SLAs parametrizados (en minutos)
        self.sla_limits = {
            "Simple": 50,
            "Medio": 200,
            "Complejo": 500
        }
        
    def get_unavailability_pct(self, minute_of_day: float) -> float:
        """
        Calcula el % de indisponibilidad/pausas del equipo según la hora de la jornada:
        - 09:00 - 10:59 (min 0 a 119): 5%
        - 11:00 - 11:59 (min 120 a 179): 10%
        - 12:00 - 13:59 (min 180 a 299): 20% (Horario Almuerzo Peak)
        - 14:00 - 18:00 (min 300 a 540): 5%
        """
        if minute_of_day < 120:
            return 0.05
        elif minute_of_day < 180:
            return 0.10
        elif minute_of_day < 300:
            return 0.20
        else:
            return 0.05

    def get_hourly_arrival_multiplier(self, hour: int) -> float:
        """
        Proceso de Poisson No Homogéneo: ajusta la tasa λ según curva tipica de demanda helpdesk.
        Pico matutino (10:00 - 12:00), valle en almuerzo (13:00 - 14:00), pico tarde (15:00 - 16:30).
        """
        multipliers = {
            9: 0.8,   # 09:00 - 10:00
            10: 1.4,  # 10:00 - 11:00 (Pico mañana)
            11: 1.3,  # 11:00 - 12:00
            12: 0.9,  # 12:00 - 13:00 (Iniciando almuerzo)
            13: 0.6,  # 13:00 - 14:00 (Valle almuerzo)
            14: 1.1,  # 14:00 - 15:00
            15: 1.2,  # 15:00 - 16:00 (Pico tarde)
            16: 1.0,  # 16:00 - 17:00
            17: 0.5   # 17:00 - 17:30 (Cierre)
        }
        return multipliers.get(hour, 1.0)

    def run_simulation((self)) -> Dict[str, Any]:
        """
        Ejecuta la simulación completa de eventos discretos para la jornada laboral de 9 horas.
        Returns diccionario con los tickets generados, línea de tiempo de colas y métricas consolidadas.
        """
        current_minute = 0.0
        tickets = []
        ticket_counter = 1
        
        # 1. GENERACIÓN DE ARRIBOS DE TICKETS (Proceso de Poisson No Homogéneo)
        arrival_times = []
        t = 0.0
        while t < self.reception_cutoff_minutes:
            current_hour = 9 + int(t // 60)
            mult = self.get_hourly_arrival_multiplier(current_hour)
            effective_lambda = self.lambda_avg * mult / 60.0 # λ por minuto
            
            # Tiempo entre arribos exponencial
            if effective_lambda > 0:
                inter_arrival = random.expovariate(effective_lambda)
            else:
                inter_arrival = 10.0
                
            t += inter_arrival
            if t <= self.reception_cutoff_minutes:
                arrival_times.append(t)

        # Registro de disponibilidad de analistas
        triage_free_at = [0.0] * self.n_triage
        n1_free_at = [0.0] * self.n_n1
        n2_free_at = [0.0] * self.n_n2
        
        # Contadores de carga y tiempos activos de trabajo
        triage_active_minutes = [0.0] * self.n_triage
        n1_active_minutes = [0.0] * self.n_n1
        n2_active_minutes = [0.0] * self.n_n2
        
        clientes = ["Banco Central", "Retail Global", "Aseguradora Sur", "Telecom Corp", "Minera Andes", "Hospital San Juan", "Logistica Express"]
        
        # 2. PROCESAMIENTO DE TICKETS A TRAVÉS DE LA RED DE ATENCIÓN
        for arr_time in arrival_times:
            ticket_id = f"TCK-{self.sim_start_time.strftime('%Y%m%d')}-{ticket_counter:03d}"
            ticket_counter += 1
            
            cliente = random.choice(clientes)
            ingreso_dt = self.sim_start_time + timedelta(minutes=arr_time)
            
            # -------------------------------------------------------------
            # ETAPA 1: TRIAGE / CLASIFICACIÓN (3 Analistas, Uniform 5-20 min)
            # -------------------------------------------------------------
            # Asignar al primer analista de Triage disponible
            triage_idx = triage_free_at.index(min(triage_free_at))
            triage_start = max(arr_time, triage_free_at[triage_idx])
            
            # Ajuste por indisponibilidad del analista
            unavail_factor = 1.0 + self.get_unavailability_pct(triage_start)
            triage_duration = random.uniform(5.0, 20.0) * unavail_factor
            
            triage_fin = triage_start + triage_duration
            triage_free_at[triage_idx] = triage_fin
            triage_active_minutes[triage_idx] += triage_duration
            
            # Determinación de tipo de ticket según el mix
            r = random.random()
            if r < self.mix_simple:
                tipo_ticket = "Simple"
            elif r < self.mix_simple + self.mix_medio:
                tipo_ticket = "Medio"
            else:
                tipo_ticket = "Complejo"
                
            sla_max = self.sla_limits[tipo_ticket]
            
            # -------------------------------------------------------------
            # ETAPA 2: ANALISTA DOCUMENTAL NIVEL 1 (15 Analistas)
            # -------------------------------------------------------------
            n1_idx = n1_free_at.index(min(n1_free_at))
            n1_start = max(triage_fin, n1_free_at[n1_idx])
            n1_unavail = 1.0 + self.get_unavailability_pct(n1_start)
            
            # Tiempos de atención N1 y probabilidad de escalamiento
            if tipo_ticket == "Simple":
                n1_dur = random.uniform(20.0, 60.0) * n1_unavail
                escalate_prob = 0.05
            elif tipo_ticket == "Medio":
                n1_dur = random.uniform(60.0, 240.0) * n1_unavail
                escalate_prob = 0.10
            else: # Complejo
                n1_dur = random.uniform(300.0, 600.0) * n1_unavail
                escalate_prob = 0.40
                
            escalado = (random.random() < escalate_prob)
            
            # Si se escala a N2, N1 realiza diagnóstico parcial (30% del tiempo estimado)
            if escalado:
                n1_dur_effective = n1_dur * 0.3
            else:
                n1_dur_effective = n1_dur
                
            n1_fin = n1_start + n1_dur_effective
            n1_free_at[n1_idx] = n1_fin
            n1_active_minutes[n1_idx] += n1_dur_effective
            
            # -------------------------------------------------------------
            # ETAPA 3: ANALISTA EXPERTO NIVEL 2 (5 Especialistas si fue escalado)
            # -------------------------------------------------------------
            n2_fin = None
            analista_n2_id = None
            cycle_time = triage_duration + n1_dur_effective
            
            if escalado:
                n2_idx = n2_free_at.index(min(n2_free_at))
                n2_start = max(n1_fin, n2_free_at[n2_idx])
                n2_unavail = 1.0 + self.get_unavailability_pct(n2_start)
                
                if tipo_ticket == "Simple":
                    n2_dur = random.uniform(15.0, 30.0) * n2_unavail
                elif tipo_ticket == "Medio":
                    n2_dur = random.uniform(50.0, 100.0) * n2_unavail
                else:
                    n2_dur = random.uniform(150.0, 320.0) * n2_unavail
                    
                n2_fin = n2_start + n2_dur
                n2_free_at[n2_idx] = n2_fin
                n2_active_minutes[n2_idx] += n2_dur
                analista_n2_id = n2_idx + 19 # Offset ID para N2
                resolucion_fin = n2_fin
                cycle_time += n2_dur
            else:
                resolucion_fin = n1_fin
                
            # Cálculo de Métricas Finales de Lead Time, Espera y SLA
            lead_time = resolucion_fin - arr_time
            queue_wait_time = max(0.0, lead_time - cycle_time)
            cumplimiento_sla = (lead_time <= sla_max)
            
            resolucion_dt = self.sim_start_time + timedelta(minutes=resolucion_fin)
            triage_fin_dt = self.sim_start_time + timedelta(minutes=triage_fin)
            n1_fin_dt = self.sim_start_time + timedelta(minutes=n1_fin)
            n2_fin_dt = (self.sim_start_time + timedelta(minutes=n2_fin)) if n2_fin else None
            
            tickets.append({
                "ticket_id": ticket_id,
                "cliente": cliente,
                "tipo_ticket": tipo_ticket,
                "estado": "Resuelto" if resolucion_fin <= self.total_minutes else "En Proceso",
                "prioridad": "Alta" if tipo_ticket == "Complejo" else ("Normal" if tipo_ticket == "Medio" else "Baja"),
                "timestamp_ingreso": ingreso_dt.isoformat(),
                "timestamp_triage_fin": triage_fin_dt.isoformat(),
                "timestamp_n1_fin": n1_fin_dt.isoformat(),
                "timestamp_n2_fin": n2_fin_dt.isoformat() if n2_fin_dt else None,
                "timestamp_resolucion": resolucion_dt.isoformat(),
                "analista_triage_id": triage_idx + 1,
                "analista_n1_id": n1_idx + 4,
                "analista_n2_id": analista_n2_id,
                "escalado": escalado,
                "sla_limite_min": sla_max,
                "lead_time_min": round(lead_time, 2),
                "cycle_time_min": round(cycle_time, 2),
                "tiempo_espera_cola_min": round(queue_wait_time, 2),
                "cumplimiento_sla": cumplimiento_sla
            })
            
        # 3. CONSOLIDADO DE MÉTRICAS Y KPIs OPERACIONALES
        total_ingresados = len(tickets)
        total_resueltos = sum(1 for t in tickets if t["estado"] == "Resuelto")
        total_escalados = sum(1 for t in tickets if t["escalado"])
        
        sla_cumplidos = sum(1 for t in tickets if t["cumplimiento_sla"])
        tasa_sla_global = (sla_cumplidos / total_ingresados * 100.0) if total_ingresados > 0 else 0.0
        
        # SLA por tipo
        simple_tickets = [t for t in tickets if t["tipo_ticket"] == "Simple"]
        medio_tickets = [t for t in tickets if t["tipo_ticket"] == "Medio"]
        complejo_tickets = [t for t in tickets if t["tipo_ticket"] == "Complejo"]
        
        sla_simple = (sum(1 for t in simple_tickets if t["cumplimiento_sla"]) / len(simple_tickets) * 100.0) if simple_tickets else 0.0
        sla_medio = (sum(1 for t in medio_tickets if t["cumplimiento_sla"]) / len(medio_tickets) * 100.0) if medio_tickets else 0.0
        sla_complejo = (sum(1 for t in complejo_tickets if t["cumplimiento_sla"]) / len(complejo_tickets) * 100.0) if complejo_tickets else 0.0
        
        avg_lead = (sum(t["lead_time_min"] for t in tickets) / total_ingresados) if total_ingresados > 0 else 0.0
        avg_cycle = (sum(t["cycle_time_min"] for t in tickets) / total_ingresados) if total_ingresados > 0 else 0.0
        avg_wait = (sum(t["tiempo_espera_cola_min"] for t in tickets) / total_ingresados) if total_ingresados > 0 else 0.0
        
        # Porcentaje de utilización de recursos (Capacidad vs Horas Trabajo Activo)
        util_triage = (sum(triage_active_minutes) / (self.n_triage * self.total_minutes) * 100.0)
        util_n1 = (sum(n1_active_minutes) / (self.n_n1 * self.total_minutes) * 100.0)
        util_n2 = (sum(n2_active_minutes) / (self.n_n2 * self.total_minutes) * 100.0)
        
        # Detección dinámica del cuello de botella principal
        util_map = {"Triage": util_triage, "Nivel 1 (Documental)": util_n1, "Nivel 2 (Experto)": util_n2}
        cuello_botella = max(util_map, key=util_map.get)
        
        # Perfil de ocupación horaria para gráfico de WIP y colas
        hourly_wip = []
        for h in range(9, 18):
            hour_start_min = (h - 9) * 60
            hour_end_min = hour_start_min + 60
            active_in_hour = sum(1 for t in tickets if (datetime.fromisoformat(t["timestamp_ingreso"]) - self.sim_start_time).total_seconds()/60.0 <= hour_end_min and (datetime.fromisoformat(t["timestamp_resolucion"]) - self.sim_start_time).total_seconds()/60.0 >= hour_start_min)
            hourly_wip.append({
                "hora": f"{h:02d}:00",
                "wip_tickets": active_in_hour,
                "arribos": sum(1 for t in tickets if hour_start_min <= (datetime.fromisoformat(t["timestamp_ingreso"]) - self.sim_start_time).total_seconds()/60.0 < hour_end_min)
            })

        return {
            "resumen_kpi": {
                "total_tickets_ingresados": total_ingresados,
                "total_tickets_resueltos": total_resueltos,
                "total_escalados_n2": total_escalados,
                "tasa_escalamiento_pct": round((total_escalados / total_ingresados * 100.0) if total_ingresados else 0.0, 2),
                "tasa_cumplimiento_sla_global_pct": round(tasa_sla_global, 2),
                "tasa_cumplimiento_sla_simple_pct": round(sla_simple, 2),
                "tasa_cumplimiento_sla_medio_pct": round(sla_medio, 2),
                "tasa_cumplimiento_sla_complejo_pct": round(sla_complejo, 2),
                "lead_time_promedio_min": round(avg_lead, 2),
                "cycle_time_promedio_min": round(avg_cycle, 2),
                "tiempo_espera_promedio_min": round(avg_wait, 2),
                "utilizacion_triage_pct": round(util_triage, 2),
                "utilizacion_n1_pct": round(util_n1, 2),
                "utilizacion_n2_pct": round(util_n2, 2),
                "cuello_botella_principal": cuello_botella
            },
            "curva_wip_horaria": hourly_wip,
            "tickets_detalle": tickets
        }

if __name__ == "__main__":
    sim = DiscreteEventSimulator()
    res = sim.run_simulation()
    print("Métricas de Simulación:", res["resumen_kpi"])
