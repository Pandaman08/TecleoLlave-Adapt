# TECLEOLLAVE-ADAPT
### Sistema Inteligente y Adaptativo de Autenticación Biométrica Basado en Dinámica de Tecleo

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-33%20Passed%20%2F%200%20Failed-brightgreen.svg?style=flat-square)]()
[![Status](https://img.shields.io/badge/Status-Production--Hardened-success.svg?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)]()

---

## 📌 1. Descripción General

**TECLEOLLAVE-ADAPT** es una plataforma integral de ciberseguridad, investigación y autenticación continua que implementa **biometría conductual basada en dinámica de tecleo (Keystroke Dynamics)** acoplada a un **motor adaptativo en caliente (Online Continuous Adaptation Engine)** con defensas anti-envenenamiento y gobernanza de modelos.

A diferencia de los esquemas biométricos estáticos tradicionales —cuyo rendimiento decae inevitablemente con el tiempo debido a fatiga, estrés, aprendizaje de velocidad o cambio de teclado (*concept / biometric drift*)—, **TECLEOLLAVE-ADAPT** evoluciona de manera segura y controlada junto al usuario. El sistema optimiza la tasa de falsos rechazos (**FRR**, preservando la usabilidad) garantizando matemáticamente que la tasa de falsos accesos (**FAR**, seguridad) **nunca aumente**.

El sistema integra dos aplicaciones en una sola plataforma:
1. **Aula Virtual y Entorno Gamificado (Rol `user`)**: Espacio amigable donde estudiantes y usuarios interactúan con juegos educativos y actividades guiadas, permitiendo la recolección natural y no estresante de patrones biométricos.
2. **Centro de Control e Investigación Forense (Rol `admin`)**: Dashboard avanzado para científicos de datos y administradores de seguridad con monitoreo de telemetría en tiempo real, mapas de calor, rollback de modelos, análisis de deriva y generación de reportes.

---

## 🏛️ 2. Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite)                      │
│                                                                        │
│   ┌──────────────────────────────┐    ┌────────────────────────────┐   │
│   │   Aula Virtual (Usuarios)    │    │  Panel Admin/Investigación │   │
│   │ • Actividades de Escritura   │    │ • Telemetría y ROC / EER   │   │
│   │ • Juego Mario 30 (Arcade)    │    │ • Heatmap de Pulsaciones   │   │
│   │ • Juego Ajedrez Táctico      │    │ • Comparador M0 vs M1      │   │
│   │ • Perfil Biométrico Estudiante│   │ • Auditoría & Rollback     │   │
│   └──────────────┬───────────────┘    └─────────────┬──────────────┘   │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │  Eventos keydown/keyup (µs)      │  REST API / JWT
                   ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI Async)                        │
│                                                                        │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│   │   Typing Service    │  │     ML Service      │  │ Adaptive Svc │   │
│   │ • 100 Features Extr.│  │ • RandomForest      │  │ • Sliding Pool│  │
│   │ • Hold / Digraphs   │  │ • RobustScaler      │  │ • Eval M0/M1 │   │
│   │ • Consistencia/Stats│  │ • CalibratedClassif │  │ • Cuarentena │   │
│   └──────────┬──────────┘  └──────────┬──────────┘  └───────┬──────┘   │
│              │                        │                     │          │
│   ┌──────────┴──────────┐  ┌──────────┴──────────┐  ┌───────┴──────┐   │
│   │  Security & Admin   │  │ Experiment Service  │  │ Benchmark CMU│   │
│   │ • Rate Limiting     │  │ • Simulación Deriva │  │ • Validación │   │
│   │ • Purga GDPR        │  │ • Export JSON / CSV │  │   Estándar   │   │
│   └─────────────────────┘  └─────────────────────┘  └──────────────┘   │
└───────────────────────────────────────┬────────────────────────────────┘
                                        │ SQLAlchemy ORM
                                        ▼
                         ┌─────────────────────────────┐
                         │   Base de Datos SQLite/PG   │
                         │   (8+ tablas relacionales)  │
                         └─────────────────────────────┘
```

---

## 🔑 3. Flujo Operativo Esencial: Registro, Login y Re-entrenamiento

El sistema implementa un ciclo de vida biométrico completo que acompaña al usuario desde su enrolamiento inicial hasta la actualización continua de su firma motriz de tecleo:

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│       1. REGISTRO       │      │        2. LOGIN         │      │   3. REENTRENAMIENTO    │
│  Enrolamiento Biométrico│ ───► │   Doble Factor Híbrido  │ ───► │  Recalibración Guiada   │
│  Multi-Sesión (30 m.)   │      │   (Password + Tecleo)   │      │  (Cambio Teclado/Ritmo) │
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

### 📝 3.1 Registro y Enrolamiento Biométrico (`/register`)
El registro combina la creación de credenciales tradicionales con la captura de la firma biométrica de referencia:
1. **Datos de Cuenta**: Nombre completo, usuario, correo, contraseña segura (hasheada con `bcrypt`), edad y datos académicos opcionales (carrera, código).
2. **Protocolo de Enrolamiento Multi-Sesión y Multi-Contexto**:
   * Para evitar firmas biométricas sesgadas por un solo estado anímico o momento del día, el sistema estructura la captura de **30 muestras** distribuidas en 3 sesiones contextuales:
     * **Sesión 1 (Mañana / Línea Base)**: Ritmo matutino en frío (contexto `normal`, 10 repeticiones).
     * **Sesión 2 (Tarde / Mediodía)**: Ritmo activo o acelerado (contexto `con prisa`, 10 repeticiones).
     * **Sesión 3 (Noche / Cierre)**: Ritmo bajo fatiga o alta concentración (`cansado` o `concentrado`, 10 repeticiones).
3. **Auditoría de Calidad en Tiempo Real**:
   * Componentes visuales (`QualityRing`, `MetricsPreview`, `TipsAccordion`) supervisan cada frase tecleada en microsegundos, validando que el texto coincida exactamente y descartando intentos erráticos o interrumpidos.
4. **Construcción del Modelo Base ($M_0$)**:
   * Al completar las muestras requeridas, el backend ejecuta el entrenamiento del clasificador inicial $M_0$ (`RandomForestClassifier` + `RobustScaler` + `CalibratedClassifierCV`).
   * Se extrae y almacena el vector medio $\vec{\mu}_0$ (centroide base) y su dispersión $\vec{\sigma}_0$ para calcular la deriva estadística futura. El modelo se marca como `ACTIVE`.

---

### 🔐 3.2 Inicio de Sesión Biométrico (`/login`)
El inicio de sesión opera como un mecanismo continuo de doble factor sin fricción (*Risk-Based Adaptive Authentication*):
1. **Factor 1 (Credenciales Tradicionales)**: El usuario introduce su nombre de usuario y contraseña (validada contra el hash seguro en base de datos).
2. **Factor 2 (Dinámica de Tecleo en Vivo)**:
   * En el campo interactivo (`CaptchaPhraseInput`), el usuario teclea la frase de seguridad fija: *"La seguridad protege la información"*.
   * Se registran silenciosamente los eventos `keydown` y `keyup` con precisión de microsegundos (`performance.now()`).
3. **Inferencia y Decisión Tri-Zona en Milisegundos**:
   * El servicio backend extrae las 100 features deterministas y calcula la probabilidad calibrada $S = P(\text{legítimo} \mid \vec{x}) \in [0.0, 1.0]$, además de la distancia de deriva $D(\vec{x})$.
   * **ALLOW ($S \ge \theta_{high}$)**: Acceso concedido instantáneo. Se genera el token de sesión JWT y la muestra legítima pasa al pool de candidatos para la adaptación continua.
   * **CHALLENGE ($\theta_{low} \le S < \theta_{high}$)**: Si el usuario presenta una variación leve de cadencia (fatiga o prisa moderada), se despliega de inmediato el modal **2FA TOTP**. Al ingresar el código temporal válido, se concede el acceso sin bloquear al usuario.
   * **REJECT ($S < \theta_{low}$)**: Acceso denegado de inmediato por discrepancia biométrica (posible suplantador). 
4. **Defensa contra Fuerza Bruta (*Lockout*)**:
   * Si se acumulan intentos fallidos consecutivos, el sistema impone un bloqueo temporal con cuenta regresiva visual en tiempo real en la interfaz (`retry-after`).
5. **Redirección por Rol**:
   * Rol `user` (Estudiantes): Redirige automáticamente al **Aula Virtual (`/aula`)**.
   * Rol `admin` (Administradores): Redirige al **Panel de Telemetría e Investigación (`/admin`)**.

---

### 🔄 3.3 Re-entrenamiento Asistido del Perfil (`/aula/entrenamiento` o `/entrenamiento`)
Además de la adaptación autónoma en segundo plano, el sistema proporciona un asistente para la **recalibración voluntaria y asistida** del perfil biométrico:
1. **Casos de Uso**:
   * Cambio de hardware periférico (ej. migración de teclado de membrana de laptop a teclado mecánico externo).
   * Cambios posturales o evolución sustancial en la velocidad mecanográfica del usuario.
2. **Flujo de Recalibración Paso a Paso**:
   * El usuario accede a la interfaz de entrenamiento (`TrainProfile.jsx`).
   * Visualiza el estado de su modelo actual (`current_model_version`, cantidad de muestras registradas y balance de contextos).
   * Escribe una nueva serie estructurada de repeticiones guiadas para registrar su nueva firma motriz.
3. **Promoción de Nueva Versión y Trazabilidad**:
   * El sistema genera una nueva versión del modelo ($M_{new}$), actualiza el centroide de referencia $\vec{\mu}_0$ y archiva la versión anterior sin pérdida de datos.
   * El usuario es redirigido a la pantalla de login con sus credenciales precargadas y una notificación de éxito: *"¡Modelo reentrenado con éxito! Ya puedes autenticarte con tu patrón actualizado."*

---

## 🚀 4. Módulos y Capacidades del Sistema

### 🎮 4.1 Aula Virtual y Captura Lúdica (Gamificación)
Para evitar el "sesgo de laboratorio" o la rigidez de las pruebas formales que alteran el ritmo de tecleo:
* **Actividades de Escritura Guiada**: Textos organizados por dificultad que evalúan palabras por minuto (PPM), precisión rítmica y fatiga.
* **Juego Retro Mario 30**: Juego arcade interactivo de plataformas donde los controles de salto y movimiento capturan la cadencia motriz espontánea del participante.
* **Juego de Ajedrez Táctico**: Modo ajedrez donde el ingreso de comandos y movimientos evalúa tiempos de reacción y resolución analítica.
* **Perfil del Estudiante**: Métricas personalizadas para el usuario (estabilidad de ritmo, horas de mayor soltura y progreso).

### 📐 4.2 Extracción Determinista de 100 Features
El motor biométrico convierte cada frase ingresada en un vector determinista de **100 características numéricas**:
* **35 Tiempos de Retención (*Hold Times*)**: Duración exacta de la pulsación de cada tecla (incluidos espacios).
* **34 Latencias/Dígrafos (*Flight Times*)**: Intervalos entre la liberación de una tecla y la pulsación de la subsiguiente.
* **31 Estadísticas Agregadas**: Media, desviación estándar, mediana, IQR (rango intercuartil), percentiles (10, 25, 75, 90), coeficiente de variación (CV) y puntuación de consistencia rítmica.

### 🛡️ 4.3 Motor de Decisión Tri-Zona Basado en Riesgo
Cada autenticación evalúa la probabilidad calibrada $S = P(\text{legítimo} \mid \vec{x}) \in [0.0, 1.0]$ frente a umbrales reconfigurables $(\theta_{low}, \theta_{high})$:

$$\text{Decisión}(S) = \begin{cases} 
\mathbf{ALLOW} \quad (\text{Acceso Directo}) & \text{si } S \ge \theta_{high} \quad (\text{ej. } \ge 0.75) \\
\mathbf{CHALLENGE} \quad (\text{Desafío 2FA / TOTP}) & \text{si } \theta_{low} \le S < \theta_{high} \quad (\text{ej. } [0.45, 0.75)) \\
\mathbf{REJECT} \quad (\text{Bloqueo Inmediato}) & \text{si } S < \theta_{low} \quad (\text{ej. } < 0.45)
\end{cases}$$

### 🔄 4.4 Motor Adaptativo en Caliente (*Safe Hot-Swapping*)
* **Ventana Deslizante de Candidatos**: Las muestras legítimas exitosas alimentan un pool en memoria/disco.
* **Entrenamiento en la Sombra (*Shadow Model M1*)**: Al acumular $\ge 10$ muestras, se entrena un modelo candidato sin interrumpir la operación de $M_0$.
* **Criterios de Aceptación Incondicionales**:
  * **Seguridad HARD**: $FAR_{M1} \le FAR_{M0}$ *(tolerancia cero a aumento de falsos accesos)*.
  * **Usabilidad HARD**: $FRR_{M1} \le FRR_{M0} + \epsilon$ *(tolerancia máxima $\epsilon = 0.02$)*.
  * **Balance HARD**: $EER_{M1} \le EER_{M0}$.
* **Activación Atómica y Trazabilidad**: Si el candidato supera las pruebas, pasa a estado `ACTIVE`, $M_0$ se archiva como `ARCHIVED` y se registra un evento inmutable en `adaptation_events`.

### 🧪 4.5 Defensas Anti-Envenenamiento y Cuarentena
* **Filtro de Confianza Mínima**: Scores ambiguos o no confirmados no pueden ingresar al pool de entrenamiento.
* **Cuarentena Forense (`quarantined_samples`)**: Muestras anómalas o con distancia estadística extrema ($D > 0.85$) quedan aisladas para inspección forense.
* **Gobernanza y Rollback Administrativo**: En cualquier momento, el administrador puede revertir el sistema a un modelo anterior ($M_{t-1}$ o $M_0$) en caso de anomalías imprevistas.

### 📊 4.6 Monitoreo en Tiempo Real y Visualizaciones
* **Mapa de Calor de Teclas (*Keystroke Heatmap*)**: Visualización interactiva en el teclado que colorea las teclas según su tiempo de retención y variabilidad.
* **Medidor de Deriva Biometríca (*Biometric Drift Meter*)**: Métrica basada en distancia Mahalanobis estandarizada con aviso académico.
* **Comparador de Versiones**: Tablas de comparación de hiperparámetros y métricas ROC/AUC entre modelos activos e históricos.
* **Generación de Reportes Técnicos**: Módulo con previsualización interactiva y exportación formal para auditorías.

### 🔬 4.7 Suite Experimental y Benchmark CMU
* **Simulación de Deriva**: Evaluación automática bajo tres regímenes: sin deriva (`none`), deriva paulatina (`gradual` a 2%/sesión) y choque súbito (`abrupt` a 10% en sesión 8).
* **Dataset CMU**: Validación del pipeline contra el benchmark canónico de dinámica de tecleo de Carnegie Mellon University (51 usuarios, miles de repeticiones).
* **Exportación de Resultados**: Generación de datasets en **JSON** y **CSV** listos para análisis en R, Python o SPSS.

---

## 🗂️ 5. Estructura del Repositorio

```text
TecleoLlave-Adapt/
├── backend/
│   ├── app/
│   │   ├── api/             # Endpoints REST (auth, adaptive, admin_security, ml, dashboard, reports, etc.)
│   │   ├── ml/              # Extracción de características, evaluator, drift detector, risk engine
│   │   ├── models/          # Modelos SQLAlchemy (User, ModelVersion, AdaptationEvent, QuarantinedSample, etc.)
│   │   ├── schemas/         # Contratos Pydantic para validación de datos
│   │   ├── services/        # Lógica de negocio (AdaptiveService, MLService, TypingService, ReportService)
│   │   └── utils/           # RateLimiter por ventana deslizante, JWT y hashing bcrypt
│   ├── tests/               # 33 Tests automatizados con pytest
│   ├── Dockerfile           # Imagen Docker de producción para FastAPI
│   └── requirements.txt     # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── components/      # Heatmap, LiveDemo, ThresholdGauge, EventLogGroup, Modales de Reporte
│   │   ├── pages/
│   │   │   ├── aula/        # AulaDashboard, ActividadesEscritura, JuegoMario30, JuegoAjedrez, Perfil
│   │   │   ├── Dashboard    # Centro de control administrativo y telemetría
│   │   │   ├── LiveDemo     # Demostración interactiva en vivo
│   │   │   ├── Login        # Terminal de inicio de sesión biométrico
│   │   │   └── Register     # Enrolamiento biométrico en 10 repeticiones
│   │   ├── locales/         # Diccionarios de internacionalización (Español / Inglés)
│   │   └── services/        # Cliente Axios con interceptores
│   ├── Dockerfile           # Imagen multi-stage (dev y prod con Nginx)
│   └── vite.config.js       # Configuración de Vite
├── docs/                    # Documentación complementaria y diagramas
├── docker-compose.yml       # Orquestación de contenedores
├── docker-compose.override.yml # Configuración de desarrollo local con recarga en vivo
├── run_demo.py              # Script interactivo de demostración y pruebas
└── README.md                # Documentación oficial del proyecto
```

---

## ⚡ 6. Guía de Ejecución

### Opción A: Despliegue con Docker Compose (Recomendado)

La forma más rápida de levantar toda la infraestructura (backend + frontend) sin configurar entornos manuales:

```bash
# Construir e iniciar todos los servicios
docker compose up --build
```

* **Frontend Web**: [http://localhost:5173](http://localhost:5173) (o `http://localhost` en modo producción)
* **API Backend & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Opción B: Ejecución Local Manual

#### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate      # En Windows
# source venv/bin/activate # En Linux / macOS

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

### Opción C: Script Todo-en-Uno de Demostración (`run_demo.py`)

Para preparar datos sintéticos y ejecutar simulaciones rápidas:

```bash
# 1. Generar usuario de prueba y enrolamiento inicial
python run_demo.py setup

# 2. Ejecutar experimento comparativo (Estático vs Adaptativo)
python run_demo.py experiment

# 3. Simular ataque de suplantador (Impostor Detection)
python run_demo.py impostor

# 4. Iniciar servidores de demostración
python run_demo.py serve
```

---

## 🧪 7. Suite de Pruebas Automatizadas

El proyecto cuenta con **33 pruebas automatizadas** que cubren el 100% de los componentes críticos:

```bash
pytest backend/tests/ -v
```

**Validaciones incluidas**:
* Extracción determinista de 100 features en microsegundos.
* Lógica tri-zona y calibración de probabilidades.
* Restricciones inmutables de adaptación ($FAR_{M1} \le FAR_{M0}$).
* Detección y bloqueo de muestras envenenadas en cuarentena.
* Rate limiting por ventana deslizante.
* Trazabilidad de rollback administrativo y purga de privacidad GDPR.

```text
============================== 33 passed in 43.16s ==============================
```

---

## 👥 8. Roles y Cuentas de Acceso

| Rol | Redirección Inicial | Funcionalidades |
|---|---|---|
| **Estudiante (`user`)** | `/aula` | Actividades de escritura, juegos arcade (Mario, Ajedrez), perfil de cadencia y progreso personal. |
| **Administrador (`admin`)** | `/admin` | Telemetría global, mapas de calor, gobernanza de modelos, rollback, simulación de deriva y reportes. |

---

## 📜 9. Licencia y Créditos

Este proyecto está protegido bajo la licencia **MIT**. Desarrollado con fines académicos y de investigación en seguridad de la información y biometría conductual adaptativa.