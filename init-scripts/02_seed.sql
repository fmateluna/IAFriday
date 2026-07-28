-- =============================================================================
-- DATOS SEMILLA / MAESTROS DE OPERACIÓN - DIGITAL TWIN SERVICE DESK
-- Agente: db-architect-postgres
-- =============================================================================

-- 1. Insertar Roles
INSERT INTO roles (codigo, nombre, descripcion) VALUES
('TRIAGE', 'Clasificador / Triage', 'Recepción, clasificación, priorización y asignación de tickets'),
('NIVEL_1', 'Analista Nivel 1', 'Atención principal, resolución de incidentes simples/medios y escalamiento'),
('NIVEL_2', 'Especialista Nivel 2', 'Resolución de casos complejos y escalados de Nivel 1');

-- 2. Insertar Clientes (Mix Inicial 40/30/20/10)
INSERT INTO clientes (codigo, nombre, porcentaje_mix_default) VALUES
('A', 'Cliente Segmento A (Enterprise)', 40.00),
('B', 'Cliente Segmento B (Corporate)', 30.00),
('C', 'Cliente Segmento C (Mid-Market)', 20.00),
('D', 'Cliente Segmento D (SMB)', 10.00);

-- 3. Insertar Tipos de Ticket
INSERT INTO tipos_ticket (nombre, porcentaje_mix_default, sla_objetivo_min, pct_escalamiento, t_atencion_n1_min, t_atencion_n1_max, t_atencion_n2_min, t_atencion_n2_max) VALUES
('Simple', 50.00, 50, 5.00, 20, 60, 15, 30),
('Medio', 25.00, 200, 10.00, 60, 240, 50, 100),
('Complejo', 25.00, 500, 40.00, 300, 600, 150, 320);

-- 4. Insertar Recursos / Analistas N1 (15 analistas)
INSERT INTO recursos_dotacion (rol_id, codigo, nombre) VALUES
(2, 'N1_01', 'Analista N1 01'), (2, 'N1_02', 'Analista N1 02'), (2, 'N1_03', 'Analista N1 03'),
(2, 'N1_04', 'Analista N1 04'), (2, 'N1_05', 'Analista N1 05'), (2, 'N1_06', 'Analista N1 06'),
(2, 'N1_07', 'Analista N1 07'), (2, 'N1_08', 'Analista N1 08'), (2, 'N1_09', 'Analista N1 09'),
(2, 'N1_10', 'Analista N1 10'), (2, 'N1_11', 'Analista N1 11'), (2, 'N1_12', 'Analista N1 12'),
(2, 'N1_13', 'Analista N1 13'), (2, 'N1_14', 'Analista N1 14'), (2, 'N1_15', 'Analista N1 15');

-- 5. Insertar Recursos / Especialistas N2 (5 especialistas)
INSERT INTO recursos_dotacion (rol_id, codigo, nombre) VALUES
(3, 'N2_01', 'Especialista N2 01'), (3, 'N2_02', 'Especialista N2 02'),
(3, 'N2_03', 'Especialista N2 03'), (3, 'N2_04', 'Especialista N2 04'),
(3, 'N2_05', 'Especialista N2 05');

-- 6. Insertar Franjas Horarias Base (09:00 a 18:00)
INSERT INTO disponibilidad_franjas (franja_horaria, hora_inicio, hora_fin, pct_disponibilidad, lambda_llegada) VALUES
('09-10', '09:00', '10:00', 95.00, 3.53),
('10-11', '10:00', '11:00', 95.00, 3.53),
('11-12', '11:00', '12:00', 90.00, 3.53),
('12-13', '12:00', '13:00', 80.00, 3.53),
('13-14', '13:00', '14:00', 80.00, 3.53),
('14-15', '14:00', '15:00', 90.00, 3.53),
('15-16', '15:00', '16:00', 95.00, 3.53),
('16-17', '16:00', '17:00', 95.00, 3.53),
('17-18', '17:00', '18:00', 95.00, 3.53);

-- 7. Insertar Escenario Base
INSERT INTO escenarios (codigo_escenario, nombre, descripcion, dotacion_backlog, dotacion_n1, dotacion_n2, semilla, es_base) VALUES
('ESC_BASE', 'Escenario Base', 'Configuración estándar operacional de 15 analistas N1 y 5 N2', 3, 15, 5, 20260724, TRUE);

-- 8. Insertar Metadata para NL2SQL (LLM Copilot)
INSERT INTO nl2sql_metadata (tabla_nombre, columna_nombre, tipo_dato, descripcion_negocio, ejemplo_valores) VALUES
('tickets', 'ticket_id', 'VARCHAR(20)', 'Identificador único del ticket', 'TK003166, TK004598'),
('tickets', 'cliente', 'VARCHAR(10)', 'Segmento de cliente emisor', 'A, B, C, D'),
('tickets', 'tipo_ticket', 'VARCHAR(20)', 'Complejidad del ticket', 'Simple, Medio, Complejo'),
('tickets', 'sla_cumplido', 'VARCHAR(5)', 'Indica si se cumplió el tiempo SLA de atención', 'Sí, No'),
('tickets', 'tiempo_total_min', 'INT', 'Tiempo total transcurrido desde llegada a cierre (Lead Time en minutos)', '45, 230'),
('tickets', 'utilizacion_n1_pct', 'NUMERIC(6,2)', 'Porcentaje de utilización de analistas N1 al momento de llegada', '85.50, 98.20'),
('tickets', 'escenario', 'VARCHAR(50)', 'Nombre del escenario simulado', 'Escenario Base, Alta Demanda');

-- 9. Insertar Ejemplos Few-Shot para NL2SQL
INSERT INTO nl2sql_few_shot_examples (pregunta_usuario, sql_query, descripcion) VALUES
('¿Cuál es el porcentaje global de cumplimiento de SLA?', 'SELECT ROUND(COUNT(CASE WHEN sla_cumplido = ''Sí'' THEN 1 END) * 100.0 / COUNT(*), 2) AS pct_cumplimiento_sla FROM tickets;', 'Mide el SLA global en porcentaje'),
('¿Cuántos tickets escalaron a Nivel 2 por tipo de ticket?', 'SELECT tipo_ticket, COUNT(*) AS total_escalados FROM tickets WHERE escalo = ''Sí'' GROUP BY tipo_ticket ORDER BY total_escalados DESC;', 'Cuenta escalamientos a N2 por complejidad'),
('¿Cuál es el tiempo de espera promedio en cola por franja horaria?', 'SELECT franja_horaria, ROUND(AVG(tiempo_espera_cola_min), 2) AS espera_promedio_min FROM tickets GROUP BY franja_horaria ORDER BY franja_horaria;', 'Muestra cuellos de botella por hora');
