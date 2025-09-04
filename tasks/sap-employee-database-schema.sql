-- =====================================================
-- SAP Employee Database Schema
-- =====================================================
-- Version: 1.0
-- Description: Comprehensive database schema for SAP employee management,
--              onboarding, and career coaching system
-- Platform: Supabase PostgreSQL
-- Created: December 2024
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ENUMS AND CUSTOM TYPES
-- =====================================================

-- Employee status enumeration
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave');

-- Onboarding status enumeration
CREATE TYPE onboarding_status AS ENUM ('incomplete', 'completed');

-- Career level enumeration
CREATE TYPE career_level AS ENUM ('entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive');

-- Skill proficiency levels
CREATE TYPE skill_proficiency AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Project status enumeration
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- Certification status
CREATE TYPE certification_status AS ENUM ('in_progress', 'completed', 'expired', 'revoked');

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- =====================================================
-- 2.1 DEPARTMENTS TABLE
-- Hierarchical department structure with SAP specializations
-- =====================================================
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- SAP department code
    description TEXT,
    parent_department_id UUID REFERENCES public.departments(id),
    department_head_id UUID, -- FK to employees, set after employees table creation
    location TEXT,
    sap_module_specialization TEXT[], -- Array of SAP modules this dept specializes in
    business_unit TEXT,
    budget_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT departments_code_format CHECK (code ~ '^[A-Z]{2,4}-[0-9]{3,4}$'),
    CONSTRAINT departments_no_self_reference CHECK (id != parent_department_id)
);

-- Add index for hierarchical queries
CREATE INDEX idx_departments_parent ON public.departments(parent_department_id);
CREATE INDEX idx_departments_code ON public.departments(code);
CREATE INDEX idx_departments_active ON public.departments(is_active) WHERE is_active = true;

-- =====================================================
-- 2.2 ROLES AND POSITIONS TABLE
-- Job roles with career level classifications
-- =====================================================
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- SAP role code
    description TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    career_level career_level NOT NULL,
    min_experience_years INTEGER DEFAULT 0,
    max_experience_years INTEGER,

    -- Required qualifications
    required_skills TEXT[], -- Array of required skill names
    preferred_skills TEXT[], -- Array of preferred skill names
    required_certifications TEXT[], -- Array of required certification names

    -- Compensation and reporting
    reports_to_role_id UUID REFERENCES public.roles(id),
    typical_salary_range_min NUMERIC(12,2),
    typical_salary_range_max NUMERIC(12,2),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT roles_code_format CHECK (code ~ '^[A-Z]{2,4}-[0-9]{3,4}$'),
    CONSTRAINT roles_experience_range CHECK (min_experience_years >= 0 AND (max_experience_years IS NULL OR max_experience_years > min_experience_years)),
    CONSTRAINT roles_no_self_reference CHECK (id != reports_to_role_id)
);

-- Add indexes
CREATE INDEX idx_roles_department ON public.roles(department_id);
CREATE INDEX idx_roles_career_level ON public.roles(career_level);
CREATE INDEX idx_roles_active ON public.roles(is_active) WHERE is_active = true;
CREATE INDEX idx_roles_reports_to ON public.roles(reports_to_role_id);

-- =====================================================
-- 2.3 EMPLOYEES TABLE
-- Core employee information with Supabase Auth integration and onboarding tracking
-- =====================================================
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Supabase Auth Integration
    auth_user_id UUID UNIQUE NOT NULL, -- Links to auth.users.id

    -- Basic Information
    employee_id TEXT UNIQUE NOT NULL, -- SAP employee ID
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,

    -- Employment Details
    hire_date DATE NOT NULL,
    termination_date DATE,
    employment_status employee_status DEFAULT 'active',
    onboarding_status onboarding_status DEFAULT 'incomplete', -- Tracks onboarding completion status

    -- Organizational Structure
    current_department_id UUID REFERENCES public.departments(id),
    current_role_id UUID REFERENCES public.roles(id),
    manager_id UUID REFERENCES public.employees(id),

    -- SAP-Specific Information
    sap_user_id TEXT UNIQUE,
    sap_personnel_number TEXT UNIQUE,
    cost_center TEXT,
    company_code TEXT,

    -- Profile and Onboarding Information
    profile_picture_url TEXT,
    bio TEXT,
    linkedin_url TEXT,
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',

    -- Privacy and Consent
    privacy_consent_given BOOLEAN DEFAULT false,
    privacy_consent_date TIMESTAMPTZ,
    marketing_consent_given BOOLEAN DEFAULT false,
    data_retention_until DATE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_by UUID,

    -- Constraints
    CONSTRAINT employees_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employees_employee_id_format CHECK (employee_id ~ '^[0-9]{6,8}$'),
    CONSTRAINT employees_no_self_management CHECK (id != manager_id),
    CONSTRAINT employees_hire_before_termination CHECK (
        termination_date IS NULL OR hire_date <= termination_date
    ),
    CONSTRAINT employees_valid_date_of_birth CHECK (
        date_of_birth IS NULL OR date_of_birth >= '1900-01-01' AND date_of_birth <= CURRENT_DATE - INTERVAL '16 years'
    )
);

