#!/usr/bin/env python3
"""
Script de carga de datos desde Excel a PostgreSQL
Digital Twin Service Desk - Agente db-architect-postgres
"""

import sys
import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Configuración de Conexión a PostgreSQL (Docker Container)
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "digitaltwin_db")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "postgres_password")

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Dataset_Simulado_DigitalTwin_5000_Enero_a_24Jul2026.xlsx")

def load_data():
    print(f"--> Leyendo dataset Excel desde: {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"[ERROR] No se encontró el archivo {EXCEL_PATH}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_PATH, sheet_name="Tickets")
    print(f"--> Total de registros leídos: {len(df)}")

    # Mapeo y formateo de columnas
    records = []
    for _, row in df.iterrows():
        records.append((
            str(row["TicketID"]),
            1, # escenario_id (Base = 1)
            row["FechaHoraLlegada"].strftime("%Y-%m-%d %H:%M:%S"),
            row["FechaHoraCierre"].strftime("%Y-%m-%d %H:%M:%S"),
            str(row["Cliente"]),
            str(row["TipoTicket"]),
            str(row["Prioridad"]),
            str(row["NivelInicial"]),
            str(row["AnalistaN1"]),
            str(row["Escaló"]),
            str(row["AnalistaN2"]) if pd.notna(row["AnalistaN2"]) else None,
            int(row["TiempoEsperaColaMin"]),
            int(row["TiempoAtencionN1Min"]),
            int(row["TiempoEsperaEscalamientoMin"]),
            int(row["TiempoAtencionN2Min"]),
            int(row["TiempoTotalMin"]),
            int(row["SLAObjetivoMin"]),
            str(row["SLACumplido"]),
            str(row["Estado"]),
            int(row["BacklogAlIngreso"]),
            int(row["WIPAlIngreso"]),
            float(row["UtilizacionN1Pct"]),
            float(row["UtilizacionN2Pct"]),
            float(row["LambdaFranja"]),
            float(row["IndisponibilidadPct"]),
            str(row["ContinuaDiaHabilSiguiente"]),
            str(row["DiaSemana"]),
            str(row["Mes"]),
            int(row["SemanaISO"]),
            str(row["FranjaHoraria"]),
            str(row["Escenario"]),
            int(row["Semilla"])
        ))

    print(f"--> Conectando a PostgreSQL en {DB_HOST}:{DB_PORT}/{DB_NAME}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()

        query = """
        INSERT INTO tickets (
            ticket_id, escenario_id, fecha_hora_llegada, fecha_hora_cierre,
            cliente, tipo_ticket, prioridad, nivel_inicial, analista_n1, escalo,
            analista_n2, tiempo_espera_cola_min, tiempo_atencion_n1_min,
            tiempo_espera_escalamiento_min, tiempo_atencion_n2_min, tiempo_total_min,
            sla_objetivo_min, sla_cumplido, estado, backlog_al_ingreso, wip_al_ingreso,
            utilizacion_n1_pct, utilizacion_n2_pct, lambda_franja, indisponibilidad_pct,
            continua_dia_habil_siguiente, dia_semana, mes, semana_iso, franja_horaria,
            escenario, semilla
        ) VALUES %s
        ON CONFLICT (ticket_id) DO NOTHING;
        """

        execute_values(cur, query, records)
        conn.commit()

        # Calcular y guardar KPIs del escenario base
        cur.execute("""
            INSERT INTO kpis_escenario (
                escenario_id, total_tickets, sla_cumplido_pct, sla_simple_pct,
                sla_medio_pct, sla_complejo_pct, lead_time_promedio_min,
                espera_n1_promedio_min, tasa_escalamiento_pct, throughput_diario_promedio,
                utilizacion_n1_promedio_pct, utilizacion_n2_promedio_pct
            )
            SELECT
                1 AS escenario_id,
                COUNT(*) AS total_tickets,
                ROUND(COUNT(CASE WHEN sla_cumplido = 'Sí' THEN 1 END) * 100.0 / COUNT(*), 2) AS sla_cumplido_pct,
                ROUND(COUNT(CASE WHEN sla_cumplido = 'Sí' AND tipo_ticket = 'Simple' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN tipo_ticket = 'Simple' THEN 1 END), 0), 2),
                ROUND(COUNT(CASE WHEN sla_cumplido = 'Sí' AND tipo_ticket = 'Medio' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN tipo_ticket = 'Medio' THEN 1 END), 0), 2),
                ROUND(COUNT(CASE WHEN sla_cumplido = 'Sí' AND tipo_ticket = 'Complejo' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN tipo_ticket = 'Complejo' THEN 1 END), 0), 2),
                ROUND(AVG(tiempo_total_min), 2),
                ROUND(AVG(tiempo_espera_cola_min), 2),
                ROUND(COUNT(CASE WHEN escalo = 'Sí' THEN 1 END) * 100.0 / COUNT(*), 2),
                ROUND(COUNT(*) / 147.0, 2), -- 147 días hábiles entre Ene y Jul 2026
                ROUND(AVG(utilizacion_n1_pct), 2),
                ROUND(AVG(utilizacion_n2_pct), 2)
            FROM tickets;
        """)
        conn.commit()

        print("[EXITO] ¡5.000 tickets e indicadores de escenario cargados exitosamente en PostgreSQL!")
        cur.close()
        conn.close()

    except Exception as e:
        print(f"[ERROR] Error al cargar los datos en PostgreSQL: {e}")
        sys.exit(1)

if __name__ == "__main__":
    load_data()
