# TECLEOLLAVE-ADAPT

> **Mecanismo adaptativo de autenticación mediante dinámica de tecleo para reducir la degradación del rendimiento de la biometría conductual ante variaciones del comportamiento del usuario**

Prototipo académico - Curso Seguridad de la Información

---

## 🎯 Contribución Principal

**NO es** un sistema convencional de keystroke dynamics.

**SÍ es** un mecanismo de **adaptación controlada del perfil biométrico**:
1. Modelo actual M0 autentica
2. Muestras legítimas (ALLOW) → pool de candidatos
3. Al alcanzar umbral → entrena candidato M1
4. **Evaluación comparativa estricta** M1 vs M0 en hold-out set
5. **Solo activa M1 si:** FAR no aumenta, FRR/EER no degradan > ε
6. Sino → descarta M1, conserva M0, registra evento

Esto permite comparar experimentalmente: **Modelo Estático vs Modelo Adaptativo**.

---

## 🏗️ Arquitectura

```
Frontend (React + Vite)          Backend (FastAPI)              SQLite
┌─────────────────────┐          ┌─────────────────────┐        ┌─────────┐
│  Captura teclado    │◄────────►│  Auth Service       │◄──────►│ 8 tablas│
│  (keydown/keyup)    │  REST    │  Typing Service     │        └─────────┘
│  Dashboard          │          │  ML Service         │
│                     │          │  Adaptive Service   │
└─────────────────────┘          └─────────────────────┘
```

**Tecnologías:**
- Frontend: React 18 + Vite + Axios
- Backend: FastAPI + SQLAlchemy 2.0 + Pydantic v1
- ML: scikit-learn (RandomForest + CalibratedClassifierCV)
- Auth: JWT + SHA256 (bcrypt incompatible con Python 3.14)
- DB: SQLite (desarrollo)

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Python 3.11+ (3.14 requiere pydantic v1)
- Node.js 18+
- pip, npm

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Windows: copy .env.example .env
python -m app.main
```
Servidor: http://localhost:8000
Healthcheck: http://localhost:8000/api/health
API Docs: http://localhost:8000/dcdocs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

---

## 🎬 Demo Rápida (Automatizada)

```bash
# 1. Generar datos demo completos
python run_demo.py setup

# 2. Ejecutar experimento comparativo
python run_demo.py experiment

# 3. Demo detección impostor
python run_demo.py impostor

# 4. Demo en vivo (requiere 2 terminales)
# Terminal 1:
python run_demo.py serve
# Terminal 2 (frontend/):
npm run dev
```

### ¿Qué genera `setup`?
- Usuario `demo_user` / `demo123456`
- 10 muestras de enrolamiento
- Modelo v1 entrenado
- 12 sesiones de autenticación con deriva gradual
- 1 adaptación exitosa (v1 → v5)
- Métricas en dashboard

---

## 📡 API Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Registro usuario |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/typing/enroll` | Enrolamiento biométrico |
| POST | `/api/typing/authenticate` | Autenticación biométrica |
| POST | `/api/ml/train` | Entrenar modelo |
| POST | `/api/ml/decide` | Score + decisión |
| POST | `/api/adaptive/process-auth-result` | Procesar resultado + adaptación |
| GET | `/api/dashboard/summary/{user_id}` | Resumen usuario |
| GET | `/api/dashboard/models/{user_id}` | Versiones modelo |
| GET | `/api/dashboard/comparison/{user_id}` | Estático vs Adaptativo |
| POST | `/api/experiment/static-vs-adaptive` | Experimento completo |

---

## 🧪 Experimentos

### Ejecutar experimento controlado
```bash
python run_demo.py experiment
```

### Parámetros
| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `n_sessions` | 30 | Sesiones simuladas |
| `samples_per_session` | 10 | Muestras por sesión |
| `impostor_ratio` | 0.3 | Proporción impostores |
| `drift_profile` | gradual | `none` \| `gradual` \| `abrupt` |

### Outputs
- `experiments/results/exp_{id}.json` - Resultados completos
- `experiments/results/exp_{id}.csv` - Listo para análisis

---

## 📊 Dashboard

Accede a http://localhost:5173 tras login para ver:

- **Resumen usuario** + modelo activo
- **Métricas auth** (FAR, FRR, score avg)
- **Serie temporal** score promedio (SVG)
- **Tabla versiones modelo** (activo, auth count, allow rate)
- **Adaptación** (eventos, candidatos, modelo actual)
- **Timeline adaptaciones** (colores por acción)
- **Pool candidatos** (tamaño, muestras, candidato pendiente)
- **Comparación** Estático (v1) vs Adaptativo (último)

---

## 🔬 Detalles Técnicos

### Features (100 deterministas)
| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| Hold Times | 35 | Duración pulsación por posición |
| Latencias | 34 | Transición tecla i → i+1 |
| Agregadas | 31 | Media, std, mediana, IQR, percentiles, CV, flight time, consistencia |

### Modelo ML
- **Algoritmo:** RandomForest (n_estimators=200, max_depth=10)
- **Calibración:** CalibratedClassifierCV (isotonic, cv=5)
- **Preprocesamiento:** RobustScaler + SimpleImputer(median)
- **División:** 60/20/20 stratified (seed=42)

### Criterios Adaptación
| Tipo | Métrica | Límite |
|------|---------|--------|
| Seguridad | FAR | ≤ 0.0 (nunca aumenta) |
| Usabilidad | FRR | ≤ +0.02 |
| Usabilidad | EER | ≤ 0.0 |
| Rendimiento | Precision | ≥ -0.01 |
| Rendimiento | Recall | ≥ -0.01 |

---

## 📁 Estructura del Proyecto

```
tecleollave-adapt/
├── backend/
│   ├── app/
│   │   ├── api/           # 7 routers (health, auth, typing, ml, adaptive, dashboard, experiment)
│   │   ├── models/        # 8 modelos SQLAlchemy
│   │   ├── schemas/       # Dataclasses Pydantic v1
│   │   ├── services/      # 6 servicios de lógica
│   │   ├── ml/            # Pipeline ML (features, model, trainer, predictor, evaluator)
│   │   └── utils/         # Security (hash, JWT)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # TypingCapture
│   │   ├── pages/         # Dashboard, Register, Login
│   │   ├── hooks/         # useTypingCapture
│   │   └── services/      # API client
│   └── package.json
├── experiments/
│   └── results/           # JSON + CSV experimentos
├── demo_setup.py          # Generador datos demo
├── run_demo.py            # Runner principal
├── PRESENTACION.md        # Guión presentación académica
└── README.md
```

---

## 📝 Notas de Desarrollo

### Python 3.14 + Pydantic v1
FastAPI 0.109+ requiere Pydantic v2 (Rust), incompatible con Python 3.14. Solución: **FastAPI 0.68.2 + Pydantic 1.10.13**.

### Schemas como Dataclasses
Para evitar problemas de inferencia de tipos en Pydantic v1, los schemas de request/response usan `@dataclass` en lugar de `BaseModel`.

### Single-Class Training (MVP)
Modelos se entrenan solo con muestras legítimas (clase=1). Métricas FAR/FRR/EER son placeholders. En producción: añadir muestras impostoras.

---

## 📄 Licencia

Proyecto académico - Uso educativo

---

## 👨‍💻 Autor

Proyecto universitario - Curso Seguridad de la Información