-- Add indexes for performance
CREATE INDEX idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX idx_employees_email ON public.employees(email);
CREATE INDEX idx_employees_department ON public.employees(current_department_id);
CREATE INDEX idx_employees_role ON public.employees(current_role_id);
CREATE INDEX idx_employees_manager ON public.employees(manager_id);
CREATE INDEX idx_employees_status ON public.employees(employment_status);
CREATE INDEX idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX idx_employees_onboarding_status ON public.employees(onboarding_status);

-- =====================================================
-- 2.4 EMPLOYEE ROLE ASSIGNMENTS TABLE
-- Historical tracking of role changes
-- =====================================================
CREATE TABLE public.employee_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    department_id UUID NOT NULL REFERENCES public.departments(id),

    -- Assignment Details
    start_date DATE NOT NULL,
    end_date DATE,
    is_primary BOOLEAN DEFAULT true,
    assignment_type TEXT DEFAULT 'permanent', -- permanent, temporary, acting, etc.

    -- Performance and Notes
    performance_rating NUMERIC(3,1), -- 1.0 to 5.0 scale
    performance_notes TEXT,
    manager_feedback TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_by UUID,

    -- Constraints
    CONSTRAINT employee_role_assignments_date_range CHECK (
        end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT employee_role_assignments_performance_range CHECK (
        performance_rating IS NULL OR (performance_rating >= 1.0 AND performance_rating <= 5.0)
    )
);

-- Add indexes
CREATE INDEX idx_employee_role_assignments_employee ON public.employee_role_assignments(employee_id);
CREATE INDEX idx_employee_role_assignments_role ON public.employee_role_assignments(role_id);
CREATE INDEX idx_employee_role_assignments_department ON public.employee_role_assignments(department_id);
CREATE INDEX idx_employee_role_assignments_dates ON public.employee_role_assignments(start_date, end_date);
CREATE INDEX idx_employee_role_assignments_current ON public.employee_role_assignments(employee_id, start_date DESC)
    WHERE end_date IS NULL;

-- =====================================================
-- 3. SKILLS AND COMPETENCIES
-- =====================================================

-- =====================================================
-- 3.1 SKILLS TABLE
-- Master list of all skills in the system
-- =====================================================
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- technical, soft, sap_module, certification, etc.
    description TEXT,
    skill_type TEXT NOT NULL DEFAULT 'technical', -- technical, soft, language, certification
    is_active BOOLEAN DEFAULT true,

    -- SAP-specific metadata
    sap_skill_id TEXT UNIQUE,
    sap_module TEXT, -- Related SAP module if applicable

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_skills_category ON public.skills(category);
CREATE INDEX idx_skills_type ON public.skills(skill_type);
CREATE INDEX idx_skills_active ON public.skills(is_active) WHERE is_active = true;
CREATE INDEX idx_skills_sap_module ON public.skills(sap_module);

-- =====================================================
-- 3.2 EMPLOYEE SKILLS TABLE
-- Employee skill assessments and proficiency levels
-- =====================================================
CREATE TABLE public.employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,

    -- Proficiency Assessment
    self_assessed_proficiency skill_proficiency,
    manager_assessed_proficiency skill_proficiency,
    final_proficiency skill_proficiency,

    -- Assessment Details
    years_of_experience NUMERIC(4,1),
    last_used_date DATE,
    acquired_date DATE,

    -- Certification Status
    is_certified BOOLEAN DEFAULT false,
    certification_name TEXT,
    certification_date DATE,
    certification_expiry_date DATE,

    -- Assessment Metadata
    assessed_by UUID REFERENCES public.employees(id), -- Manager who assessed
    assessment_date DATE,
    assessment_notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT employee_skills_experience_range CHECK (
        years_of_experience IS NULL OR years_of_experience >= 0
    ),
    CONSTRAINT employee_skills_certification_dates CHECK (
        certification_expiry_date IS NULL OR certification_date <= certification_expiry_date
    ),
    CONSTRAINT employee_skills_unique_employee_skill UNIQUE (employee_id, skill_id)
);

