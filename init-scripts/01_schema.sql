-- =============================================================================
-- ESQUEMA RELACIONAL POSTGRESQL - DIGITAL TWIN SERVICE DESK
-- Agente: db-architect-postgres
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. CATÁLOGOS BASE (Maestros de Operación)
-- -----------------------------------------------------------------------------

-- Catálogo de Roles de Recursos
CREATE TABLE roles (
    rol_id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT
);

-- Catálogo de Recursos / Analistas
CREATE TABLE recursos_dotacion (
    recurso_id SERIAL PRIMARY KEY,
    rol_id INT NOT NULL REFERENCES roles(rol_id),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_ingreso DATE DEFAULT CURRENT_DATE
);

-- Catálogo de Clientes
CREATE TABLE clientes (
    cliente_id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL, -- A, B, C, D
    nombre VARCHAR(100) NOT NULL,
    porcentaje_mix_default NUMERIC(5,2) NOT NULL CHECK (porcentaje_mix_default >= 0 AND porcentaje_mix_default <= 100),
    activo BOOLEAN DEFAULT TRUE
);

-- Catálogo de Tipos de Ticket
CREATE TABLE tipos_ticket (
    tipo_ticket_id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Simple, Medio, Complejo
    porcentaje_mix_default NUMERIC(5,2) NOT NULL,
    sla_objetivo_min INT NOT NULL,
    pct_escalamiento NUMERIC(5,2) NOT NULL,
    t_atencion_n1_min INT NOT NULL,
    t_atencion_n1_max INT NOT NULL,
    t_atencion_n2_min INT NOT NULL,
    t_atencion_n2_max INT NOT NULL
);

-- Franjas Horarias y Disponibilidad / Demanda (Poisson λ)
CREATE TABLE disponibilidad_franjas (
    franja_id SERIAL PRIMARY KEY,
    franja_horaria VARCHAR(20) NOT NULL, -- e.g., '09-10', '10-11'
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    pct_disponibilidad NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    lambda_llegada NUMERIC(5,2) NOT NULL DEFAULT 3.53
);

-- -----------------------------------------------------------------------------
-- 2. ESCENARIOS DE SIMULACIÓN Y CONFIGURACIÓN VERSIONADA
-- -----------------------------------------------------------------------------

