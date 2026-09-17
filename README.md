# TECLEOLLAVE-ADAPT
### Sistema Inteligente y Adaptativo de Autenticación Biométrica Basado en Dinámica de Tecleo

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Tests-33%20Passed%20%2F%200%20Failed-brightgreen.svg?style=flat-square)]()
[![Status](https://img.shields.io/badge/Status-Production--Hardened-success.svg?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)]()

---

## 📌 1. Descripción General

**TECLEOLLAVE-ADAPT** es una plataforma integral de ciberseguridad y autenticación continua que implementa **biometría conductual basada en dinámica de tecleo (Keystroke Dynamics)** acoplada a un **motor adaptativo en caliente (Online Continuous Adaptation Engine)** con defensas anti-envenenamiento y gobernanza de modelos.

A diferencia de los esquemas biométricos estáticos tradicionales —cuyo rendimiento decae con el paso del tiempo por fatiga, familiaridad con la frase o cambios de hardware/postura (*biometric drift*)—, **TECLEOLLAVE-ADAPT** evoluciona controladamente junto al usuario, mitigando la tasa de falsos rechazos (**FRR**) sin incrementar en ningún caso la tasa de falsos accesos (**FAR**).

---

## 🧠 2. Fundamentación Matemática y Arquitectura de Decisión

### 2.1 Motor de Decisión Tri-Zona Basado en Riesgo

El sistema evalúa cada intento de autenticación mediante un score probabilístico calibrado $S \in [0.0, 1.0]$, contrastado contra umbrales operacionales reconfigurables $(\theta_{low}, \theta_{high})$:

$$\text{Decisión}(S) = \begin{cases} 
\text{ACCEPT (Acceso Directo)} & \text{si } S \ge \theta_{high} \\
\text{CHALLENGE (Requiere 2FA / TOTP)} & \text{si } \theta_{low} \le S < \theta_{high} \\
\text{REJECT (Bloqueo / Denegación)} & \text{si } S < \theta_{low}
\end{cases}$$

* **Valores Operacionales por Defecto**: $\theta_{low} = 0.45$, $\theta_{high} = 0.75$.

---

### 2.2 Criterio Matemático de Promoción Segura de Modelos

Para evitar degradación de seguridad en cada ciclo adaptativo ($M_t \rightarrow M_{t+1}$), el motor de evaluación (`should_promote_model`) somete al candidato a un conjunto estricto de validación *Hold-Out*:

$$FAR_{candidato} \le FAR_{actual} \quad \land \quad FRR_{candidato} \le FRR_{actual} + \epsilon$$

* **Preservación Estricta de Seguridad**: No se admite incremento en la tasa de impostores aceptados ($FAR_{candidato} \le FAR_{actual}$).
* **Tolerancia Controlada de Usabilidad**: Se permite una cota de holgura $\epsilon = 0.02$ (2.0%) en rechazos legítimos mientras se consolida la nueva firma rítmica.
* Si el candidato incumple cualquiera de las restricciones, es **RECHAZADO** y el modelo activo previo se conserva intacto.

---

### 2.3 Medición Cuantitativa de Deriva Biométrica (*Biometric Drift*)

La divergencia estadística respecto al perfil base de enrolamiento ($M_0$) se cuantifica mediante la distancia normalizada multidimensional (tipo Mahalanobis estandarizada) entre el vector de características $\vec{x}$ y el centroide base $\vec{\mu}_0$:

$$D(\vec{x}) = \tanh\left(\frac{1}{3} \cdot \left[ 0.5 \cdot \text{mediana}\left(\frac{|\vec{x} - \vec{\mu}_0|}{\vec{\sigma}_0}\right) + 0.5 \cdot \text{media}\left(\frac{|\vec{x} - \vec{\mu}_0|}{\vec{\sigma}_0}\right) \right]\right)$$

* **Clasificación**:
  * **LOW DRIFT**: $D < 0.35$ (Estabilidad rítmica nominal).
  * **MODERATE DRIFT**: $0.35 \le D < 0.70$ (Deriva conductual natural).
  * **HIGH DRIFT**: $D \ge 0.70$ (Variación marcada o cambio significativo de entorno).

> [!NOTE]
> **Aviso Académico / Disclaimer de Deriva**:
> La deriva biométrica conductual es un fenómeno puramente estadístico atribuible a variaciones normales de velocidad, familiaridad con la interfaz, cambio de teclado físico, postura o fatiga transitoria. **No constituye ni debe interpretarse en ningún caso como diagnóstico, síntoma o indicador de salud o condición médica alguna.**

---

### 2.4 Defensas Multi-Capa contra Envenenamiento (*Anti-Poisoning*)

Para impedir que un atacante inyecte muestras maliciosas de forma paulatina para sesgar el modelo:
1. **Confianza Mínima de Score**: Únicamente muestras con $S \ge 0.60$ son elegibles para el *candidate pool*.
2. **Verificación Estricta en Zona Desafío**: Muestras originadas en `CHALLENGE` son descartadas si el 2FA TOTP no fue completado exitosamente.
3. **Filtro de Consistencia y Calidad**: Muestras clasificadas con calidad baja o cadencia errática ($<0.40$) se rechazan.
4. **Alberca de Cuarentena (`quarantined_samples`)**: Toda muestra sospechosa o con distancia $D > 0.85$ es aislada en cuarentena con auditoría de causa y nunca ingresa al entrenamiento.

---

### 2.5 Reversibilidad y Rollback Administrativo

Cualquier modelo promovido puede ser revertido en caliente por el administrador a una versión previa ($M_{t-1}$ o $M_0$):
* Transición atómica de estados: modelo actual pasa a `ROLLED_BACK` y el objetivo pasa a `ACTIVE`.
* Registro inmutable en `adaptation_events` con fecha, usuario administrador y justificación técnica.

---

## 🔒 3. Privacidad, GDPR y Protección de Datos Biométricos

* **Protección de Eventos Brutos**: Las marcas de tiempo crudas (`raw_timestamps`) de pulsación y liberación contienen información sensible de la interacción del usuario.
* **Política de Retención y Purga**: Mediante `POST /api/admin/security/retention/cleanup`, el sistema purga periódicamente las secuencias crudas que superen la política de retención (ej. 90 días), preservando únicamente los vectores de características agregadas y métricas no invertibles.
* **Rate Limiting por Ventana Deslizante**: Implementación thread-safe en memoria (`SlidingWindowRateLimiter`) que protege los endpoints de autenticación y verificación 2FA contra ataques de fuerza bruta y denegación de servicio.

---

## 📊 4. Evaluación Empírica y Benchmark CMU

El sistema incorpora evaluadores de rendimiento biométrico basados en barridos exhaustivos de umbrales:
* **Curva ROC y AUC Empírico**: Cálculo de puntos $(FPR, TPR)$ variando $\theta \in [0.35, 0.85]$.
* **EER (Equal Error Rate)**: Cálculo exacto del punto de cruce $FAR = FRR$ y umbral óptimo $\theta_{EER}$.
* **Validación Cruzada en CMU Benchmark**: Evaluación con 51 sujetos y más de 400 secuencias estandarizadas.

---

## 🏛️ 5. Arquitectura del Repositorio

```text
TecleoLlave-Adapt/
├── backend/
│   ├── app/
│   │   ├── api/             # Endpoints REST (auth, adaptive, admin_security, ml, dashboard, reports)
│   │   ├── ml/              # Evaluator (FAR/FRR/EER/ROC), Drift (M0 centroid), Trainer, RiskEngine
│   │   ├── models/          # Entidades SQLAlchemy (User, ModelVersion, QuarantinedSample, etc.)
│   │   ├── schemas/         # Esquemas Pydantic para validación y contratos API
│   │   ├── services/        # AdaptiveService, SecurityService, ReportService, MLService
│   │   └── utils/           # RateLimiter, JWT Crypto, Bcrypt
│   ├── tests/               # 33 Tests Automatizados (FAR/FRR, Drift, Poisoning, Rollback, Privacy)
│   ├── migrate_master_schema.py # Migración DDL para esquemas avanzados
│   └── requirements.txt     # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── components/      # RocCurveChart, ThresholdGauge, Heatmap, ReportPreviewModal
│   │   ├── pages/           # Dashboard (con Drift KPI y Rollback), LiveDemo, Login, Admin
│   │   └── services/        # Cliente Axios con interceptores y manejo de errores
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 6. Guía de Puesta en Marcha

### Prerrequisitos
* **Python 3.10+**
* **Node.js 18+** y **npm**
* **Git**

### Backend

```bash
# 1. Acceder al directorio backend
cd backend

# 2. Crear entorno virtual
python -m venv venv
venv\Scripts\activate      # En Windows PowerShell/CMD
# source venv/bin/activate # En Linux / macOS

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Iniciar servidor FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
* **Documentación Interactiva Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
# 1. Acceder al directorio frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo Vite
npm run dev
```
* **Aplicación Web**: [http://localhost:5173](http://localhost:5173)

---

## 🧪 7. Ejecución de Tests Automatizados

La suite completa incluye 33 pruebas unitarias y de integración que validan:
* Barrido de umbrales, métricas FAR, FRR, EER y curvas ROC.
* Reglas de decisión tri-zona y validación de rangos.
* Invarianza y aislamiento biométrico entre usuarios distintos.
* Detección de degradación y regla estricta de promoción $FAR \le FAR_{cur}$.
* Bloqueo en cuarentena y simulación de ataques de envenenamiento.
* Reversión de modelos (Rollback) y generación de pistas de auditoría.
* Limitador de tasa (*Rate Limiting*) y retención/purga de privacidad.

```bash
# Ejecutar todas las pruebas con salida detallada
pytest backend/tests/ -v
```

**Resultado de Validación**:
```text
============================== 33 passed in 43.16s ==============================
```

---

## 📜 8. Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Consulte el archivo `LICENSE` para más detalles.