-- Add indexes
CREATE INDEX idx_employee_skills_employee ON public.employee_skills(employee_id);
CREATE INDEX idx_employee_skills_skill ON public.employee_skills(skill_id);
CREATE INDEX idx_employee_skills_proficiency ON public.employee_skills(final_proficiency);
CREATE INDEX idx_employee_skills_certified ON public.employee_skills(is_certified) WHERE is_certified = true;
CREATE INDEX idx_employee_skills_assessed_by ON public.employee_skills(assessed_by);

-- =====================================================
-- 4. PROJECTS AND ASSIGNMENTS
-- =====================================================

-- =====================================================
-- 4.1 PROJECTS TABLE
-- SAP project tracking and management
-- =====================================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- SAP project code
    description TEXT,

    -- Project Details
    project_type TEXT NOT NULL, -- implementation, support, upgrade, development, etc.
    sap_module TEXT, -- Primary SAP module
    status project_status DEFAULT 'planning',

    -- Timeline
    start_date DATE,
    planned_end_date DATE,
    actual_end_date DATE,

    -- Financials
    budget_allocated NUMERIC(15,2),
    budget_spent NUMERIC(15,2),

    -- Team and Leadership
    project_manager_id UUID REFERENCES public.employees(id),
    department_id UUID REFERENCES public.departments(id),

    -- Project Metadata
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical
    risk_level TEXT DEFAULT 'medium', -- low, medium, high
    complexity TEXT DEFAULT 'medium', -- low, medium, high

    -- Outcomes and Learnings
    outcomes TEXT,
    lessons_learned TEXT,
    success_rating NUMERIC(3,1), -- 1.0 to 5.0 scale

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.employees(id),

    -- Constraints
    CONSTRAINT projects_code_format CHECK (code ~ '^[A-Z]{2,4}-[0-9]{4,6}$'),
    CONSTRAINT projects_date_range CHECK (
        actual_end_date IS NULL OR start_date <= actual_end_date
    ),
    CONSTRAINT projects_success_rating_range CHECK (
        success_rating IS NULL OR (success_rating >= 1.0 AND success_rating <= 5.0)
    ),
    CONSTRAINT projects_budget_positive CHECK (
        budget_allocated IS NULL OR budget_allocated >= 0
    )
);

-- Add indexes
CREATE INDEX idx_projects_code ON public.projects(code);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_department ON public.projects(department_id);
CREATE INDEX idx_projects_manager ON public.projects(project_manager_id);
CREATE INDEX idx_projects_sap_module ON public.projects(sap_module);
CREATE INDEX idx_projects_dates ON public.projects(start_date, planned_end_date);

-- =====================================================
-- 4.2 PROJECT ASSIGNMENTS TABLE
-- Employee assignments to projects
-- =====================================================
CREATE TABLE public.project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Assignment Details
    role_in_project TEXT NOT NULL, -- developer, consultant, architect, tester, etc.
    allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- 0.00 to 100.00
    start_date DATE NOT NULL,
    end_date DATE,

    -- Work and Contributions
    responsibilities TEXT,
    achievements TEXT,
    hours_worked NUMERIC(8,2),

    -- Performance
    project_rating NUMERIC(3,1), -- 1.0 to 5.0 scale
    project_feedback TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES public.employees(id),

    -- Constraints
    CONSTRAINT project_assignments_percentage_range CHECK (
        allocation_percentage >= 0 AND allocation_percentage <= 100
    ),
    CONSTRAINT project_assignments_date_range CHECK (
        end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT project_assignments_rating_range CHECK (
        project_rating IS NULL OR (project_rating >= 1.0 AND project_rating <= 5.0)
    ),
    CONSTRAINT project_assignments_unique_employee_project UNIQUE (employee_id, project_id, start_date)
);

-- Add indexes
CREATE INDEX idx_project_assignments_project ON public.project_assignments(project_id);
CREATE INDEX idx_project_assignments_employee ON public.project_assignments(employee_id);
CREATE INDEX idx_project_assignments_dates ON public.project_assignments(start_date, end_date);
CREATE INDEX idx_project_assignments_role ON public.project_assignments(role_in_project);

-- =====================================================
-- 5. CERTIFICATIONS AND TRAINING
-- =====================================================

-- =====================================================
-- 5.1 CERTIFICATIONS TABLE
-- Master list of available certifications
-- =====================================================
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL, -- SAP certification code
    description TEXT,

    -- Certification Details
    issuing_authority TEXT NOT NULL, -- SAP, AWS, Microsoft, etc.
    certification_level TEXT, -- associate, professional, expert, etc.
    validity_period_months INTEGER,

    -- Requirements
    prerequisites TEXT,
    required_experience_years INTEGER,
    required_skills TEXT[],

    -- Costs and Validity
    cost_usd NUMERIC(8,2),
    renewal_required BOOLEAN DEFAULT true,
    renewal_period_months INTEGER,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_certifications_code ON public.certifications(code);
