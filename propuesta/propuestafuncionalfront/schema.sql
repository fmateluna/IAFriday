-- ==============================================================================
-- DIGITAL TWIN OPERACIONAL PARA MESA DE AYUDA (HELP DESK SERVICE)
-- Esquema de Base de Datos PostgreSQL (schema.sql)
-- Arquitectura de Datos BPS, Simulación y Pipeline Text-to-SQL
-- ==============================================================================

-- Eliminación limpia de tablas previas si existen (Modo Desarrollo)
DROP TABLE IF EXISTS metricas_resumen_diario CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS analistas CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS simulaciones_config CASCADE;

-- ------------------------------------------------------------------------------
-- 1. TABLA: roles
-- Define la estructura jerárquica de perfiles operativos en la mesa de servicio.
-- ------------------------------------------------------------------------------
CREATE TABLE roles (
    rol_id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE, -- 'Triage', 'Nivel 1', 'Nivel 2'
    descripcion TEXT,
    nivel_jerarquico INT NOT NULL,           -- 1: Triage, 2: N1, 3: N2
    capacidad_simultanea_defecto INT DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre_rol, descripcion, nivel_jerarquico, capacidad_simultanea_defecto) VALUES
('Triage', 'Recepcion, clasificacion, priorizacion y asignacion inicial de tickets', 1, 1),
('Nivel 1', 'Analista Documental de Resolucion General (Simple, Medio, Complejo)', 2, 1),
('Nivel 2', 'Analista Experto para Escalamiento Tecnico Complejo', 3, 1);

