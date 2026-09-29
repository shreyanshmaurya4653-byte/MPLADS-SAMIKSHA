-- ============================================================
-- MPLADS AI MONITORING & ANALYTICS SYSTEM
-- COMPLETE SUPABASE DATABASE
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (

    role_id BIGSERIAL PRIMARY KEY,

    role_name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permissions (

    permission_id BIGSERIAL PRIMARY KEY,

    permission_name VARCHAR(150) NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. ROLE PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (

    role_id BIGINT NOT NULL,

    permission_id BIGINT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permission_role
        FOREIGN KEY (role_id)
        REFERENCES public.roles(role_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permission_permission
        FOREIGN KEY (permission_id)
        REFERENCES public.permissions(permission_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 4. STATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.states (

    state_id BIGSERIAL PRIMARY KEY,

    state_name VARCHAR(150) NOT NULL UNIQUE,

    state_code VARCHAR(20) UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. DISTRICTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.districts (

    district_id BIGSERIAL PRIMARY KEY,

    state_id BIGINT NOT NULL,

    district_name VARCHAR(150) NOT NULL,

    district_code VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_district_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_district_state
        UNIQUE (state_id, district_name)
);


-- ============================================================
-- 6. CONSTITUENCIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.constituencies (

    constituency_id BIGSERIAL PRIMARY KEY,

    state_id BIGINT NOT NULL,

    district_id BIGINT,

    constituency_name VARCHAR(200) NOT NULL,

    constituency_number VARCHAR(50),

    mp_name VARCHAR(200),

    mp_party VARCHAR(150),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_constituency_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_constituency_district
        FOREIGN KEY (district_id)
        REFERENCES public.districts(district_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 7. DEPARTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.departments (

    department_id BIGSERIAL PRIMARY KEY,

    department_name VARCHAR(250) NOT NULL,

    department_code VARCHAR(100) UNIQUE,

    department_level VARCHAR(50)
        CHECK (
            department_level IN (
                'CENTRAL',
                'STATE',
                'DISTRICT',
                'LOCAL'
            )
        ),

    state_id BIGINT,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_department_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 8. IMPLEMENTING AGENCIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.implementing_agencies (

    agency_id BIGSERIAL PRIMARY KEY,

    department_id BIGINT,

    agency_name VARCHAR(250) NOT NULL,

    agency_type VARCHAR(100),

    registration_number VARCHAR(100),

    state_id BIGINT,

    district_id BIGINT,

    contact_email VARCHAR(255),

    contact_phone VARCHAR(30),

    address TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agency_department
        FOREIGN KEY (department_id)
        REFERENCES public.departments(department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_agency_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_agency_district
        FOREIGN KEY (district_id)
        REFERENCES public.districts(district_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 9. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (

    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    full_name VARCHAR(200) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    phone VARCHAR(30),

    role_id BIGINT NOT NULL,

    state_id BIGINT,

    district_id BIGINT,

    constituency_id BIGINT,

    department_id BIGINT,

    employee_id VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES public.roles(role_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_user_district
        FOREIGN KEY (district_id)
        REFERENCES public.districts(district_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_user_constituency
        FOREIGN KEY (constituency_id)
        REFERENCES public.constituencies(constituency_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_user_department
        FOREIGN KEY (department_id)
        REFERENCES public.departments(department_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 10. PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (

    project_id BIGSERIAL PRIMARY KEY,

    project_code VARCHAR(100) NOT NULL UNIQUE,

    project_name VARCHAR(300) NOT NULL,

    description TEXT,

    category VARCHAR(150),

    sub_category VARCHAR(150),

    state_id BIGINT NOT NULL,

    district_id BIGINT NOT NULL,

    constituency_id BIGINT,

    department_id BIGINT,

    agency_id BIGINT,

    implementing_agency_name VARCHAR(250),

    estimated_cost NUMERIC(18,2)
        CHECK (estimated_cost >= 0),

    sanctioned_amount NUMERIC(18,2)
        CHECK (sanctioned_amount >= 0),

    released_amount NUMERIC(18,2)
        DEFAULT 0
        CHECK (released_amount >= 0),

    expenditure_amount NUMERIC(18,2)
        DEFAULT 0
        CHECK (expenditure_amount >= 0),

    start_date DATE,

    expected_completion_date DATE,

    actual_completion_date DATE,

    latitude NUMERIC(10,7),

    longitude NUMERIC(10,7),

    location_description TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED'
        CHECK (
            status IN (
                'PROPOSED',
                'UNDER_REVIEW',
                'SANCTIONED',
                'ONGOING',
                'COMPLETED',
                'DELAYED',
                'CANCELLED',
                'SUSPENDED'
            )
        ),

    source_project_id VARCHAR(150),

    created_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_project_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_project_district
        FOREIGN KEY (district_id)
        REFERENCES public.districts(district_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_project_constituency
        FOREIGN KEY (constituency_id)
        REFERENCES public.constituencies(constituency_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_project_department
        FOREIGN KEY (department_id)
        REFERENCES public.departments(department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_project_agency
        FOREIGN KEY (agency_id)
        REFERENCES public.implementing_agencies(agency_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_project_creator
        FOREIGN KEY (created_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 11. SANCTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sanctions (

    sanction_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    sanction_number VARCHAR(150) UNIQUE,

    sanction_date DATE,

    sanctioned_amount NUMERIC(18,2)
        CHECK (sanctioned_amount >= 0),

    approving_authority VARCHAR(250),

    sanction_type VARCHAR(100),

    revision_number INTEGER DEFAULT 0,

    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED'
        CHECK (
            status IN (
                'PENDING',
                'APPROVED',
                'REJECTED',
                'REVISED',
                'CANCELLED'
            )
        ),

    remarks TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sanction_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 12. CONTRACTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contractors (

    contractor_id BIGSERIAL PRIMARY KEY,

    contractor_name VARCHAR(300) NOT NULL,

    registration_number VARCHAR(150) UNIQUE,

    contractor_type VARCHAR(150),

    pan_number VARCHAR(20),

    gst_number VARCHAR(50),

    state_id BIGINT,

    district_id BIGINT,

    address TEXT,

    email VARCHAR(255),

    phone VARCHAR(30),

    website VARCHAR(500),

    status VARCHAR(50) DEFAULT 'ACTIVE'
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED',
                'BLACKLISTED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_contractor_state
        FOREIGN KEY (state_id)
        REFERENCES public.states(state_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_contractor_district
        FOREIGN KEY (district_id)
        REFERENCES public.districts(district_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 13. CONTRACTOR PERFORMANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contractor_performance (

    performance_id BIGSERIAL PRIMARY KEY,

    contractor_id BIGINT NOT NULL,

    project_id BIGINT,

    completion_status VARCHAR(100),

    delay_days INTEGER DEFAULT 0
        CHECK (delay_days >= 0),

    quality_score NUMERIC(5,2)
        CHECK (
            quality_score BETWEEN 0 AND 100
        ),

    performance_score NUMERIC(5,2)
        CHECK (
            performance_score BETWEEN 0 AND 100
        ),

    cost_variance_percentage NUMERIC(8,2),

    cancelled BOOLEAN DEFAULT FALSE,

    compliance_issues INTEGER DEFAULT 0,

    remarks TEXT,

    evaluation_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_performance_contractor
        FOREIGN KEY (contractor_id)
        REFERENCES public.contractors(contractor_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_performance_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 14. EXPENDITURES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenditures (

    expenditure_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    expenditure_reference VARCHAR(150),

    expenditure_date DATE NOT NULL,

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount >= 0),

    expenditure_category VARCHAR(150),

    description TEXT,

    entered_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_expenditure_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_expenditure_user
        FOREIGN KEY (entered_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 15. PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (

    payment_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    contractor_id BIGINT,

    payment_reference VARCHAR(200) UNIQUE,

    payment_date DATE NOT NULL,

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount >= 0),

    payment_type VARCHAR(100),

    payment_status VARCHAR(50) DEFAULT 'PENDING'
        CHECK (
            payment_status IN (
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'CANCELLED'
            )
        ),

    approved_by UUID,

    entered_by UUID,

    remarks TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_payment_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_contractor
        FOREIGN KEY (contractor_id)
        REFERENCES public.contractors(contractor_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_payment_approver
        FOREIGN KEY (approved_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_payment_creator
        FOREIGN KEY (entered_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 16. PROGRESS UPDATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.progress_updates (

    progress_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    progress_percentage NUMERIC(5,2) NOT NULL
        CHECK (
            progress_percentage BETWEEN 0 AND 100
        ),

    expected_progress_percentage NUMERIC(5,2)
        CHECK (
            expected_progress_percentage BETWEEN 0 AND 100
        ),

    physical_progress_description TEXT,

    financial_progress_percentage NUMERIC(5,2)
        CHECK (
            financial_progress_percentage BETWEEN 0 AND 100
        ),

    update_date DATE NOT NULL,

    updated_by UUID,

    remarks TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_progress_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_progress_user
        FOREIGN KEY (updated_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 17. ASSETS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assets (

    asset_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    asset_code VARCHAR(150) UNIQUE,

    asset_name VARCHAR(300) NOT NULL,

    asset_type VARCHAR(150),

    asset_description TEXT,

    latitude NUMERIC(10,7),

    longitude NUMERIC(10,7),

    installation_date DATE,

    completion_date DATE,

    current_condition VARCHAR(100),

    asset_status VARCHAR(50) DEFAULT 'ACTIVE'
        CHECK (
            asset_status IN (
                'PLANNED',
                'UNDER_CONSTRUCTION',
                'ACTIVE',
                'DAMAGED',
                'INACTIVE',
                'REMOVED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_asset_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 18. DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (

    document_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT,

    sanction_id BIGINT,

    document_type VARCHAR(150) NOT NULL,

    file_name VARCHAR(300) NOT NULL,

    storage_bucket VARCHAR(150),

    storage_path TEXT,

    file_hash VARCHAR(128),

    mime_type VARCHAR(100),

    file_size BIGINT,

    uploaded_by UUID,

    verification_status VARCHAR(50) DEFAULT 'PENDING'
        CHECK (
            verification_status IN (
                'PENDING',
                'VERIFIED',
                'REJECTED'
            )
        ),

    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_document_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_document_sanction
        FOREIGN KEY (sanction_id)
        REFERENCES public.sanctions(sanction_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_document_user
        FOREIGN KEY (uploaded_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 19. DATA SOURCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_sources (

    source_id BIGSERIAL PRIMARY KEY,

    source_name VARCHAR(250) NOT NULL,

    source_type VARCHAR(50) NOT NULL
        CHECK (
            source_type IN (
                'API',
                'CSV',
                'EXCEL',
                'MANUAL',
                'PORTAL',
                'DATABASE'
            )
        ),

    base_url TEXT,

    description TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    last_sync_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 20. DATA INGESTION LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_ingestion_logs (

    ingestion_id BIGSERIAL PRIMARY KEY,

    source_id BIGINT NOT NULL,

    file_name VARCHAR(300),

    ingestion_type VARCHAR(50),

    records_received INTEGER DEFAULT 0,

    records_inserted INTEGER DEFAULT 0,

    records_updated INTEGER DEFAULT 0,

    records_failed INTEGER DEFAULT 0,

    status VARCHAR(50) DEFAULT 'STARTED'
        CHECK (
            status IN (
                'STARTED',
                'COMPLETED',
                'FAILED',
                'PARTIAL'
            )
        ),

    error_message TEXT,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    CONSTRAINT fk_ingestion_source
        FOREIGN KEY (source_id)
        REFERENCES public.data_sources(source_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 21. ANOMALIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anomalies (

    anomaly_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    anomaly_type VARCHAR(150) NOT NULL,

    detection_method VARCHAR(100),

    severity VARCHAR(30) NOT NULL
        CHECK (
            severity IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    detected_value NUMERIC(18,2),

    expected_value NUMERIC(18,2),

    deviation_percentage NUMERIC(10,2),

    description TEXT NOT NULL,

    evidence JSONB,

    model_version VARCHAR(100),

    status VARCHAR(50) DEFAULT 'OPEN'
        CHECK (
            status IN (
                'OPEN',
                'UNDER_REVIEW',
                'CONFIRMED',
                'DISMISSED',
                'RESOLVED'
            )
        ),

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_anomaly_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 22. DUPLICATE MATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.duplicate_matches (

    duplicate_id BIGSERIAL PRIMARY KEY,

    project_id_1 BIGINT NOT NULL,

    project_id_2 BIGINT NOT NULL,

    text_similarity NUMERIC(5,2)
        CHECK (
            text_similarity BETWEEN 0 AND 100
        ),

    semantic_similarity NUMERIC(5,2)
        CHECK (
            semantic_similarity BETWEEN 0 AND 100
        ),

    metadata_similarity NUMERIC(5,2)
        CHECK (
            metadata_similarity BETWEEN 0 AND 100
        ),

    location_similarity NUMERIC(5,2)
        CHECK (
            location_similarity BETWEEN 0 AND 100
        ),

    overall_similarity NUMERIC(5,2)
        CHECK (
            overall_similarity BETWEEN 0 AND 100
        ),

    detection_method VARCHAR(100),

    matching_reasons JSONB,

    status VARCHAR(50) DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'UNDER_REVIEW',
                'CONFIRMED',
                'NOT_DUPLICATE'
            )
        ),

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_duplicate_project_1
        FOREIGN KEY (project_id_1)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_duplicate_project_2
        FOREIGN KEY (project_id_2)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT different_projects
        CHECK (project_id_1 <> project_id_2),

    CONSTRAINT unique_project_pair
        UNIQUE (project_id_1, project_id_2)
);


-- ============================================================
-- 23. RISK RESULTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.risk_results (

    risk_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    risk_score NUMERIC(5,2) NOT NULL
        CHECK (
            risk_score BETWEEN 0 AND 100
        ),

    risk_level VARCHAR(30) NOT NULL
        CHECK (
            risk_level IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    cost_risk NUMERIC(5,2)
        CHECK (cost_risk BETWEEN 0 AND 100),

    delay_risk NUMERIC(5,2)
        CHECK (delay_risk BETWEEN 0 AND 100),

    payment_risk NUMERIC(5,2)
        CHECK (payment_risk BETWEEN 0 AND 100),

    duplicate_risk NUMERIC(5,2)
        CHECK (duplicate_risk BETWEEN 0 AND 100),

    compliance_risk NUMERIC(5,2)
        CHECK (compliance_risk BETWEEN 0 AND 100),

    contractor_risk NUMERIC(5,2)
        CHECK (contractor_risk BETWEEN 0 AND 100),

    progress_risk NUMERIC(5,2)
        CHECK (progress_risk BETWEEN 0 AND 100),

    explanation JSONB,

    model_name VARCHAR(200),

    model_version VARCHAR(100),

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_risk_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 24. COMPLIANCE RESULTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_results (

    compliance_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    rule_code VARCHAR(100) NOT NULL,

    rule_name VARCHAR(250) NOT NULL,

    result VARCHAR(40) NOT NULL
        CHECK (
            result IN (
                'PASS',
                'FAIL',
                'WARNING',
                'NOT_APPLICABLE'
            )
        ),

    expected_value TEXT,

    actual_value TEXT,

    severity VARCHAR(30),

    explanation TEXT,

    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_compliance_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 25. MODEL RUNS
-- Tracks every AI/ML execution.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.model_runs (

    model_run_id BIGSERIAL PRIMARY KEY,

    model_name VARCHAR(200) NOT NULL,

    model_version VARCHAR(100),

    model_type VARCHAR(100),

    dataset_version VARCHAR(100),

    records_processed INTEGER DEFAULT 0,

    anomalies_detected INTEGER DEFAULT 0,

    execution_status VARCHAR(50) DEFAULT 'RUNNING'
        CHECK (
            execution_status IN (
                'RUNNING',
                'COMPLETED',
                'FAILED'
            )
        ),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    error_message TEXT
);


-- ============================================================
-- 26. ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alerts (

    alert_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    anomaly_id BIGINT,

    risk_id BIGINT,

    alert_type VARCHAR(150) NOT NULL,

    severity VARCHAR(30) NOT NULL
        CHECK (
            severity IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    title VARCHAR(300) NOT NULL,

    message TEXT NOT NULL,

    status VARCHAR(50) DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'ACKNOWLEDGED',
                'UNDER_REVIEW',
                'RESOLVED',
                'DISMISSED'
            )
        ),

    assigned_to UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    resolved_at TIMESTAMPTZ,

    CONSTRAINT fk_alert_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_alert_anomaly
        FOREIGN KEY (anomaly_id)
        REFERENCES public.anomalies(anomaly_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_alert_risk
        FOREIGN KEY (risk_id)
        REFERENCES public.risk_results(risk_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_alert_user
        FOREIGN KEY (assigned_to)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 27. VERIFICATION CASES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verification_cases (

    case_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL,

    alert_id BIGINT,

    assigned_to UUID,

    status VARCHAR(60) DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'UNDER_REVIEW',
                'VERIFIED',
                'NO_ISSUE_FOUND',
                'ACTION_REQUIRED',
                'CLOSED'
            )
        ),

    finding TEXT,

    officer_remarks TEXT,

    action_taken TEXT,

    evidence JSONB,

    verification_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_case_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_case_alert
        FOREIGN KEY (alert_id)
        REFERENCES public.alerts(alert_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_case_user
        FOREIGN KEY (assigned_to)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 28. AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (

    audit_id BIGSERIAL PRIMARY KEY,

    user_id UUID,

    action VARCHAR(150) NOT NULL,

    entity_type VARCHAR(100),

    entity_id BIGINT,

    old_data JSONB,

    new_data JSONB,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);