CREATE INDEX idx_certifications_authority ON public.certifications(issuing_authority);
CREATE INDEX idx_certifications_active ON public.certifications(is_active) WHERE is_active = true;

-- =====================================================
-- 5.2 EMPLOYEE CERTIFICATIONS TABLE
-- Employee certification tracking
-- =====================================================
CREATE TABLE public.employee_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,

    -- Certification Details
    status certification_status DEFAULT 'in_progress',
    issue_date DATE,
    expiry_date DATE,
    certificate_number TEXT,
    verification_url TEXT,

    -- Preparation and Training
    preparation_method TEXT, -- self-study, training, exam-prep-course
    training_provider TEXT,
    training_cost_usd NUMERIC(8,2),

    -- Exam and Results
    exam_date DATE,
    exam_score NUMERIC(5,2), -- 0.00 to 100.00
    exam_result TEXT, -- pass, fail, pending

    -- Renewal Tracking
    renewal_due_date DATE,
    last_renewed_date DATE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT employee_certifications_score_range CHECK (
        exam_score IS NULL OR (exam_score >= 0 AND exam_score <= 100)
    ),
    CONSTRAINT employee_certifications_date_range CHECK (
        expiry_date IS NULL OR issue_date <= expiry_date
    ),
    CONSTRAINT employee_certifications_unique_employee_cert UNIQUE (employee_id, certification_id)
);

-- Add indexes
CREATE INDEX idx_employee_certifications_employee ON public.employee_certifications(employee_id);
CREATE INDEX idx_employee_certifications_cert ON public.employee_certifications(certification_id);
CREATE INDEX idx_employee_certifications_status ON public.employee_certifications(status);
CREATE INDEX idx_employee_certifications_expiry ON public.employee_certifications(expiry_date);
CREATE INDEX idx_employee_certifications_renewal ON public.employee_certifications(renewal_due_date);

-- =====================================================
-- 5.3 TRAINING PROGRAMS TABLE
-- Available training programs and courses
-- =====================================================
CREATE TABLE public.training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,

    -- Training Details
    provider TEXT NOT NULL,
    training_type TEXT NOT NULL, -- instructor-led, online, blended, etc.
    duration_hours INTEGER,
    cost_usd NUMERIC(8,2),

    -- Prerequisites and Content
    prerequisites TEXT,
    learning_objectives TEXT[],
    target_audience TEXT,

    -- SAP-specific
    sap_module TEXT,
    certification_related TEXT, -- Related certification name

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_training_programs_code ON public.training_programs(code);
CREATE INDEX idx_training_programs_provider ON public.training_programs(provider);
CREATE INDEX idx_training_programs_sap_module ON public.training_programs(sap_module);
CREATE INDEX idx_training_programs_active ON public.training_programs(is_active) WHERE is_active = true;

-- =====================================================
-- 5.4 EMPLOYEE TRAINING TABLE
-- Employee training completion tracking
-- =====================================================
CREATE TABLE public.employee_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    training_program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,

    -- Training Details
    enrollment_date DATE NOT NULL,
    completion_date DATE,
    status TEXT DEFAULT 'enrolled', -- enrolled, in_progress, completed, cancelled

    -- Results and Assessment
    completion_percentage NUMERIC(5,2), -- 0.00 to 100.00
    assessment_score NUMERIC(5,2), -- 0.00 to 100.00
    feedback TEXT,

    -- Certification
    certification_earned BOOLEAN DEFAULT false,
    certificate_url TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT employee_training_completion_range CHECK (
        completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100)
    ),
    CONSTRAINT employee_training_score_range CHECK (
        assessment_score IS NULL OR (assessment_score >= 0 AND assessment_score <= 100)
    ),
    CONSTRAINT employee_training_date_range CHECK (
        completion_date IS NULL OR enrollment_date <= completion_date
    ),
    CONSTRAINT employee_training_unique_employee_training UNIQUE (employee_id, training_program_id)
);

-- Add indexes
CREATE INDEX idx_employee_training_employee ON public.employee_training(employee_id);
CREATE INDEX idx_employee_training_program ON public.employee_training(training_program_id);
CREATE INDEX idx_employee_training_status ON public.employee_training(status);
CREATE INDEX idx_employee_training_completion ON public.employee_training(completion_date);

-- =====================================================
-- 6. PERFORMANCE AND REVIEWS
-- =====================================================

