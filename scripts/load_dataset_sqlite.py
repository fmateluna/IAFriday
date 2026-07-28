#!/usr/bin/env python3
"""
Script de carga de datos desde Excel a SQLite (Standalone / Embebido)
Digital Twin Service Desk - Agente db-architect-sqlite
"""

import sys
import os
import pandas as pd
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "digitaltwin.db")
EXCEL_PATH = os.path.join(BASE_DIR, "Dataset_Simulado_DigitalTwin_5000_Enero_a_24Jul2026.xlsx")
SCHEMA_PATH = os.path.join(BASE_DIR, "init-scripts", "01_schema_sqlite.sql")

def load_sqlite_data():
    print(f"--> Creando/Conectando a base de datos SQLite en: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Aplicar Esquema SQL
    print(f"--> Aplicando esquema desde: {SCHEMA_PATH}")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    cur.executescript(schema_sql)
    conn.commit()

    # 2. Poblar Semilla Maestro (si está vacía)
    cur.execute("SELECT COUNT(*) FROM roles;")
    if cur.fetchone()[0] == 0:
        print("--> Poblando datos maestros/semilla en SQLite...")
        seed_roles = [
            ('TRIAGE', 'Clasificador / Triage', 'Recepción, clasificación, priorización y asignación de tickets'),
            ('NIVEL_1', 'Analista Nivel 1', 'Atención principal, resolución de incidentes simples/medios y escalamiento'),
            ('NIVEL_2', 'Especialista Nivel 2', 'Resolución de casos complejos y escalados de Nivel 1')
        ]
        cur.executemany("INSERT INTO roles (codigo, nombre, descripcion) VALUES (?, ?, ?);", seed_roles)

        seed_clientes = [
            ('A', 'Cliente Segmento A (Enterprise)', 40.00),
            ('B', 'Cliente Segmento B (Corporate)', 30.00),
            ('C', 'Cliente Segmento C (Mid-Market)', 20.00),
            ('D', 'Cliente Segmento D (SMB)', 10.00)
        ]
        cur.executemany("INSERT INTO clientes (codigo, nombre, porcentaje_mix_default) VALUES (?, ?, ?);", seed_clientes)

        seed_tipos = [
            ('Simple', 50.00, 50, 5.00, 20, 60, 15, 30),
            ('Medio', 25.00, 200, 10.00, 60, 240, 50, 100),
            ('Complejo', 25.00, 500, 40.00, 300, 600, 150, 320)
        ]
        cur.executemany("INSERT INTO tipos_ticket (nombre, porcentaje_mix_default, sla_objetivo_min, pct_escalamiento, t_atencion_n1_min, t_atencion_n1_max, t_atencion_n2_min, t_atencion_n2_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?);", seed_tipos)

        seed_franjas = [
            ('09-10', '09:00', '10:00', 95.00, 3.53),
            ('10-11', '10:00', '11:00', 95.00, 3.53),
            ('11-12', '11:00', '12:00', 90.00, 3.53),
            ('12-13', '12:00', '13:00', 80.00, 3.53),
            ('13-14', '13:00', '14:00', 80.00, 3.53),
            ('14-15', '14:00', '15:00', 90.00, 3.53),
            ('15-16', '15:00', '16:00', 95.00, 3.53),
            ('16-17', '16:00', '17:00', 95.00, 3.53),
            ('17-18', '17:00', '18:00', 95.00, 3.53)
        ]
        cur.executemany("INSERT INTO disponibilidad_franjas (franja_horaria, hora_inicio, hora_fin, pct_disponibilidad, lambda_llegada) VALUES (?, ?, ?, ?, ?);", seed_franjas)

        cur.execute("INSERT INTO escenarios (codigo_escenario, nombre, descripcion, dotacion_backlog, dotacion_n1, dotacion_n2, semilla, es_base) VALUES ('ESC_BASE', 'Escenario Base', 'Configuración estándar operacional de 15 analistas N1 y 5 N2', 3, 15, 5, 20260724, 1);")

        seed_metadata = [
            ('tickets', 'ticket_id', 'TEXT', 'Identificador único del ticket', 'TK003166, TK004598'),
            ('tickets', 'cliente', 'TEXT', 'Segmento de cliente emisor', 'A, B, C, D'),
            ('tickets', 'tipo_ticket', 'TEXT', 'Complejidad del ticket', 'Simple, Medio, Complejo'),
            ('tickets', 'sla_cumplido', 'TEXT', 'Indica si se cumplió el tiempo SLA de atención', 'Sí, No'),
            ('tickets', 'tiempo_total_min', 'INTEGER', 'Tiempo total transcurrido desde llegada a cierre (Lead Time en minutos)', '45, 230'),
            ('tickets', 'utilizacion_n1_pct', 'REAL', 'Porcentaje de utilización de analistas N1 al momento de llegada', '85.50, 98.20'),
            ('tickets', 'escenario', 'TEXT', 'Nombre del escenario simulado', 'Escenario Base, Alta Demanda')
        ]
        cur.executemany("INSERT INTO nl2sql_metadata (tabla_nombre, columna_nombre, tipo_dato, descripcion_negocio, ejemplo_valores) VALUES (?, ?, ?, ?, ?);", seed_metadata)

        seed_fewshot = [
            ('¿Cuál es el porcentaje global de cumplimiento de SLA?', "SELECT ROUND(COUNT(CASE WHEN sla_cumplido = 'Sí' THEN 1 END) * 100.0 / COUNT(*), 2) AS pct_cumplimiento_sla FROM tickets;", 'Mide el SLA global en porcentaje'),
            ('¿Cuántos tickets escalaron a Nivel 2 por tipo de ticket?', "SELECT tipo_ticket, COUNT(*) AS total_escalados FROM tickets WHERE escalo = 'Sí' GROUP BY tipo_ticket ORDER BY total_escalados DESC;", 'Cuenta escalamientos a N2 por complejidad'),
            ('¿Cuál es el tiempo de espera promedio en cola por franja horaria?', "SELECT franja_horaria, ROUND(AVG(tiempo_espera_cola_min), 2) AS espera_promedio_min FROM tickets GROUP BY franja_horaria ORDER BY franja_horaria;", 'Muestra cuellos de botella por hora')
        ]
        cur.executemany("INSERT INTO nl2sql_few_shot_examples (pregunta_usuario, sql_query, descripcion) VALUES (?, ?, ?);", seed_fewshot)

        conn.commit()

    # 3. Carga del Excel Dataset
    print(f"--> Leyendo dataset Excel desde: {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"[ERROR] No se encontró el archivo {EXCEL_PATH}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_PATH, sheet_name="Tickets")
    print(f"--> Total de registros leídos desde Excel: {len(df)}")

    records = []
    for _, row in df.iterrows():
        records.append((
            str(row["TicketID"]),
            1, # escenario_id
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

    insert_query = """
    INSERT INTO tickets (
        ticket_id, escenario_id, fecha_hora_llegada, fecha_hora_cierre,
        cliente, tipo_ticket, prioridad, nivel_inicial, analista_n1, escalo,
        analista_n2, tiempo_espera_cola_min, tiempo_atencion_n1_min,
        tiempo_espera_escalamiento_min, tiempo_atencion_n2_min, tiempo_total_min,
        sla_objetivo_min, sla_cumplido, estado, backlog_al_ingreso, wip_al_ingreso,
        utilizacion_n1_pct, utilizacion_n2_pct, lambda_franja, indisponibilidad_pct,
        continua_dia_habil_siguiente, dia_semana, mes, semana_iso, franja_horaria,
        escenario, semilla
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticket_id) DO NOTHING;
    """

    cur.executemany(insert_query, records)
    conn.commit()

    # 4. Calcular KPIs del Escenario Base
    cur.execute("DELETE FROM kpis_escenario WHERE escenario_id = 1;")
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
            ROUND(COUNT(*) / 147.0, 2),
            ROUND(AVG(utilizacion_n1_pct), 2),
            ROUND(AVG(utilizacion_n2_pct), 2)
        FROM tickets;
    """)
    conn.commit()

    # Verificación
    cur.execute("SELECT COUNT(*) FROM tickets;")
    total_db = cur.fetchone()[0]
    cur.execute("SELECT total_tickets, sla_cumplido_pct, lead_time_promedio_min FROM kpis_escenario WHERE escenario_id = 1;")
    kpis = cur.fetchone()

    print(f"[OK] Base de Datos SQLite activada con {total_db} tickets.")
    print(f"[KPIs] Escenario Base: Total Tickets={kpis[0]}, Cumplimiento SLA={kpis[1]}%, Lead Time Promed.={kpis[2]} min.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    load_sqlite_data()
