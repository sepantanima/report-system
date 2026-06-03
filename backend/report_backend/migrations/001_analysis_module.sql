-- Analysis Module Schema (SRS 1.0 Phase 1)
-- Run against PostgreSQL target database

-- Topics
CREATE TABLE IF NOT EXISTS tbl_analysis_topics (
  id SERIAL PRIMARY KEY,
  topic_code VARCHAR(50) UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  domain VARCHAR(200),
  keywords TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  importance_reason TEXT,
  suggested_deadline DATE,
  creator_id INTEGER REFERENCES tbl_users(id),
  status VARCHAR(50) DEFAULT 'Submitted',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tbl_analysis_topics ADD COLUMN IF NOT EXISTS topic_code VARCHAR(50) UNIQUE;
ALTER TABLE tbl_analysis_topics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Policies
CREATE TABLE IF NOT EXISTS tbl_analysis_policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  scope VARCHAR(20) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES tbl_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_analysis_topic_policies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES tbl_analysis_topics(id) ON DELETE CASCADE,
  policy_id INTEGER REFERENCES tbl_analysis_policies(id) ON DELETE CASCADE,
  UNIQUE(topic_id, policy_id)
);

-- Assignments (Missions)
CREATE TABLE IF NOT EXISTS tbl_analysis_assignments (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES tbl_analysis_topics(id),
  analyst_id INTEGER NOT NULL REFERENCES tbl_users(id),
  mentor_id INTEGER REFERENCES tbl_users(id),
  manager_id INTEGER REFERENCES tbl_users(id),
  deadline DATE,
  priority VARCHAR(20) DEFAULT 'medium',
  guidelines TEXT,
  status VARCHAR(50) DEFAULT 'Assigned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tbl_analysis_assignments ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES tbl_users(id);

-- Analyses (one per assignment)
CREATE TABLE IF NOT EXISTS tbl_analysis_analyses (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL UNIQUE REFERENCES tbl_analysis_assignments(id),
  analyst_id INTEGER NOT NULL REFERENCES tbl_users(id),
  final_version_id INTEGER,
  status VARCHAR(50) DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Versions
CREATE TABLE IF NOT EXISTS tbl_analysis_versions (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER NOT NULL REFERENCES tbl_analysis_analyses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(500),
  content TEXT,
  change_note TEXT,
  status VARCHAR(50) DEFAULT 'Draft',
  is_locked BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP,
  created_by INTEGER REFERENCES tbl_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(analysis_id, version_number)
);

-- Feedbacks
CREATE TABLE IF NOT EXISTS tbl_analysis_feedbacks (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES tbl_analysis_versions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES tbl_users(id),
  parent_id INTEGER REFERENCES tbl_analysis_feedbacks(id),
  feedback_type VARCHAR(50) NOT NULL DEFAULT 'supplementary',
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evaluation criteria
CREATE TABLE IF NOT EXISTS tbl_analysis_criteria (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_fa VARCHAR(200),
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scores
CREATE TABLE IF NOT EXISTS tbl_analysis_scores (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES tbl_analysis_versions(id) ON DELETE CASCADE,
  criteria_id INTEGER NOT NULL REFERENCES tbl_analysis_criteria(id),
  evaluator_id INTEGER NOT NULL REFERENCES tbl_users(id),
  score NUMERIC(5,2) NOT NULL,
  comment TEXT,
  total_score NUMERIC(5,2),
  evaluator_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id, criteria_id, evaluator_id)
);

-- Attachments
CREATE TABLE IF NOT EXISTS tbl_analysis_attachments (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(200),
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES tbl_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status history
CREATE TABLE IF NOT EXISTS tbl_analysis_status_history (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES tbl_users(id),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs
CREATE TABLE IF NOT EXISTS tbl_analysis_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES tbl_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_topics_status ON tbl_analysis_topics(status);
CREATE INDEX IF NOT EXISTS idx_analysis_topics_domain ON tbl_analysis_topics(domain);
CREATE INDEX IF NOT EXISTS idx_analysis_topics_created ON tbl_analysis_topics(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_assignments_analyst ON tbl_analysis_assignments(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analysis_assignments_status ON tbl_analysis_assignments(status);
CREATE INDEX IF NOT EXISTS idx_analysis_assignments_deadline ON tbl_analysis_assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_analysis ON tbl_analysis_versions(analysis_id, version_number);
CREATE INDEX IF NOT EXISTS idx_analysis_feedbacks_version ON tbl_analysis_feedbacks(version_id);
CREATE INDEX IF NOT EXISTS idx_analysis_activity_logs_entity ON tbl_analysis_activity_logs(entity_type, entity_id);

-- Default evaluation criteria (FR-045)
INSERT INTO tbl_analysis_criteria (name, name_fa, weight, max_score, sort_order)
SELECT v.name, v.name_fa, v.weight, 5, v.sort_order
FROM (VALUES
  ('topic_alignment', 'انطباق با موضوع', 1.2, 1),
  ('analysis_depth', 'عمق تحلیل', 1.2, 2),
  ('coherence', 'انسجام و استدلال', 1.0, 3),
  ('writing_quality', 'کیفیت نگارش', 1.0, 4),
  ('policy_compliance', 'رعایت سیاست‌ها', 1.0, 5),
  ('conclusion_quality', 'کیفیت نتیجه‌گیری', 1.0, 6),
  ('accuracy', 'دقت', 1.0, 7),
  ('creativity', 'خلاقیت', 0.8, 8)
) AS v(name, name_fa, weight, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM tbl_analysis_criteria LIMIT 1);