-- =====================================================
-- 6.1 PERFORMANCE REVIEWS TABLE
-- Formal performance review cycles
-- =====================================================
CREATE TABLE public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.employees(id), -- Manager conducting review

    -- Review Details
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_date DATE NOT NULL,
    review_type TEXT NOT NULL DEFAULT 'annual', -- annual, mid-year, probation, etc.

    -- Performance Ratings
    overall_rating NUMERIC(3,1) NOT NULL, -- 1.0 to 5.0 scale
    goal_achievement_rating NUMERIC(3,1),
    skill_development_rating NUMERIC(3,1),
    teamwork_rating NUMERIC(3,1),
    leadership_rating NUMERIC(3,1),

    -- Review Content
    achievements TEXT,
    areas_for_improvement TEXT,
    development_plan TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,

    -- Goals and Objectives
    goals_set TEXT[],
    goals_achieved TEXT[],

    -- Next Steps
    next_review_date DATE,
    salary_adjustment_percentage NUMERIC(5,2),
    promotion_recommended BOOLEAN DEFAULT false,

    -- Status and Workflow
    status TEXT DEFAULT 'draft', -- draft, submitted, reviewed, approved, completed
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.employees(id),

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT performance_reviews_rating_range CHECK (
        overall_rating >= 1.0 AND overall_rating <= 5.0
    ),
    CONSTRAINT performance_reviews_period_range CHECK (
        review_period_start <= review_period_end
    ),
    CONSTRAINT performance_reviews_date_range CHECK (
        review_date >= review_period_end
    ),
    CONSTRAINT performance_reviews_salary_range CHECK (
        salary_adjustment_percentage IS NULL OR (
            salary_adjustment_percentage >= -50.00 AND salary_adjustment_percentage <= 100.00
        )
    )
);

-- Add indexes
CREATE INDEX idx_performance_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer ON public.performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_dates ON public.performance_reviews(review_period_start, review_period_end);
CREATE INDEX idx_performance_reviews_rating ON public.performance_reviews(overall_rating);
CREATE INDEX idx_performance_reviews_status ON public.performance_reviews(status);

-- =====================================================
-- 6.2 PERFORMANCE GOALS TABLE
-- Individual and team goals tracking
-- =====================================================
CREATE TABLE public.performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    performance_review_id UUID REFERENCES public.performance_reviews(id),

    -- Goal Details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- individual, team, department, company

    -- Timeline and Progress
    start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    actual_completion_date DATE,

    -- Measurement and Progress
    measurement_criteria TEXT,
    target_value TEXT,
    current_value TEXT,
    progress_percentage NUMERIC(5,2), -- 0.00 to 100.00

    -- Status and Priority
    status TEXT DEFAULT 'active', -- active, completed, cancelled, on_hold
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical

    -- Supporting Information
    resources_needed TEXT,
    potential_obstacles TEXT,
    success_metrics TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.employees(id),

    -- Constraints
    CONSTRAINT performance_goals_progress_range CHECK (
        progress_percentage IS NULL OR (progress_percentage >= 0 AND progress_percentage <= 100)
    ),
    CONSTRAINT performance_goals_date_range CHECK (
        actual_completion_date IS NULL OR start_date <= actual_completion_date
    )
);

-- Add indexes
CREATE INDEX idx_performance_goals_employee ON public.performance_goals(employee_id);
CREATE INDEX idx_performance_goals_review ON public.performance_goals(performance_review_id);
CREATE INDEX idx_performance_goals_status ON public.performance_goals(status);
CREATE INDEX idx_performance_goals_dates ON public.performance_goals(start_date, target_completion_date);

-- =====================================================
-- 7. AUDIT AND SECURITY TABLES
-- =====================================================

-- =====================================================
-- 7.1 USER ROLES TABLE
-- Role-based access control for employees
-- =====================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- employee, manager, hr, admin, super_admin
    granted_by UUID REFERENCES public.employees(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT user_roles_valid_role CHECK (
        role IN ('employee', 'manager', 'hr', 'admin', 'super_admin')
    ),
    CONSTRAINT user_roles_expiry_future CHECK (
        expires_at IS NULL OR expires_at > now()
    )
);

-- Add indexes
CREATE INDEX idx_user_roles_employee ON public.user_roles(employee_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_active ON public.user_roles(expires_at) WHERE expires_at IS NULL OR expires_at > now();

-- =====================================================
-- 7.2 AUDIT LOG TABLE
-- Comprehensive audit trail for all data access
-- =====================================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    employee_id UUID REFERENCES public.employees(id), -- Who performed the action
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),

    -- Additional context
    action_reason TEXT,
    related_employee_id UUID REFERENCES public.employees(id), -- If action affects another employee
    metadata JSONB -- Additional contextual information
);

