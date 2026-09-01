# Arquitectura TECLEOLLAVE-ADAPT

## Visión General

```
Frontend (React + Vite)
    ↓ HTTPS/JSON
Backend (FastAPI)
    ↓
ML Pipeline (scikit-learn)
    ↓
SQLite
```

## Componentes Principales

### Frontend
- **React 18** + **Vite 5** para desarrollo rápido
- Captura de eventos `keydown`/`keyup` con `performance.now()`
- Envío de timestamps crudos al backend

### Backend
- **FastAPI** para API REST asíncrona
- **SQLAlchemy 2.0** + SQLite para persistencia
- **Pydantic v2** para validación
- **JWT** para autenticación stateless
- **bcrypt** para hash de contraseñas

### ML Pipeline
- **scikit-learn**: RandomForestClassifier
- **CalibratedClassifierCV** (isotonic) para probabilidades calibradas
- **RobustScaler** + imputación mediana
- **joblib** para serialización

### Base de Datos
8 tablas principales:
- `users` - Usuarios y configuración
- `typing_samples` - Muestras brutas + metadatos
- `typing_features` - Vectores de 91 features
- `auth_attempts` - Intentos de autenticación
- `model_versions` - Modelos entrenados + métricas
- `candidate_models` - Modelos en evaluación
- `adaptation_events` - Log de decisiones adaptativas
- `adaptation_configs` - Parámetros por usuario

## Flujo de Datos

1. **Enrolamiento**: Usuario → Frase fija → N muestras → Features → Entrena M0
2. **Autenticación**: Credenciales → Dinámica tecleo → Features → Score → Decisión
3. **Adaptación**: ALLOW → Pool candidato → M1 → Evaluación M1 vs M0 → Activar/Descartar

## Reproducibilidad

Todos los parámetros versionados en `REPRODUCIBILITY_CONFIG`:
- Esquema de features (91 features, orden fijo)
- Hiperparámetros RandomForest
- División train/val/test (60/20/20, stratified, seed=42)
- Calibración isotónica
- Umbrales decisión
- Criterios aceptación candidato