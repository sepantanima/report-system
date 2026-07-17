-- Brief / spontaneous analysis submissions (تحلیل کوتاه خودجوش)

CREATE TABLE IF NOT EXISTS tbl_analysis_brief_submissions (
  id SERIAL PRIMARY KEY,
  submission_code VARCHAR(50) UNIQUE,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  context_type VARCHAR(50),
  context_id INTEGER,
  tags TEXT,
  author_id INTEGER NOT NULL REFERENCES tbl_users(id),
  status VARCHAR(50) DEFAULT 'Submitted',
  manager_id INTEGER REFERENCES tbl_users(id),
  manager_note TEXT,
  promoted_topic_id INTEGER REFERENCES tbl_analysis_topics(id),
  promoted_assignment_id INTEGER REFERENCES tbl_analysis_assignments(id),
  quality_tag VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brief_submissions_author ON tbl_analysis_brief_submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_status ON tbl_analysis_brief_submissions(status);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_created ON tbl_analysis_brief_submissions(created_at DESC);

CREATE TABLE IF NOT EXISTS tbl_analysis_role_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES tbl_users(id),
  suggested_role VARCHAR(50) NOT NULL DEFAULT 'analyst',
  source_brief_id INTEGER REFERENCES tbl_analysis_brief_submissions(id) ON DELETE SET NULL,
  suggested_by INTEGER NOT NULL REFERENCES tbl_users(id),
  note TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_suggestions_user ON tbl_analysis_role_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_suggestions_status ON tbl_analysis_role_suggestions(status);