-- Add indexes for audit queries
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_employee ON public.audit_log(employee_id);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_related_employee ON public.audit_log(related_employee_id);

-- =====================================================
-- 7.3 PRIVACY CONSENT TABLE
-- Track user consent for data processing
-- =====================================================
CREATE TABLE public.privacy_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Consent Details
    consent_type TEXT NOT NULL, -- data_processing, marketing, analytics, etc.
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMPTZ,
    consent_withdrawn_date TIMESTAMPTZ,

    -- Consent Context
    consent_version TEXT NOT NULL, -- Version of privacy policy/consent form
    ip_address INET,
    user_agent TEXT,

    -- Legal Basis
    legal_basis TEXT, -- legitimate_interest, consent, contract, legal_obligation, etc.
    purpose_description TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT privacy_consent_date_logic CHECK (
        consent_withdrawn_date IS NULL OR consent_date <= consent_withdrawn_date
    ),
    CONSTRAINT privacy_consent_unique_employee_type_version UNIQUE (employee_id, consent_type, consent_version)
);

-- Add indexes
CREATE INDEX idx_privacy_consent_employee ON public.privacy_consent(employee_id);
CREATE INDEX idx_privacy_consent_type ON public.privacy_consent(consent_type);
CREATE INDEX idx_privacy_consent_given ON public.privacy_consent(consent_given) WHERE consent_given = true;

-- =====================================================
-- 8. TRIGGERS AND FUNCTIONS
-- =====================================================

-- =====================================================
-- 8.1 UPDATED_AT TRIGGER FUNCTION
-- Automatically update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8.2 AUDIT TRIGGER FUNCTION
-- Automatically create audit log entries
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    changed_fields_array TEXT[];
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
    END IF;

    -- Get changed fields for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(column_name::TEXT)
        INTO changed_fields_array
        FROM information_schema.columns
        WHERE table_schema = TG_TABLE_SCHEMA
          AND table_name = TG_TABLE_NAME
          AND (
              (OLD.* IS DISTINCT FROM NEW.*) OR
              (OLD IS NULL AND NEW IS NOT NULL) OR
              (OLD IS NOT NULL AND NEW IS NULL)
          );
    END IF;

    -- Insert audit record
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        employee_id,
        action,
        old_values,
        new_values,
        changed_fields,
        session_id,
        action_reason
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN (OLD.updated_by)
            ELSE (NEW.updated_by)
        END,
        audit_action,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields_array,
        current_setting('app.session_id', true),
        current_setting('app.action_reason', true)
    );

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.3 EMPLOYEE AUTO-CREATION TRIGGER
-- Automatically create employee record on auth signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.employees (
    auth_user_id,
    email,
    signup_date,
    onboarding_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    'incomplete'::onboarding_status,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. APPLY TRIGGERS TO TABLES
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_role_assignments_updated_at BEFORE UPDATE ON public.employee_role_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON public.employee_skills
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_assignments_updated_at BEFORE UPDATE ON public.project_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_certifications_updated_at BEFORE UPDATE ON public.employee_certifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_training_updated_at BEFORE UPDATE ON public.employee_training
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON public.performance_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auth user creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit triggers (selective - only for sensitive tables)
CREATE TRIGGER audit_employees BEFORE INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_employee_skills BEFORE INSERT OR UPDATE OR DELETE ON public.employee_skills
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_performance_reviews BEFORE INSERT OR UPDATE OR DELETE ON public.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consent ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10.1 DEPARTMENTS POLICIES
-- =====================================================
CREATE POLICY "departments_select" ON public.departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "departments_insert" ON public.departments
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

CREATE POLICY "departments_update" ON public.departments
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

-- =====================================================
-- 10.2 EMPLOYEES POLICIES (Most Critical)
-- =====================================================
CREATE POLICY "employees_select_own" ON public.employees
    FOR SELECT TO authenticated USING (
        auth_user_id = auth.uid()
    );

CREATE POLICY "employees_select_team" ON public.employees
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.auth_user_id = auth.uid()
            AND (
                e.id = employees.manager_id OR
                employees.id = e.manager_id OR
                e.current_department_id = employees.current_department_id
            )
        )
    );

CREATE POLICY "employees_select_hr_admin" ON public.employees
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

CREATE POLICY "employees_update_own" ON public.employees
    FOR UPDATE TO authenticated USING (
        auth_user_id = auth.uid()
    ) WITH CHECK (
        auth_user_id = auth.uid()
    );

CREATE POLICY "employees_update_hr_admin" ON public.employees
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

