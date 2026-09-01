# TECLEOLLAVE-ADAPT - Documentación para Presentación Académica

## 1. Resumen del Proyecto

**Título:** Mecanismo adaptativo de autenticación mediante dinámica de tecleo para reducir la degradación del rendimiento de la biometría conductual ante variaciones del comportamiento del usuario

**Tipo:** Prototipo académico - Curso Seguridad de la Información

**Contribución principal:** Un mecanismo de adaptación controlada del perfil biométrico de dinámica de tecleo que:
- Permite la evolución natural del comportamiento del usuario
- Valida empíricamente cada nuevo modelo antes de activarlo
- Garantiza que la seguridad (FAR) nunca empeore
- Mantiene la usabilidad (FRR) dentro de límites aceptables

---

## 2. Problema Abordado

### Biometría Conductual: El Problema de la Deriva
- Los patrones de tecleo cambian naturalmente con el tiempo (fatiga, estrés, cambio de dispositivo, aprendizaje)
- Modelos estáticos degradan su rendimiento: **FAR aumenta** (seguridad) y **FRR aumenta** (usabilidad)
- Soluciones existentes: re-entrenamiento periódico (riesgo de contaminación) o umbrales fijos (inflexibles)

### Nuestra Solución: Adaptación Controlada
```
M0 (modelo actual)
    ↓
Nuevas muestras legítimas (ALLOW)
    ↓
Pool de candidatos (ventana deslizante)
    ↓
Entrena M1 con pool + datos históricos
    ↓
Evalúa M1 vs M0 en hold-out set
    ↓
¿M1.FAR ≤ M0.FAR Y M1.FRR ≤ M0.FRR + ε?
    ↓ SÍ                    NO
Activar M1            Conservar M0
Archivar M0           Limpiar pool
```

---

## 3. Arquitectura del Sistema

```
┌─────────────────┐     HTTPS/JSON      ┌─────────────────┐
│   FRONTEND      │ ◄─────────────────► │    BACKEND      │
│  (React + Vite) │                     │   (FastAPI)     │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────┐                     ┌─────────────────┐
│  Captura        │                     │  ML Pipeline    │
│  Teclado        │                     │  (sklearn)      │
│  (keydown/up)   │                     │  RandomForest   │
└─────────────────┘                     └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   SQLite        │
                                        │  (8 tablas)     │
                                        └─────────────────┘
```

### Componentes Clave

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| Frontend | React 18 + Vite | UI, captura timestamps, dashboard |
| API | FastAPI | REST endpoints, validación, auth JWT |
| Auth Service | Python + bcrypt + JWT | Registro, login, tokens |
| Typing Service | Python | Captura, features, autenticación |
| ML Service | scikit-learn | Entrenamiento, predicción, calibración |
| Adaptive Service | Python | Pool, candidato, evaluación, activación |
| Experiment Service | Python | Experimentos estático vs adaptativo |

---

## 4. Flujo de Autenticación Completo

```
Usuario ingresa credenciales
        │
        ▼
Validación bcrypt + JWT
        │
        ▼ (si OK)
Frontend captura frase fija
"La seguridad protege la información"
        │
        ▼ 50+ eventos keydown/keyup
POST /api/typing/authenticate
        │
        ▼
Extracción 100 features
(35 hold + 34 latency + 31 stats)
        │
        ▼
Carga modelo activo (RandomForest + RobustScaler + Calibrated)
        │
        ▼
biometric_score = P(legítimo | features) ∈ [0,1]
        │
        ▼
Decisión adaptativa:
  score ≥ 0.85 → ALLOW
  0.70 ≤ score < 0.85 → CHALLENGE
  score < 0.70 → REJECT
        │
        ▼
Si ALLOW → AdaptiveService.process_auth_result()
        │
        ├── Añade a pool candidatos
        ├── Si pool ≥ 10 → Entrena candidato M1
        ├── Evalúa M1 vs M0 (FAR, FRR, EER, Precision, Recall)
        │   └── Si M1 mejor/igual → ACTIVA M1, archiva M0
        └── Si no → Descarta M1, conserva M0
```

---

## 5. Esquema de Features (100 features deterministas)

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| Hold Times | 35 | Duración pulsación por posición (incluye espacios) |
| Latencias/Digraphs | 34 | Transición entre teclas consecutivas |
| Estadísticas agregadas | 31 | Media, std, mediana, IQR, percentiles, CV, flight time, consistencia |

**Total: 100 features** - Vector determinista por posición en frase fija

---

## 6. Mecanismo Adaptativo: Criterios de Aceptación

| Tipo | Métrica | Criterio | Valor Default |
|------|---------|----------|---------------|
| **Seguridad (HARD)** | FAR | M1.FAR ≤ M0.FAR + 0.0 | 0.0 |
| **Usabilidad (HARD)** | FRR | M1.FRR ≤ M0.FRR + 0.02 | 0.02 |
| **Usabilidad (HARD)** | EER | M1.EER ≤ M0.EER + 0.0 | 0.0 |
| **Rendimiento (SOFT)** | Precision | M1.Prec ≥ M0.Prec - 0.01 | -0.01 |
| **Rendimiento (SOFT)** | Recall | M1.Rec ≥ M0.Rec - 0.01 | -0.01 |

**Regla:** TODOS los criterios HARD + TODOS los SOFT (configurable `require_all_constraints`)