CREATE TABLE escenarios (
    escenario_id SERIAL PRIMARY KEY,
    codigo_escenario VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    dotacion_backlog INT NOT NULL DEFAULT 3,
    dotacion_n1 INT NOT NULL DEFAULT 15,
    dotacion_n2 INT NOT NULL DEFAULT 5,
    semilla INT NOT NULL DEFAULT 20260724,
    es_base BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE escenario_clientes_mix (
    escenario_id INT NOT NULL REFERENCES escenarios(escenario_id) ON DELETE CASCADE,
    cliente_id INT NOT NULL REFERENCES clientes(cliente_id),
    porcentaje_mix NUMERIC(5,2) NOT NULL CHECK (porcentaje_mix >= 0 AND porcentaje_mix <= 100),
    PRIMARY KEY (escenario_id, cliente_id)
);

-- -----------------------------------------------------------------------------
-- 3. TICKETS (TRANSACCIONAL / REGISTRO DE SIMULACIÓN Y PRODUCCIÓN)
-- -----------------------------------------------------------------------------

CREATE TABLE tickets (
    ticket_id VARCHAR(20) PRIMARY KEY, -- e.g., 'TK003166'
    escenario_id INT REFERENCES escenarios(escenario_id),
    fecha_hora_llegada TIMESTAMP NOT NULL,
    fecha_hora_cierre TIMESTAMP NOT NULL,
    cliente VARCHAR(10) NOT NULL,
    tipo_ticket VARCHAR(20) NOT NULL,
    prioridad VARCHAR(20) NOT NULL,
    nivel_inicial VARCHAR(20) NOT NULL,
    analista_n1 VARCHAR(20) NOT NULL,
    escalo VARCHAR(5) NOT NULL, -- 'Sí' / 'No'
    analista_n2 VARCHAR(20),
    tiempo_espera_cola_min INT NOT NULL,
    tiempo_atencion_n1_min INT NOT NULL,
    tiempo_espera_escalamiento_min INT NOT NULL DEFAULT 0,
    tiempo_atencion_n2_min INT NOT NULL DEFAULT 0,
    tiempo_total_min INT NOT NULL,
    sla_objetivo_min INT NOT NULL,
    sla_cumplido VARCHAR(5) NOT NULL, -- 'Sí' / 'No'
    estado VARCHAR(20) NOT NULL DEFAULT 'Cerrado',
    backlog_al_ingreso INT NOT NULL,
    wip_al_ingreso INT NOT NULL,
    utilizacion_n1_pct NUMERIC(6,2) NOT NULL,
    utilizacion_n2_pct NUMERIC(6,2) NOT NULL,
    lambda_franja NUMERIC(5,2) NOT NULL,
    indisponibilidad_pct NUMERIC(5,2) NOT NULL,
    continua_dia_habil_siguiente VARCHAR(5) NOT NULL,
    dia_semana VARCHAR(15) NOT NULL,
    mes VARCHAR(15) NOT NULL,
    semana_iso INT NOT NULL,
    franja_horaria VARCHAR(20) NOT NULL,
    escenario VARCHAR(50) NOT NULL DEFAULT 'Escenario Base',
    semilla INT NOT NULL
);

CREATE INDEX idx_tickets_llegada ON tickets(fecha_hora_llegada);
CREATE INDEX idx_tickets_cliente ON tickets(cliente);
CREATE INDEX idx_tickets_tipo ON tickets(tipo_ticket);
CREATE INDEX idx_tickets_sla ON tickets(sla_cumplido);
CREATE INDEX idx_tickets_escenario ON tickets(escenario);

-- -----------------------------------------------------------------------------
-- 4. RESULTADOS Y KPIS POR ESCENARIO / CORRIDA
-- -----------------------------------------------------------------------------

CREATE TABLE kpis_escenario (
    kpi_id SERIAL PRIMARY KEY,
    escenario_id INT NOT NULL REFERENCES escenarios(escenario_id) ON DELETE CASCADE,
    total_tickets INT NOT NULL,
    sla_cumplido_pct NUMERIC(5,2) NOT NULL,
    sla_simple_pct NUMERIC(5,2) NOT NULL,
    sla_medio_pct NUMERIC(5,2) NOT NULL,
    sla_complejo_pct NUMERIC(5,2) NOT NULL,
    lead_time_promedio_min NUMERIC(8,2) NOT NULL,
    espera_n1_promedio_min NUMERIC(8,2) NOT NULL,
    tasa_escalamiento_pct NUMERIC(5,2) NOT NULL,
    throughput_diario_promedio NUMERIC(8,2) NOT NULL,
    utilizacion_n1_promedio_pct NUMERIC(5,2) NOT NULL,
    utilizacion_n2_promedio_pct NUMERIC(5,2) NOT NULL,
    fecha_calculo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. TABLAS DE SOPORTE PARA EL COPILOTO DE IA (NL2SQL)
-- -----------------------------------------------------------------------------

-- Metadata de Esquema para el Prompt del LLM
CREATE TABLE nl2sql_metadata (
    metadata_id SERIAL PRIMARY KEY,
    tabla_nombre VARCHAR(50) NOT NULL,
    columna_nombre VARCHAR(50) NOT NULL,
    tipo_dato VARCHAR(30) NOT NULL,
    descripcion_negocio TEXT NOT NULL,
    ejemplo_valores TEXT
);

-- Ejemplos Few-Shot para el Copiloto
CREATE TABLE nl2sql_few_shot_examples (
    example_id SERIAL PRIMARY KEY,
    pregunta_usuario TEXT NOT NULL,
    sql_query TEXT NOT NULL,
    descripcion TEXT
);

-- Logging y Auditoría de Consultas Generadas
CREATE TABLE nl2sql_query_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pregunta_usuario TEXT NOT NULL,
    sql_generado TEXT NOT NULL,
    ejecucion_exitosa BOOLEAN NOT NULL,
    error_mensaje TEXT,
    duracion_ms INT
);
