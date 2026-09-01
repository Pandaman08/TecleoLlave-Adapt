# Configuración de Reproducibilidad TECLEOLLAVE-ADAPT

## Versión: 1.0

Todos los parámetros experimentales están centralizados en `backend/app/ml/config.py` → `REPRODUCIBILITY_CONFIG`.

---

## Esquema de Features

```python
{
  "feature_schema_version": "1.0",
  "phrase": "La seguridad protege la información",
  "phrase_length": 32,
  "n_features": 91,
  "feature_order": [
    "hold_times[0..31]",      # 32 valores - por carácter incluyendo espacios
    "latencies[0..30]",       # 31 valores - digraphs consecutivos
    "aggregated[0..27]"       # 28 estadísticas agregadas
  ]
}
```

### Detalle de Features (91 total)

**Hold Times (32):** Tiempo de pulsación por posición en frase
- Índices 0-31 → HT[0] a HT[31]

**Latencias/Digraphs (31):** Transición entre teclas consecutivas
- Índices 32-62 → LT[0] a LT[30] donde LT[i] = KD[i+1] - KU[i]

**Estadísticas Agregadas (28):**
| Índice | Feature | Descripción |
|--------|---------|-------------|
| 63 | total_duration | KU[31] - KD[0] |
| 64 | wpm | Palabras por minuto |
| 65-66 | hold_mean, hold_std | Media/Std hold times |
| 67-68 | latency_mean, latency_std | Media/Std latencias |
| 69-70 | hold_median, hold_iqr | Mediana/IQR hold |
| 71-72 | latency_median, latency_iqr | Mediana/IQR latencias |
| 73-78 | hold_p10/p25/p75/p90, latency_p10/p90 | Percentiles |
| 79 | hold_cv | Coef. variación hold |
| 80 | latency_cv | Coef. variación latency |
| 81-82 | flight_time_mean/std | Tiempo entre keydowns |
| 83 | consistency_score | 1 - outliers/63 |

---

## Algoritmo ML

```python
{
  "algorithm": "RandomForestClassifier",
  "hyperparameters": {
    "n_estimators": 200,
    "max_depth": 10,
    "min_samples_split": 5,
    "min_samples_leaf": 3,
    "max_features": "sqrt",
    "class_weight": "balanced",
    "random_state": 42,
    "n_jobs": -1
  }
}
```

---

## Calibración

```python
{
  "calibration_method": "isotonic",
  "calibration_cv": "prefit"
}
```

Aplicado sobre validation set (20%) tras entrenamiento en train set (60%).

---

## División de Datos

```python
{
  "train_val_test_split": [0.6, 0.2, 0.2],
  "stratify": True,
  "split_random_state": 42,
  "cross_validation": {
    "method": "StratifiedKFold",
    "n_splits": 5,
    "shuffle": True,
    "random_state": 42
  }
}
```

---

## Preprocesamiento

```python
{
  "imputer": "median",
  "scaler": "RobustScaler"
}
```

Fit en train, transform en val/test.

---

## Biometric Score

```python
{
  "score_definition": "Calibrated P(class=legitimate | features) ∈ [0,1]",
  "threshold_allow": 0.85,
  "threshold_challenge": 0.70,
  "threshold_reject": 0.60
}
```

---

## Adaptación

```python
{
  "adaptation": {
    "min_candidate_samples": 10,
    "candidate_window_size": 50,
    "max_far_degradation": 0.0,
    "max_frr_degradation": 0.02,
    "max_eer_degradation": 0.0,
    "min_precision_delta": -0.01,
    "min_recall_delta": -0.01,
    "require_all_constraints": true
  }
}
```

### Criterios de Aceptación Candidato

**Restricciones DURAS (todas obligatorias):**
- M1.FAR ≤ M0.FAR + 0.0
- M1.FRR ≤ M0.FRR + 0.02
- M1.EER ≤ M0.EER + 0.0

**Restricciones SUAVES (todas obligatorias por defecto):**
- M1.Precision ≥ M0.Precision - 0.01
- M1.Recall ≥ M0.Recall - 0.01

---

## Experimento

```python
{
  "experiment": {
    "n_sessions": 30,
    "samples_per_session": 10,
    "impostor_ratio": 0.3,
    "drift_profiles": ["none", "gradual", "abrupt"],
    "random_state": 42
  }
}
```

---

## Versionado

Cada `ModelVersion` y `CandidateModel` almacena:
- `training_config`: Hiperparámetros + preprocesamiento
- `feature_schema`: Nombres y orden de features
- `REPRODUCIBILITY_CONFIG` completo serializado en JSON

Esto garantiza que cualquier modelo puede ser reproducido exactamente.