---

## 7. Experimentos: Estático vs Adaptativo

### Diseño Experimental
- **Mismo usuario, mismos datos, distinta política**
- **Estático:** M0 fijo durante todas las sesiones
- **Adaptativo:** M0 → M1 → M2... vía adaptación controlada
- **Deriva simulada:** `none` | `gradual` (2%/sesión) | `abrupta` (10% en sesión 8)

### Métricas Comparadas
| Métrica | Descripción |
|---------|-------------|
| FAR | False Accept Rate (seguridad) |
| FRR | False Reject Rate (usabilidad) |
| EER | Equal Error Rate (balance) |
| Accuracy | Exactitud global |
| Precision/Precision | Precisión/Exhaustividad |
| F1 | Media armónica P/R |
| n_adaptations | Número de adaptaciones exitosas |
| model_versions_used | Versiones de modelo usadas |

### Outputs Generados
- **JSON:** Resultados completos + metadatos
- **CSV:** Listo para análisis en Python/R/Excel

---

## 8. Demostración en Vivo (Guión)

### Preparación (5 min antes)
```bash
# 1. Generar datos demo
python run_demo.py setup

# 2. Iniciar servidores
python run_demo.py serve
```

### Demo en Vivo (15 min)

| Tiempo | Acción | Qué Mostrar |
|--------|--------|-------------|
| 0:00 | Abrir http://localhost:5173 | Dashboard con métricas en tiempo real |
| 1:00 | Registrar usuario "demo" | Formulario registro + enrolamiento 10x |
| 3:00 | Entrenar modelo | Logs de training + métricas |
| 4:00 | Login biométrico | Captura frase + decisión ALLOW |
| 6:00 | Repetir login 10x | Pool se llena → Candidato → Evaluación → ACEPTADO |
| 9:00 | Dashboard | Modelo v5 activo, timeline adaptaciones |
| 11:00 | Comparación | Estático (v1) vs Adaptativo (v5) |
| 13:00 | Demo impostor | 5 intentos → RECHAZADOS |
| 15:00 | Conclusiones | Resumen contribución |

### Puntos Clave a Resaltar
1. **Captura real** de 35 caracteres con timestamps microsegundos
2. **100 features** extraídos y mostrados en dashboard
3. **Decisión en <100ms** con score calibrado
4. **Adaptación automática** tras 10 ALLOW consecutivos
5. **Evaluación rigurosa** M1 vs M0 antes de activar
6. **Seguridad garantizada** FAR nunca aumenta
7. **Trazabilidad completa** via AdaptationEvent

---

## 9. Métricas de Evaluación Académica

### Métricas Primarias (Autenticación)
- **FAR** (False Accept Rate) - Prioridad: SEGURIDAD
- **FRR** (False Reject Rate) - Prioridad: USABILIDAD
- **EER** (Equal Error Rate) - Punto de equilibrio
- **Accuracy, Precision, Recall, F1** - Complementarias

### Métricas de Adaptación
- **n_adaptations** - Número de actualizaciones exitosas
- **model_versions_used** - Versiones utilizadas
- **adaptation_latency** - Sesiones entre adaptaciones
- **pool_efficiency** - Muestras usadas / muestras en pool

### Validación Experimental
- **Protocolo reproducibile:** Seed fijo, mismos datos, distinta política
- **Deriva controlada:** 3 perfiles (none, gradual, abrupt)
- **Métricas agregadas:** Media ± std sobre 30 sesiones
- **Significancia:** Comparación paired (mismo usuario, mismos datos)

---

## 10. Limitaciones y Trabajo Futuro

### Limitaciones Actuales
1. **Single-class training:** Solo muestras legítimas → métricas FAR/FRR simuladas
2. **Frase fija:** 35 chars, no free-text
3. **Single-user:** Un modelo por usuario, no población
4. **No impostor training:** Necesario para métricas reales FAR/FRR

### Trabajo Futuro
1. **Multi-class training** con muestras impostoras reales/sintéticas
2. **Free-text authentication** con features independientes del texto
3. **Population-level modeling** (transfer learning, meta-learning)
3. **Continuous authentication** (no solo login)
4. **Adversarial robustness** (ataques de suplantación, poisoning)
5. **Deployment real** (mobile, web, desktop)

---

## 11. Referencias Técnicas Clave

1. **Keystroke Dynamics:** Monrose & Rubin (1997) - Authentication via keystroke dynamics
2. **Adaptive Biometrics:** Rattani et al. (2015) - Adaptive biometric systems
3. **Concept Drift:** Gama et al. (2014) - A survey on concept drift adaptation
4. **Calibration:** Niculescu-Mizil & Caruana (2005) - Predicting good probabilities
5. **Random Forest:** Breiman (2001) - Random Forests

---

## 12. Checklist de Entrega Académica

- [x] Código fuente completo en repositorio
- [x] README con instrucciones de ejecución
- [x] Documentación técnica (arquitectura, API, modelo de datos)
- [x] Scripts reproducibles (demo_setup.py, run_demo.py)
- [x] Datos de ejemplo generados
- [x] Experimentos reproducibles (JSON + CSV)
- [x] Dashboard funcional con métricas en tiempo real
- [x] Documentación de arquitectura y decisiones de diseño
- [x] Guión de demostración en vivo
- [x] Análisis de limitaciones y trabajo futuro