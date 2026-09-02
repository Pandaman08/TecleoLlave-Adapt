# TECLEOLLAVE-ADAPT
### Sistema Inteligente y Adaptativo de Autenticación Biométrica Basado en Dinámica de Tecleo

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Status](https://img.shields.io/badge/Status-Production--Ready%20%2F%20Functional-success.svg?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)]()

---

## 📌 Descripción General

**TecleoLlave-Adapt** es una solución avanzada de ciberseguridad y autenticación continua que implementa **biometría conductual basada en dinámica de tecleo (Keystroke Dynamics)** con un **motor adaptativo en caliente**. 

A diferencia de los sistemas biométricos estáticos tradicionales —que sufren de una rápida degradación del rendimiento por fatiga, cambio de teclado o variaciones naturales del usuario (drift biométrico)—, **TecleoLlave-Adapt** aprende y se re-calibra de forma continua y segura, mitigando la tasa de falsos rechazos (**FRR**) sin comprometer la tasa de falsos aceptos (**FAR**).

---

## ✨ Características Principales

### 🧠 1. Pipeline de Machine Learning Adaptativo
* **Extracción Robusta de Características**: 100+ características deterministas que capturan tiempos de pulsación (*Hold Times*), latencias de transición (*Flight/Inter-key Times*), dígrafos, varianza y consistencia rítmica.
* **Modelo Dinámico ($M_t$) vs. Baseline ($M_0$)**: Algoritmo de clasificación con calibración de probabilidades (`CalibratedClassifierCV` + `RandomForest` / `IsolationForest`).
* **Re-entrenamiento Seguro**: Buffer dinámico de muestras legítimas verificadas con re-entrenamiento controlado y validación estricta en conjunto hold-out antes de promover nuevas versiones de perfil.

### 🛡️ 2. Motor de Decisión Basado en Riesgo (3 Zonas)
* **ACCEPT (Score $\ge \theta_{high}$)**: Acceso biométrico directo transparente.
* **CHALLENGE ($\theta_{low} \le \text{Score} < \theta_{high}$)**: Desafío secundario interactivo mediante autenticación multifactor (**2FA / TOTP**).
* **REJECT (Score $< \theta_{low}$)**: Bloqueo de sesión ante detección de patrón anómalo o intento de suplantación.

### 📊 3. Benchmark Científico CMU Integrado
* Módulo de experimentación formal sobre el estándar de la industria (*CMU Keystroke Dynamics Benchmark Dataset*).
* Evaluación comparativa automática de curvas **FAR, FRR y EER (Equal Error Rate)** demostrando la superioridad del modelo adaptativo.

### 💻 4. Frontend SPA Moderno y Profesional
* Construido con **React 18** y empaquetado ultra-rápido con **Vite**.
* **Visualización de Dinámicas**: Heatmaps interactivos de tiempo de pulsación y latencia por tecla.
* **Dashboard Ejecutivo**: Monitor de métricas en tiempo real, histórico de versiones de modelos y eventos de adaptación.
* **Exportación de Reportes**: Generación instantánea de reportes ejecutivos en **PDF** y datos en **CSV / JSON**.
* **Internacionalización y Accesibilidad**: Soporte multi-idioma (**Español / Inglés**) y temas visuales (**Dark Mode / Light Mode**).

---

## 🏛️ Arquitectura del Sistema

```
                      ┌──────────────────────────────────────────────┐
                      │            Frontend (React 18 + Vite)        │
                      │  • Captura precisa de eventos (KeyDown/Up)   │
                      │  • Heatmaps de Tecleo & Dashboards Analíticos│
                      │  • Modal 2FA / TOTP Interactivo              │
                      └──────────────────────┬───────────────────────┘
                                             │ REST API / JWT
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            Backend (FastAPI Engine)          │
                      ├──────────────────────────────────────────────┤
                      │  • Auth Service (Bcrypt + JWT + 2FA TOTP)    │
                      │  • Typing & Feature Extraction Service       │
                      │  • Adaptive ML Controller (M0 vs Mt)         │
                      │  • CMU Benchmark Service                     │
                      │  • Reports & Export Engine                   │
                      └──────────────────────┬───────────────────────┘
                                             │ ORM
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             Capa de Persistencia             │
                      │  • SQLAlchemy ORM (SQLite / PostgreSQL)      │
                      │  • Perfiles biométricos, Modelos y Logs      │
                      └──────────────────────────────────────────────┘
```

---

## 📁 Estructura del Repositorio

```text
TecleoLlave-Adapt/
├── backend/
│   ├── app/
│   │   ├── api/             # Controladores REST (auth, typing, ml, adaptive, dashboard, cmu_benchmark, reports)
│   │   ├── models/          # Entidades SQLAlchemy (User, TypingSample, KeystrokeModel, AdaptationLog, etc.)
│   │   ├── schemas/         # Validación de datos y contratos Pydantic
│   │   ├── services/        # Lógica de negocio, autenticación, 2FA y reportes
│   │   ├── ml/              # Extracción de características, evaluador y pipelines de entrenamiento
│   │   └── utils/           # Criptografía, generación de tokens y utilidades
│   ├── requirements.txt     # Dependencias Python
│   └── .env.example         # Variables de entorno base
├── frontend/
│   ├── src/
│   │   ├── components/      # Heatmap de tecleo, captura de pulsaciones, modales
│   │   ├── context/         # AuthContext, ThemeContext, i18n
│   │   ├── pages/           # Dashboard, Login, Register, Enrolamiento
│   │   ├── hooks/           # Hook de captura fina useTypingCapture
│   │   └── services/        # Cliente HTTP Axios configurado
│   ├── package.json         # Dependencias Node.js
│   └── vite.config.js       # Configuración de compilación Vite
├── experiments/             # Benchmarks, datasets y resultados (JSON/CSV)
├── run_demo.py              # Script interactivo de ejecución y demostración
├── PRESENTACION.md          # Guía ejecutiva y soporte de presentación
└── README.md                # Documentación principal
```

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
* **Python 3.10+** (recomendado 3.11)
* **Node.js 18+** y **npm**

---

### 1. Configuración del Backend

```bash
# 1. Navegar a la carpeta backend
cd backend

# 2. Crear y activar entorno virtual
# En Linux/macOS:
python -m venv venv && source venv/bin/activate
# En Windows (PowerShell):
python -m venv venv; .\venv\Scripts\Activate.ps1

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Iniciar el servidor FastAPI
uvicorn app.main:app --reload --port 8000
```
* **API Base:** `http://localhost:8000`
* **Swagger Docs interactivo:** `http://localhost:8000/docs`

---

### 2. Configuración del Frontend

```bash
# 1. En una nueva terminal, navegar a la carpeta frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```
* **Aplicación Web:** `http://localhost:5173`

---

### 3. Carga Rápida de Datos Demo

Para explorar la aplicación sin realizar un enrolamiento manual:
1. Abre `http://localhost:5173` en tu navegador.
2. En la pantalla de Login, presiona **"Sembrar Datos Demo"** o ejecuta:
   ```bash
   python run_demo.py setup
   ```
3. Inicia sesión con:
   * **Usuario:** `demo`
   * **Contraseña:** `demo123`
   * **Código 2FA (si aplica):** `123456`

---

## 🧪 Pruebas y Validación del Benchmark CMU

Para ejecutar la validación científica que compara el **Modelo Estático ($M_0$)** frente al **Modelo Adaptativo ($M_t$)**:

1. Ingresa al **Dashboard**.
2. Dirígete a la sección **"Benchmark Científico CMU Keystroke Dynamics"**.
3. Haz clic en **"Ejecutar Benchmark CMU"**.
4. El sistema calculará y desplegará en tiempo real:
   * Reducción porcentual de **FRR** (Falsos Rechazos).
   * Mejora del **EER** global.
   * Total de re-entrenamientos y adaptaciones exitosas.

---

## 🔐 Seguridad y Privacidad

* **Zero Plaintext Storage**: Ninguna contraseña se almacena en texto plano; se utiliza derivación y hashing robusto con sal criptográfica.
* **Privacidad Biométrica**: Las muestras de tecleo no guardan texto sensible fuera del contexto de autenticación; se transforman inmediatamente en vectores estadísticos de diferencias temporales ($HT$, $FT$).
* **Protección contra Inyección y Suplantación**: Validación estricta en esquemas de entrada y aislamiento de perfiles de usuario.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Para más detalles, consulta el archivo `LICENSE`.