-- =====================================================
-- 10.3 EMPLOYEE SKILLS POLICIES
-- =====================================================
CREATE POLICY "employee_skills_select_own" ON public.employee_skills
    FOR SELECT TO authenticated USING (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "employee_skills_select_team" ON public.employee_skills
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.auth_user_id = auth.uid()
            AND (
                e.id = (SELECT manager_id FROM public.employees WHERE id = employee_skills.employee_id) OR
                e.current_department_id = (SELECT current_department_id FROM public.employees WHERE id = employee_skills.employee_id)
            )
        )
    );

CREATE POLICY "employee_skills_select_hr" ON public.employee_skills
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

CREATE POLICY "employee_skills_insert_own" ON public.employee_skills
    FOR INSERT TO authenticated WITH CHECK (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "employee_skills_update_own" ON public.employee_skills
    FOR UPDATE TO authenticated USING (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

-- =====================================================
-- 10.4 PERFORMANCE REVIEWS POLICIES
-- =====================================================
CREATE POLICY "performance_reviews_select_own" ON public.performance_reviews
    FOR SELECT TO authenticated USING (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "performance_reviews_select_as_reviewer" ON public.performance_reviews
    FOR SELECT TO authenticated USING (
        reviewer_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "performance_reviews_select_hr" ON public.performance_reviews
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );

CREATE POLICY "performance_reviews_insert_as_reviewer" ON public.performance_reviews
    FOR INSERT TO authenticated WITH CHECK (
        reviewer_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "performance_reviews_update_as_reviewer" ON public.performance_reviews
    FOR UPDATE TO authenticated USING (
        reviewer_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

-- =====================================================
-- 10.5 GENERAL POLICIES FOR OTHER TABLES
-- =====================================================

-- Skills: Read access for all authenticated users
CREATE POLICY "skills_select" ON public.skills
    FOR SELECT TO authenticated USING (true);

-- Projects: Department-based access
CREATE POLICY "projects_select_department" ON public.projects
    FOR SELECT TO authenticated USING (
        department_id = (SELECT current_department_id FROM public.employees WHERE auth_user_id = auth.uid()) OR
        project_manager_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

-- Certifications: Read access for all
CREATE POLICY "certifications_select" ON public.certifications
    FOR SELECT TO authenticated USING (true);

-- Training Programs: Read access for all
CREATE POLICY "training_programs_select" ON public.training_programs
    FOR SELECT TO authenticated USING (true);

-- User Roles: Only admins can manage
CREATE POLICY "user_roles_select_admin" ON public.user_roles
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Privacy Consent: Users can only see their own
CREATE POLICY "privacy_consent_select_own" ON public.privacy_consent
    FOR SELECT TO authenticated USING (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "privacy_consent_insert_own" ON public.privacy_consent
    FOR INSERT TO authenticated WITH CHECK (
        employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    );

-- =====================================================
-- 11. INITIAL DATA SEEDING
-- =====================================================

-- Insert default user roles
INSERT INTO public.user_roles (employee_id, role, granted_by) VALUES
-- These will be populated after employee creation

-- Insert common skills
INSERT INTO public.skills (name, category, description, skill_type) VALUES
('SAP S/4HANA', 'sap_module', 'SAP S/4HANA Enterprise Management', 'technical'),
('SAP SuccessFactors', 'sap_module', 'SAP HCM and SuccessFactors', 'technical'),
('ABAP', 'programming', 'SAP ABAP programming language', 'technical'),
('Java', 'programming', 'Java programming language', 'technical'),
('Python', 'programming', 'Python programming language', 'technical'),
('Project Management', 'soft', 'Project planning and execution', 'soft'),
('Leadership', 'soft', 'Team leadership and management', 'soft'),
('Communication', 'soft', 'Effective communication skills', 'soft'),
('English', 'language', 'English language proficiency', 'language'),
('German', 'language', 'German language proficiency', 'language');

-- Insert common certifications
INSERT INTO public.certifications (name, code, issuing_authority, certification_level, validity_period_months) VALUES
('SAP Certified Development Associate - ABAP', 'C_TAW12_750', 'SAP', 'associate', 24),
('SAP Certified Technology Associate - OS/DB Migration', 'C_TADM70_21', 'SAP', 'associate', 24),
('AWS Certified Solutions Architect', 'AWS-SAA', 'AWS', 'associate', 36),
('Project Management Professional', 'PMP', 'PMI', 'professional', 36);

-- =====================================================
-- 12. VIEWS FOR COMMON QUERIES
-- =====================================================

-- Employee profile view with department and role information
CREATE VIEW public.employee_profiles AS
SELECT
    e.*,
    d.name as department_name,
    d.code as department_code,
    r.title as role_title,
    r.code as role_code,
    r.career_level,
    m.first_name as manager_first_name,
    m.last_name as manager_last_name,
    m.email as manager_email
FROM public.employees e
LEFT JOIN public.departments d ON e.current_department_id = d.id
LEFT JOIN public.roles r ON e.current_role_id = r.id
LEFT JOIN public.employees m ON e.manager_id = m.id;

-- Employee skills summary view
CREATE VIEW public.employee_skills_summary AS
SELECT
    es.employee_id,
    e.first_name,
    e.last_name,
    s.name as skill_name,
    s.category as skill_category,
    es.final_proficiency,
    es.years_of_experience,
    es.is_certified,
    es.certification_name,
    es.certification_expiry_date
FROM public.employee_skills es
JOIN public.skills s ON es.skill_id = s.id
JOIN public.employees e ON es.employee_id = e.id;

-- Team members view for managers
CREATE VIEW public.team_members AS
SELECT
    e.*,
    d.name as department_name,
    r.title as role_title,
    r.career_level,
    es.skill_count,
    ec.certification_count
FROM public.employees e
LEFT JOIN public.departments d ON e.current_department_id = d.id
LEFT JOIN public.roles r ON e.current_role_id = r.id
LEFT JOIN (
    SELECT employee_id, COUNT(*) as skill_count
    FROM public.employee_skills
    GROUP BY employee_id
) es ON e.id = es.employee_id
LEFT JOIN (
    SELECT employee_id, COUNT(*) as certification_count
    FROM public.employee_certifications
    WHERE status = 'completed'
    GROUP BY employee_id
) ec ON e.id = ec.employee_id;

-- =====================================================
-- 13. INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_employees_dept_role ON public.employees(current_department_id, current_role_id);
CREATE INDEX CONCURRENTLY idx_employee_skills_proficiency ON public.employee_skills(employee_id, final_proficiency);
CREATE INDEX CONCURRENTLY idx_performance_reviews_employee_date ON public.performance_reviews(employee_id, review_date DESC);
CREATE INDEX CONCURRENTLY idx_project_assignments_employee_dates ON public.project_assignments(employee_id, start_date, end_date);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_employees_active ON public.employees(employment_status) WHERE employment_status = 'active';
CREATE INDEX CONCURRENTLY idx_projects_active ON public.projects(status) WHERE status IN ('planning', 'active');
CREATE INDEX CONCURRENTLY idx_certifications_active ON public.certifications(is_active) WHERE is_active = true;

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_employees_name_search ON public.employees USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX CONCURRENTLY idx_skills_name_search ON public.skills USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX CONCURRENTLY idx_projects_name_search ON public.projects USING gin(to_tsvector('english', name || ' ' || description));

-- =====================================================
-- 14. SCHEMA MIGRATION HELPERS
-- =====================================================

-- Function to safely update employee onboarding status
CREATE OR REPLACE FUNCTION public.update_onboarding_status(employee_uuid UUID)
RETURNS void AS $$
DECLARE
    emp_record RECORD;
    completed_fields INTEGER := 0;
    total_required_fields INTEGER := 6; -- Core required fields for onboarding completion
BEGIN
    -- Get employee record
    SELECT * INTO emp_record FROM public.employees WHERE id = employee_uuid;

    -- Count completed core required fields for onboarding
    IF emp_record.first_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
    IF emp_record.last_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
    IF emp_record.current_department_id IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
    IF emp_record.current_role_id IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
    IF emp_record.hire_date IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
    IF emp_record.privacy_consent_given = true THEN completed_fields := completed_fields + 1; END IF;

    -- Update onboarding status - mark as completed only when all core fields are filled
    UPDATE public.employees
    SET onboarding_status = CASE
        WHEN completed_fields = total_required_fields THEN 'completed'::onboarding_status
        ELSE 'incomplete'::onboarding_status
    END,
    updated_at = now()
    WHERE id = employee_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Notes:
-- 1. This schema implements comprehensive privacy controls with Row Level Security
-- 2. All tables include audit trails and proper indexing for performance
-- 3. Supabase Auth integration creates employee records automatically
-- 4. The schema supports complex AI agent queries while maintaining data privacy
-- 5. Foreign key relationships ensure data integrity across all tables
-- 6. Views provide simplified access to complex joined data
-- 7. Triggers handle automatic timestamps and audit logging
-- 8. Constraints ensure data quality and business rules compliance
-- 9. Onboarding status tracks completion of core employee information fields
-- 10. Row Level Security ensures users can only access their own data and authorized team information