-- ------------------------------------------------------------------------------
-- 2. TABLA: analistas
-- Registro de personal operativo de la mesa de servicio con su estado actual.
-- ------------------------------------------------------------------------------
CREATE TABLE analistas (
    analista_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    rol_id INT NOT NULL REFERENCES roles(rol_id) ON DELETE CASCADE,
    estado VARCHAR(30) DEFAULT 'Disponible', -- 'Disponible', 'Ocupado', 'Pausa', 'Inactivo'
    disponibilidad_pct NUMERIC(5,2) DEFAULT 100.00, -- % de tiempo operativo efectivo
    tickets_atendidos INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed de dotación inicial requerida: 3 Triage, 15 N1, 5 N2
INSERT INTO analistas (nombre, rol_id) VALUES
('Analista Triage 01', 1), ('Analista Triage 02', 1), ('Analista Triage 03', 1),
('Analista N1-01', 2), ('Analista N1-02', 2), ('Analista N1-03', 2), ('Analista N1-04', 2), ('Analista N1-05', 2),
('Analista N1-06', 2), ('Analista N1-07', 2), ('Analista N1-08', 2), ('Analista N1-09', 2), ('Analista N1-10', 2),
('Analista N1-11', 2), ('Analista N1-12', 2), ('Analista N1-13', 2), ('Analista N1-14', 2), ('Analista N1-15', 2),
('Experto N2-01', 3), ('Experto N2-02', 3), ('Experto N2-03', 3), ('Experto N2-04', 3), ('Experto N2-05', 3);

-- ------------------------------------------------------------------------------
-- 3. TABLA: simulaciones_config
-- Almacena la parametrización de escenarios What-If ejecutados por el Gemelo Digital.
-- ------------------------------------------------------------------------------
CREATE TABLE simulaciones_config (
    simulacion_id SERIAL PRIMARY KEY,
    nombre_escenario VARCHAR(120) NOT NULL,
    lambda_poisson NUMERIC(6,2) DEFAULT 3.53,  -- Tasa promedio de llegada (tickets/hora)
    dotacion_triage INT DEFAULT 3,
    dotacion_n1 INT DEFAULT 15,
    dotacion_n2 INT DEFAULT 5,
    pct_mix_simple NUMERIC(5,2) DEFAULT 50.00,
    pct_mix_medio NUMERIC(5,2) DEFAULT 25.00,
    pct_mix_complejo NUMERIC(5,2) DEFAULT 25.00,
    semilla_aleatoria INT DEFAULT 42,
    horario_inicio TIME DEFAULT '09:00:00',
    horario_fin TIME DEFAULT '18:00:00',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO simulaciones_config (nombre_escenario, lambda_poisson, dotacion_triage, dotacion_n1, dotacion_n2)
VALUES ('Baseline Operativo Estandar', 3.53, 3, 15, 5);

-- ------------------------------------------------------------------------------
-- 4. TABLA: tickets
-- Ciclo de vida completo de cada ticket procesado en la simulación de eventos discretos.
-- ------------------------------------------------------------------------------
CREATE TABLE tickets (
    ticket_id VARCHAR(50) PRIMARY KEY, -- Ej: TCK-20260724-001
    simulacion_id INT REFERENCES simulaciones_config(simulacion_id) ON DELETE CASCADE,
    cliente VARCHAR(100) NOT NULL,
    tipo_ticket VARCHAR(20) CHECK (tipo_ticket IN ('Simple', 'Medio', 'Complejo')),
    estado VARCHAR(30) CHECK (estado IN ('Ingresado', 'En Triage', 'En N1', 'Escalado N2', 'Resuelto', 'Cancelado')),
    prioridad VARCHAR(20) DEFAULT 'Normal', -- 'Baja', 'Normal', 'Alta', 'Critica'
    
    -- Tiempos del evento discreto
    timestamp_ingreso TIMESTAMP NOT NULL,
    timestamp_triage_fin TIMESTAMP,
    timestamp_n1_fin TIMESTAMP,
    timestamp_n2_fin TIMESTAMP,
    timestamp_resolucion TIMESTAMP,
    
    -- Asignación de recursos
    analista_triage_id INT REFERENCES analistas(analista_id),
    analista_n1_id INT REFERENCES analistas(analista_id),
    analista_n2_id INT REFERENCES analistas(analista_id),
    
    -- Flags y Métricas operacionales
    escalado BOOLEAN DEFAULT FALSE,
    sla_limite_min INT NOT NULL,              -- Simple: 50m, Medio: 200m, Complejo: 500m
    lead_time_min NUMERIC(10,2),             -- Tiempo total desde ingreso a resolución (incluye esperas)
    cycle_time_min NUMERIC(10,2),            -- Tiempo efectivo de trabajo activo en analistas
    tiempo_espera_cola_min NUMERIC(10,2),    -- Tiempo en colas de espera
    cumplimiento_sla BOOLEAN DEFAULT TRUE,
    
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas agregadas del motor Text-to-SQL
CREATE INDEX idx_tickets_simulacion ON tickets(simulacion_id);
CREATE INDEX idx_tickets_tipo ON tickets(tipo_ticket);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_sla ON tickets(cumplimiento_sla);
CREATE INDEX idx_tickets_ingreso ON tickets(timestamp_ingreso);

-- ------------------------------------------------------------------------------
-- 5. TABLA: metricas_resumen_diario
-- KPIs consolidados por jornada para acelerar analítica y consultas directas del LLM.
-- ------------------------------------------------------------------------------
CREATE TABLE metricas_resumen_diario (
    resumen_id SERIAL PRIMARY KEY,
    simulacion_id INT REFERENCES simulaciones_config(simulacion_id) ON DELETE CASCADE,
    fecha_operacion DATE NOT NULL,
    total_tickets_ingresados INT DEFAULT 0,
    total_tickets_resueltos INT DEFAULT 0,
    total_escalados_n2 INT DEFAULT 0,
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
    cuello_botella_principal VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VISTA DDL: vista_tickets_detallada (para simplificar prompts Text-to-SQL del LLM)
CREATE OR REPLACE VIEW vista_tickets_detallada AS
SELECT 
    t.ticket_id,
    t.simulacion_id,
    s.nombre_escenario,
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
    t.cumplimiento_sla,
    a1.nombre AS nombre_analista_triage,
    a2.nombre AS nombre_analista_n1,
    a3.nombre AS nombre_analista_n2
FROM tickets t
LEFT JOIN simulaciones_config s ON t.simulacion_id = s.simulacion_id
LEFT JOIN analistas a1 ON t.analista_triage_id = a1.analista_id
LEFT JOIN analistas a2 ON t.analista_n1_id = a2.analista_id
LEFT JOIN analistas a3 ON t.analista_n2_id = a3.analista_id;
