# Modelo de Datos TECLEOLLAVE-ADAPT

## Entidades

### users
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| username | VARCHAR(50) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| phrase | VARCHAR(200) | NOT NULL |
| created_at | DATETIME | DEFAULT NOW |
| is_active | BOOLEAN | DEFAULT TRUE |
| current_model_version_id | INTEGER | FK → model_versions.id |

### typing_samples
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id, NOT NULL |
| raw_timestamps | JSON | NOT NULL |
| phrase_typed | VARCHAR(200) | NOT NULL |
| source | ENUM | enrollment/auth/update |
| created_at | DATETIME | DEFAULT NOW |
| is_validated | BOOLEAN | DEFAULT FALSE |
| consistency_score | JSON | NULLABLE |
| sample_quality | ENUM | high/medium/low |

### typing_features
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| sample_id | INTEGER | FK → typing_samples.id, UNIQUE |
| feature_vector | JSON | NOT NULL (91 floats) |
| feature_names | JSON | NOT NULL (91 strings) |
| extracted_at | DATETIME | DEFAULT NOW |

### auth_attempts
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id |
| sample_id | INTEGER | FK → typing_samples.id, NULLABLE |
| model_version_id | INTEGER | FK → model_versions.id |
| score | FLOAT | NOT NULL [0,1] |
| decision | ENUM | allow/challenge/reject |
| challenge_passed | BOOLEAN | NULLABLE |
| created_at | DATETIME | DEFAULT NOW |

### model_versions
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id |
| model_path | VARCHAR(500) | NOT NULL |
| training_samples_count | INTEGER | NOT NULL |
| metrics | JSON | NOT NULL (far, frr, eer, precision, recall, f1, accuracy, auc) |
| training_config | JSON | NOT NULL |
| feature_schema | JSON | NOT NULL |
| is_active | BOOLEAN | DEFAULT FALSE |
| created_at | DATETIME | DEFAULT NOW |

### candidate_models
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id |
| model_path | VARCHAR(500) | NOT NULL |
| source_samples | JSON | NOT NULL (array de sample_ids) |
| metrics | JSON | NOT NULL |
| status | ENUM | training/evaluating/accepted/rejected |
| parent_version_id | INTEGER | FK → model_versions.id |
| evaluation_details | JSON | NULLABLE |
| created_at | DATETIME | DEFAULT NOW |
| resolved_at | DATETIME | NULLABLE |

### adaptation_events
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id |
| auth_attempt_id | INTEGER | FK → auth_attempts.id, NULLABLE |
| action | ENUM | candidate_created/evaluating/accepted/rejected/challenge_requested/passed/failed/sample_enqueued |
| candidate_model_id | INTEGER | FK → candidate_models.id, NULLABLE |
| old_model_version_id | INTEGER | FK → model_versions.id, NULLABLE |
| new_model_version_id | INTEGER | FK → model_versions.id, NULLABLE |
| reason | TEXT | NULLABLE |
| metrics_comparison | JSON | NULLABLE |
| created_at | DATETIME | DEFAULT NOW |

### adaptation_configs
| Campo | Tipo | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, Auto |
| user_id | INTEGER | FK → users.id, UNIQUE |
| threshold_allow | FLOAT | DEFAULT 0.85 |
| threshold_challenge | FLOAT | DEFAULT 0.70 |
| threshold_reject | FLOAT | DEFAULT 0.60 |
| min_candidate_samples | INTEGER | DEFAULT 10 |
| candidate_window_size | INTEGER | DEFAULT 50 |
| max_far_degradation | FLOAT | DEFAULT 0.0 |
| max_frr_degradation | FLOAT | DEFAULT 0.02 |
| max_eer_degradation | FLOAT | DEFAULT 0.0 |
| min_precision_delta | FLOAT | DEFAULT -0.01 |
| min_recall_delta | FLOAT | DEFAULT -0.01 |
| require_all_constraints | BOOLEAN | DEFAULT TRUE |
| created_at | DATETIME | DEFAULT NOW |
| updated_at | DATETIME | DEFAULT NOW ON UPDATE |

## Relaciones

```
users 1───N typing_samples
users 1───N auth_attempts
users 1───N model_versions
users 1───N candidate_models
users 1───N adaptation_events
users 1───1 adaptation_configs

typing_samples 1───1 typing_features
typing_samples 1───N auth_attempts

model_versions 1───N auth_attempts
model_versions 1───N candidate_models (parent)

candidate_models N───1 model_versions (parent)

auth_attempts 1───N adaptation_events
```