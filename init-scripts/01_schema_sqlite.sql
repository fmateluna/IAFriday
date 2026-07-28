-- =============================================================================
-- ESQUEMA RELACIONAL SQLITE - DIGITAL TWIN SERVICE DESK
-- Agente: db-architect-sqlite (Soporte Embebido / Standalone)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CATÁLOGOS BASE (Maestros de Operación)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    rol_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS recursos_dotacion (
    recurso_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rol_id INTEGER NOT NULL REFERENCES roles(rol_id),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    activo INTEGER DEFAULT 1,
    fecha_ingreso DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS clientes (
    cliente_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL, -- A, B, C, D
    nombre TEXT NOT NULL,
    porcentaje_mix_default REAL NOT NULL CHECK (porcentaje_mix_default >= 0 AND porcentaje_mix_default <= 100),
    activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tipos_ticket (
    tipo_ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL, -- Simple, Medio, Complejo
    porcentaje_mix_default REAL NOT NULL,
    sla_objetivo_min INTEGER NOT NULL,
    pct_escalamiento REAL NOT NULL,
    t_atencion_n1_min INTEGER NOT NULL,
    t_atencion_n1_max INTEGER NOT NULL,
    t_atencion_n2_min INTEGER NOT NULL,
    t_atencion_n2_max INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS disponibilidad_franjas (
    franja_id INTEGER PRIMARY KEY AUTOINCREMENT,
    franja_horaria TEXT NOT NULL, -- e.g., '09-10', '10-11'
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    pct_disponibilidad REAL NOT NULL DEFAULT 100.00,
    lambda_llegada REAL NOT NULL DEFAULT 3.53
);

-- -----------------------------------------------------------------------------
-- 2. ESCENARIOS DE SIMULACIÓN Y CONFIGURACIÓN VERSIONADA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS escenarios (
    escenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_escenario TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    dotacion_backlog INTEGER NOT NULL DEFAULT 3,
    dotacion_n1 INTEGER NOT NULL DEFAULT 15,
    dotacion_n2 INTEGER NOT NULL DEFAULT 5,
    semilla INTEGER NOT NULL DEFAULT 20260724,
    es_base INTEGER DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS escenario_clientes_mix (
    escenario_id INTEGER NOT NULL REFERENCES escenarios(escenario_id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(cliente_id),
    porcentaje_mix REAL NOT NULL CHECK (porcentaje_mix >= 0 AND porcentaje_mix <= 100),
    PRIMARY KEY (escenario_id, cliente_id)
);

-- -----------------------------------------------------------------------------
-- 3. TICKETS (TRANSACCIONAL / REGISTRO DE SIMULACIÓN Y PRODUCCIÓN)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id TEXT PRIMARY KEY, -- e.g., 'TK003166'
    escenario_id INTEGER REFERENCES escenarios(escenario_id),
    fecha_hora_llegada DATETIME NOT NULL,
    fecha_hora_cierre DATETIME NOT NULL,
    cliente TEXT NOT NULL,
    tipo_ticket TEXT NOT NULL,
    prioridad TEXT NOT NULL,
    nivel_inicial TEXT NOT NULL,
    analista_n1 TEXT NOT NULL,
    escalo TEXT NOT NULL, -- 'Sí' / 'No'
    analista_n2 TEXT,
    tiempo_espera_cola_min INTEGER NOT NULL,
    tiempo_atencion_n1_min INTEGER NOT NULL,
    tiempo_espera_escalamiento_min INTEGER NOT NULL DEFAULT 0,
    tiempo_atencion_n2_min INTEGER NOT NULL DEFAULT 0,
    tiempo_total_min INTEGER NOT NULL,
    sla_objetivo_min INTEGER NOT NULL,
    sla_cumplido TEXT NOT NULL, -- 'Sí' / 'No'
    estado TEXT NOT NULL DEFAULT 'Cerrado',
    backlog_al_ingreso INTEGER NOT NULL,
    wip_al_ingreso INTEGER NOT NULL,
    utilizacion_n1_pct REAL NOT NULL,
    utilizacion_n2_pct REAL NOT NULL,
    lambda_franja REAL NOT NULL,
    indisponibilidad_pct REAL NOT NULL,
    continua_dia_habil_siguiente TEXT NOT NULL,
    dia_semana TEXT NOT NULL,
    mes TEXT NOT NULL,
    semana_iso INTEGER NOT NULL,
    franja_horaria TEXT NOT NULL,
    escenario TEXT NOT NULL DEFAULT 'Escenario Base',
    semilla INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_llegada ON tickets(fecha_hora_llegada);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON tickets(cliente);
CREATE INDEX IF NOT EXISTS idx_tickets_tipo ON tickets(tipo_ticket);
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(sla_cumplido);
CREATE INDEX IF NOT EXISTS idx_tickets_escenario ON tickets(escenario);

-- -----------------------------------------------------------------------------
-- 4. RESULTADOS Y KPIS POR ESCENARIO / CORRIDA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpis_escenario (
    kpi_id INTEGER PRIMARY KEY AUTOINCREMENT,
    escenario_id INTEGER NOT NULL REFERENCES escenarios(escenario_id) ON DELETE CASCADE,
    total_tickets INTEGER NOT NULL,
    sla_cumplido_pct REAL NOT NULL,
    sla_simple_pct REAL NOT NULL,
    sla_medio_pct REAL NOT NULL,
    sla_complejo_pct REAL NOT NULL,
    lead_time_promedio_min REAL NOT NULL,
    espera_n1_promedio_min REAL NOT NULL,
    tasa_escalamiento_pct REAL NOT NULL,
    throughput_diario_promedio REAL NOT NULL,
    utilizacion_n1_promedio_pct REAL NOT NULL,
    utilizacion_n2_promedio_pct REAL NOT NULL,
    fecha_calculo DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. TABLAS DE SOPORTE PARA EL COPILOTO DE IA (NL2SQL)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nl2sql_metadata (
    metadata_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla_nombre TEXT NOT NULL,
    columna_nombre TEXT NOT NULL,
    tipo_dato TEXT NOT NULL,
    descripcion_negocio TEXT NOT NULL,
    ejemplo_valores TEXT
);

CREATE TABLE IF NOT EXISTS nl2sql_few_shot_examples (
    example_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta_usuario TEXT NOT NULL,
    sql_query TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS nl2sql_query_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    pregunta_usuario TEXT NOT NULL,
    sql_generado TEXT NOT NULL,
    ejecucion_exitosa INTEGER NOT NULL,
    error_mensaje TEXT,
    duracion_ms INTEGER
);
