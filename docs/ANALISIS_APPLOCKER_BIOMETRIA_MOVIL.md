# TECLEOLLAVE-ADAPT: Análisis de Viabilidad, Arquitectura Móvil (App Locker) y Plataforma Web de Investigación Científica

**Documento Integral de Diseño Técnico, Metodología Experimental y Plataforma de Estudio**  
**Fecha:** Octubre 2026  
**Proyecto:** TecleoLlave-Adapt (Seguridad de la Información - UNT)  
**Autor:** Investigador Principal (Admin) & Asistente Antigravity  

---

## 1. Resumen Ejecutivo y Dictamen de Factibilidad

### 1.1 Dictamen Directo
> **La propuesta es 100% FACTIBLE técnica, arquitectural y científicamente.**  
> La combinación de una aplicación **App Locker** para Android con **Biometría Conductual Táctil (*Touch Keystroke Dynamics*)**, **Frases Personalizadas Visibles**, **Protocolo de Enrolamiento de 30 Repeticiones**, **Registro con Verificación de Correo (OTP)** y un **Panel Web de Control y Telemetría Científica para el Investigador**, constituye un ecosistema metodológico de vanguardia listo para publicación en revistas indexadas (IEEE, Scopus Q1/Q2, ACM).

### 1.2 Por qué esta investigación es disruptiva frente al estado del arte
1. **Inmunidad al *Shoulder Surfing* y *Smudge Attacks*:** Los bloqueadores convencionales (PIN, patrón geométrico) son vulnerables a la simple observación de pantalla o residuos de grasa táctil. En TecleoLlave-Adapt, la frase es visible en pantalla, pero el acceso depende exclusivamente de la firma neuromuscular intransferible del usuario.
2. **Protocolo de Entrenamiento Basal de 30 Muestras ($N=30$):** Permite modelar con rigor estadístico la ley de potencia del aprendizaje motor (*Power Law of Practice*), garantizando el teorema del límite central para la estimación de medias y varianzas biométricas.
3. **Ecosistema Closed-Loop Móvil + Web:** El usuario interactúa con la app en su día a día protegiendo aplicaciones reales (WhatsApp, banca móvil, galería), mientras el administrador/investigador supervisa la telemetría, deriva biométrica y métricas globales desde un panel web con exportación automática a formatos científicos (LaTeX, CSV).

---

## 2. Análisis del Vector Biométrico Dinámico y Protocolo de 30 Repeticiones

### 2.1 Formulación Matemática del Vector de Características
Cuando un usuario define su frase personalizada de longitud $L$ ($12 \le L \le 28$ caracteres):

$$\vec{X} \in \mathbb{R}^{D(L)}, \quad D(L) = L + (L - 1) + K = 2L - 1 + K$$

Donde:
* **Tiempos de Pulsación (*Hold Time*, $HT_i$):** Tiempo que el pulgar permanece en contacto con la tecla $c_i$ ($L$ valores en milisegundos).
* **Tiempos de Vuelo / Dígrafos (*Flight Time / Latency*, $LT_i$):** Intervalo entre soltar la tecla $c_i$ y presionar $c_{i+1}$ ($L - 1$ valores en milisegundos).
* **Parámetros Globales e Invariantes a la Longitud ($K = 25$):** Media ($\mu$), desviación estándar ($\sigma$), mediana, rango intercuartil ($IQR$), asimetría (*skewness*), curtosis, cadencia de escritura (*Words Per Minute* - WPM), coeficiente de variación ($CV_{HT}$, $CV_{LT}$), área media de contacto táctil y presión media.

```
   ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
   │    Hold Times (HT)    │ │     Latencias (LT)    │ │ Estadísticas Globales │
   │      c₀, c₁, ... cₗ₋₁ │ │  c₀→c₁, c₁→c₂, ...    │ │  μ, σ, WPM, IQR, etc. │
   │      (L valores)      │ │     (L - 1 valores)   │ │      (25 valores)     │
   └───────────┬───────────┘ └───────────┬───────────┘ └───────────┬───────────┘
               └────────────────────┬────┴─────────────────────────┘
                                    ▼
                      Vector de Entrada al Modelo
                     X ∈ ℝ^(2L - 1 + 25)
```

### 2.2 Justificación Científica del Protocolo de 30 Repeticiones ($N=30$)
En la literatura clásica de interacción humano-computador (HCI) y biometría motora, el entrenamiento con pocas muestras ($N \le 5$) genera perfiles inestables con alta tasa de rechazo falso ($FRR$). La adopción de **$N=30$ repeticiones consecutivas o en bloques** se fundamenta en tres pilares científicos:

1. **Ley de Potencia de la Práctica (Newell & Rosenbloom):**
   $$T_n = T_1 \cdot n^{-\alpha}$$
   * **Muestras 1 a 10 (Fase Cognitiva):** El usuario memoriza espacialmente la distribución de la frase en el teclado táctil; la varianza intra-ensayo es alta.
   * **Muestras 11 a 20 (Fase Asociativa):** La digitación se vuelve rítmica, emergen dígrafos automáticos y se estabiliza la velocidad.
   * **Muestras 21 a 30 (Fase Autónoma / Meseta Biométrica):** El tecleo pasa a memoria muscular procedimental; las distribuciones de $HT$ y $LT$ alcanzan su estado asintótico estacionario.

2. **Teorema del Límite Central y Robustez Paramétrica:** Con $N \ge 30$, la estimación del vector de centroides $\vec{\mu}_0$ y la matriz de covarianza / vector de desviaciones $\vec{\sigma}_0$ converge a normalidad estadística, reduciendo drásticamente el error estándar de la media:
   $$SE(\mu) = \frac{\sigma}{\sqrt{30}} \approx 0.18 \cdot \sigma$$

3. **Separabilidad de Clases (Legítimo vs Impostor):** 30 muestras proveen la masa de datos necesaria para entrenar modelos One-Class SVM, Isolation Forest o distancias ponderadas de Mahalanobis sin riesgo de sobreajuste por escasez de datos.

---

## 3. Flujo de Registro, Autenticación OTP y Enrolamiento

Para asegurar la validez metodológica del experimento, cada sujeto de prueba debe ser identificado de manera única y verificable, evitando registros espurios o duplicados.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE INCORPORACIÓN DEL PARTICIPANTE                  │
│                                                                             │
│  [ Pantalla de Registro Móvil ]                                             │
│       │                                                                     │
│       ├─► 1. Ingreso de Correo Electrónico + Aceptación de Consentimiento   │
│       │                                                                     │
│       ▼ Solicitud HTTP: POST /api/v1/mobile/auth/register-request           │
│  ┌───────────────────────────────┐                                          │
│  │ Backend FastAPI               │ ──► Genera OTP seguro (6 dígitos, 10 min)│
│  │ Servicio SMTP / Resend        │ ──► Envía correo al usuario              │
│  └───────────────────────────────┘                                          │
│       │                                                                     │
│       ▼                                                                     │
│  [ Pantalla de Verificación OTP ]                                           │
│       │                                                                     │
│       ├─► 2. Usuario ingresa código recibido en su bandeja                  │
│       │                                                                     │
│       ▼ Solicitud HTTP: POST /api/v1/mobile/auth/verify-code                │
│  ┌───────────────────────────────┐                                          │
│  │ Backend valida código         │ ──► Asigna Participant_ID (UUID anónimo) │
│  │ Emite Bearer JWT de Sesión    │ ──► Inicializa estado: "PENDING_ENROLL"  │
│  └───────────────────────────────┘                                          │
│       │                                                                     │
│       ▼                                                                     │
│  [ Creación y Entrenamiento de Frase Clave ]                                │
│       │                                                                     │
│       ├─► 3. Usuario escribe su frase personalizada (ej: "seguridad unt 26")│
│       ├─► 4. Protocolo de 30 Repeticiones en el teclado táctil in-app       │
│       │      (Organizado en 3 bloques de 10 con pausas anti-fatiga)         │
│       │                                                                     │
│       ▼ Solicitud HTTP: POST /api/v1/mobile/study/enroll-30                 │
│  ┌───────────────────────────────┐                                          │
│  │ Backend procesa las 30 rep.   │ ──► Entrena Perfil Inicial M0            │
│  │ Base de Datos PostgreSQL      │ ──► Almacena raw timings para el estudio │
│  └───────────────────────────────┘                                          │
│       │                                                                     │
│       ▼                                                                     │
│  [ App Locker Activado: El usuario ya puede proteger WhatsApp, Banco, etc. ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Arquitectura del Sistema en Android (Mecanismos del SO)

Para que la app funcione como un **App Locker** real con permisos en Android, interactúa con servicios clave del sistema operativo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SISTEMA OPERATIVO ANDROID                        │
│                                                                             │
│  [ Usuario toca WhatsApp en la pantalla de inicio ]                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌───────────────────────────────┐     Detecta cambio de app en primer plano│
│  │ AccessibilityService          │ ─── (TYPE_WINDOW_STATE_CHANGED)          │
│  │ + UsageStatsManager           │                                          │
│  └──────────────┬────────────────┘                                          │
│                 │                                                           │
│                 ▼ ¿WhatsApp está en la lista de apps protegidas?            │
│  ┌───────────────────────────────┐                                          │
│  │ TecleoLlave Background Engine │ ─── Sí: Bloque "PRIVADAS" (Frase "...")  │
│  └──────────────┬────────────────┘                                          │
│                 │                                                           │
│                 ▼ Dibuja ventana de bloqueo encima                          │
│  ┌───────────────────────────────┐                                          │
│  │ SYSTEM_ALERT_WINDOW (Overlay) │ ─── Muestra frase visible + Teclado      │
│  │ In-App Touch Capture          │     Táctil Biométrico                    │
│  └──────────────┬────────────────┘                                          │
│                 │                                                           │
│                 ▼ Usuario teclea la frase en la pantalla                    │
│  ┌───────────────────────────────┐                                          │
│  │ Verificación Local / API      │                                          │
│  │ Score S >= θ_high             │ ─── Desbloquea WhatsApp por X minutos    │
│  │ θ_low <= S < θ_high           │ ─── Solicita 2FA de respaldo             │
│  │ S < θ_low                     │ ─── Bloqueo y registro de intento        │
│  └───────────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Permisos de Nivel de Sistema
1. **`SYSTEM_ALERT_WINDOW` ("Mostrar sobre otras aplicaciones"):** Despliega el overlay de bloqueo de forma instantánea.
2. **`PACKAGE_USAGE_STATS` ("Acceso al uso de aplicaciones"):** Consulta la tarea activa en primer plano.
3. **`BIND_ACCESSIBILITY_SERVICE` (Servicio de Accesibilidad):** Intercepción en tiempo real (< 10 ms) del cambio de foco de ventanas.
4. **`INTERNET` y `ACCESS_NETWORK_STATE`:** Transmisión segura (HTTPS/WSS) de métricas de estudio al servidor del investigador.
5. **`VIBRATE`:** Micro-retroalimentación háptica táctil (15 ms) por tecla pulsada para enriquecer la propiocepción del usuario.

---

## 5. Diseño de Interfaces Móviles (GUI y UX Experimental)

La interfaz móvil cuenta con pantallas optimizadas tanto para el usuario ordinario como para los requisitos de recolección científica.

---

### Pantalla 0A: Consentimiento Ético y Registro con Correo
**Propósito:** Cumplimiento con pautas de comités de ética en investigación científica (IRB / Helsinki) e identificación formal del sujeto.

```text
┌───────────────────────────────────────────┐
│ 🔐 TECLEOLLAVE ADAPT                      │
│    Estudio de Biometría Conductual        │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 📋 CONSENTIMIENTO INFORMADO           │ │
│ │ Este estudio evalúa la seguridad de   │ │
│ │ tecleo en pantallas táctiles para     │ │
│ │ proteger aplicaciones. Sus datos de   │ │
│ │ ritmo de pulsación serán anonimizados │ │
│ │ con fines de investigación académica. │ │
│ │ [✓] Acepto participar en el estudio   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Ingrese su Correo Institucional / Personal│
│ ┌───────────────────────────────────────┐ │
│ │ 📧 usuario@unitru.edu.pe              │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Datos demográficos para el estudio:       │
│ Mano dominante: [● Diestro] [○ Zurdo]    │
│ Rango de edad:  [ 18 - 25 años        ▼] │
│                                           │
│        [ Enviar Código de Verificación ]  │
└───────────────────────────────────────────┘
```

---

### Pantalla 0B: Verificación de Código OTP
**Propósito:** Validación de autenticidad del correo y emisión de credenciales criptográficas de participante.

```text
┌───────────────────────────────────────────┐
│ ← Volver                                  │
│                                           │
│                   ✉️                      │
│         VERIFICAR CORREO                  │
│                                           │
│ Hemos enviado un código de 6 dígitos a:   │
│ usuario@unitru.edu.pe                     │
│                                           │
│ Ingrese el código:                        │
│ ┌───┐ ┌───┐ ┌───┐   ┌───┐ ┌───┐ ┌───┐     │
│ │ 4 │ │ 8 │ │ 1 │   │ 9 │ │ 2 │ │ 0 │     │
│ └───┘ └───┘ └───┘   └───┘ └───┘ └───┘     │
│                                           │
│ El código expira en: 09:42 min            │
│                                           │
│ ¿No recibiste el código? [Reenviar]       │
│                                           │
│          [ Confirmar y Continuar ]        │
└───────────────────────────────────────────┘
```

---

### Pantalla 0C: Creación y Entrenamiento de Frase (Protocolo 30 Repeticiones Gamificado)
**Propósito:** Captura de las 30 repeticiones basales minimizando la fatiga mediante gamificación en 3 series de 10 con descansos.

```text
┌───────────────────────────────────────────┐
│ 🎯 ENTRENAMIENTO DE FIRMA BIOMÉTRICA      │
│                                           │
│ Frase Clave Definida:                     │
│ ┌───────────────────────────────────────┐ │
│ │  s e g u r i d a d   u n t   2 0 2 6  │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ SERIE 2 DE 3: "Consolidación de Ritmo"    │
│ Progreso Global: Repetición 17 / 30       │
│ [████████████████░░░░░░░░░░░░░] 56%       │
│                                           │
│ Indicador de Estabilidad de Ritmo:        │
│ 🟢 Consistencia: 88% (Excelente cadencia) │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ s e g u r i d a [·]                   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐│
│ │ Q │ W │ E │ R │ T │ Y │ U │ I │ O │ P ││
│ ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤│
│ │ A │ S │ D │ F │ G │ H │ J │ K │ L │ Ñ ││
│ └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘│
│     │ Z │ X │ C │ V │ B │ N │ M │ ⌫ │     │
│     └───┴───┴───┴───┴───┴───┴───┴───┘     │
│            [    E S P A C I O    ]        │
│                                           │
│ 💡 Mantén tu velocidad y postura natural  │
└───────────────────────────────────────────┘
```

*Nota UX:* Cada 10 repeticiones se activa un modal de pausa sugerida (20 segundos) con ejercicios de relajación de pulgares para evitar que el cansancio vicie las muestras 21-30.

---

### Pantalla 1: Dashboard Principal del Usuario
**Propósito:** Monitoreo diario del escudo y estado de las aplicaciones bloqueadas.

```text
┌───────────────────────────────────────────┐
│ 🔐 TECLEOLLAVE SECURE                ⚙️  │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │  ESCUDO BIOMÉTRICO ACTIVO             │ │
│ │  🟢 6 Apps Protegidas  ·  2 Bloques   │ │
│ │  Perfil $M_t$: ÓPTIMO (Deriva 0.14)   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ APLICACIONES FRECUENTES                   │
│ ┌───────────────────────────────────────┐ │
│ │ 🟢 WhatsApp    [Bloque: Privadas] 🔒  │ │
│ │ 🟢 BCP Móvil   [Bloque: Finanzas] 🔒  │ │
│ │ 🟢 Galería     [Bloque: Privadas] 🔒  │ │
│ │ ⚪ TikTok      [Sin proteger]     ＋  │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ MÓDULO CIENTÍFICO                         │
│ ┌───────────────────────────────────────┐ │
│ │ 🥷 Modo Desafío Impostor              │ │
│ │ (Pide a un compañero que intente      │ │
│ │ vulnerar tu frase visible)        [▶] │ │
│ └───────────────────────────────────────┘ │
│                                           │
│  [🏠 Inicio]  [📱 Apps]  [🗂️ Bloques] [⚙️]│
└───────────────────────────────────────────┘
```

---

### Pantalla 2: Seleccionar Qué Proteger (Detalle de Aplicación)
**Propósito:** Configurar una aplicación específica, asignándola a un bloque predefinido o personalizando su método.

```text
┌───────────────────────────────────────────┐
│ ← Configurar WhatsApp                     │
│                                           │
│                  🟢                       │
│               WhatsApp                    │
│          com.whatsapp · v2.24             │
│                                           │
│ PROTECCIÓN                                │
│ ┌───────────────────────────────────────┐ │
│ │ Proteger esta aplicación          [ON]│ │
│ └───────────────────────────────────────┘ │
│                                           │
│ MODO DE PROTECCIÓN                        │
│ ┌───────────────────────────────────────┐ │
│ │ ● Por Bloque: "🔴 PRIVADAS"           │ │
│ │ ○ Regla Individual Personalizada      │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ MÉTODO DE DESBLOQUEO                      │
│ ┌───────────────────────────────────────┐ │
│ │ 🔤 Frase Biométrica Conductual   (✓)  │ │
│ │ 🔢 PIN Numérico Auxiliar              │ │
│ │ 👆 Permitir Huella como 2FA           │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ RE-BLOQUEO                                │
│ [ Inmediato ]  [ Tras 1 min ]  [ Al apagar]│
│                                           │
│         [ Guardar Configuración ]         │
└───────────────────────────────────────────┘
```

---

### Pantalla 3: Protección por Bloques (Grupos de Apps)
**Propósito:** Gestión modular de la seguridad. Cada bloque define su propia frase biométrica, nivel de tolerancia y aplicaciones agrupadas.

```text
┌───────────────────────────────────────────┐
│ ← Bloques de Protección                   │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 🔴 PRIVADAS                 [4 Apps]  │ │
│ │ WhatsApp · Galería · Telegram · Notas │ │
│ │ 🔤 Frase: "mis secretos estan aqui"    │ │
│ │ 🎚️ Tolerancia: Balanceada (θ = 0.75)   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 🟡 FINANZAS                 [3 Apps]  │ │
│ │ BCP · Yape · Plin                     │ │
│ │ 🔤 Frase: "seguridad bancaria activa" │ │
│ │ 🎚️ Tolerancia: Estricta (θ = 0.85)     │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 🔵 TRABAJO                  [3 Apps]  │ │
│ │ Gmail · Google Drive · Teams          │ │
│ │ 🔤 Frase: "ritmo de trabajo diario"   │ │
│ │ 🎚️ Tolerancia: Flexible (θ = 0.70)     │ │
│ └───────────────────────────────────────┘ │
│                                           │
│           [ ＋ Crear Nuevo Bloque ]       │
└───────────────────────────────────────────┘
```

---

### Pantalla 4: Protección del Celular (Dispositivo)
**Propósito:** Configuración del escudo general del dispositivo, permisos del sistema operativo y defensas proactivas.

```text
┌───────────────────────────────────────────┐
│ ← Protección del Dispositivo              │
│                                           │
│ ESTADO GENERAL                            │
│ ┌───────────────────────────────────────┐ │
│ │ 🛡️ Escudo de Dispositivo      [ACTIVO]│ │
│ │ Interceptar al encender pantalla      │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ PERMISOS DE ANDROID                       │
│ ┌───────────────────────────────────────┐ │
│ │ ✓ Servicio de Accesibilidad (En línea)│ │
│ │ ✓ Superposición de Pantalla (Activo)  │ │
│ │ ✓ Acceso a Estadísticas de Uso (OK)   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ DEFENSAS CONTRA ENGAÑOS                   │
│ ┌───────────────────────────────────────┐ │
│ │ [✓] Bloquear desinstalación de la App │ │
│ │ [✓] Bloquear ajustes del sistema      │ │
│ │ [✓] Foto espía tras 3 intentos fallidos│ │
│ │ [✓] Bloqueo total tras 5 impostores   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│            [ Probar Bloqueo Ahora ]       │
└───────────────────────────────────────────┘
```

---

### Pantalla 5: Modo "Desafío Impostor" (Captura Controlada de Ataques)
**Propósito Metodológico:** Permite al participante invitar a un amigo/compañero a intentar desbloquear la app viendo la frase en pantalla. Los intentos se registran en la base de datos con etiqueta explícita `ground_truth = "IMPOSTOR_INFORMED"`, proveyendo el set de datos negativos indispensable para calcular el FAR y la curva ROC en el artículo.

```text
┌───────────────────────────────────────────┐
│ ← Modo Desafío: Ataque de Impostor         │
│                                           │
│ 🎯 INSTRUCCIÓN PARA EL ATACANTE:          │
│ "Mira la frase clave que está en pantalla.│
│  Intenta escribirla imitando el ritmo o   │
│  con tu propia velocidad. Tienes 5 tiros."│
│                                           │
│ Frase Visible Objetivo:                   │
│ ┌───────────────────────────────────────┐ │
│ │  s e g u r i d a d   u n t   2 0 2 6  │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Intento de Impostor: 1 de 5               │
│ [  Escriba aquí en el teclado táctil  ]  │
│                                           │
│ Resultado del Intento:                    │
│ ❌ ACCESO DENEGADO (Similitud: 34.2%)      │
│ Vector guardado como: ATTACK_SAMPLE_#1    │
│                                           │
│           [ Siguiente Intento ]           │
└───────────────────────────────────────────┘
```

---

### Pantalla 6: Verificación de Seguridad / Challenge de Configuración
**Propósito:** Impedir que un atacante que toma el teléfono desbloqueado desactive protecciones o altere bloques.

```text
┌───────────────────────────────────────────┐
│                                           │
│                     🛡️                    │
│         VERIFICACIÓN DE SEGURIDAD         │
│                                           │
│  Para modificar este bloque necesitas     │
│  confirmar tu identidad biométrica.       │
│                                           │
│  Teclea tu frase de administración:       │
│  ┌─────────────────────────────────────┐  │
│  │ "autorizo el cambio de seguridad"   │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [  T e c l a d o   T á c t i l   I n - A p p  ]│
│  [ Q ] [ W ] [ E ] [ R ] [ T ] [ Y ] ...  │
│  [   Espacio   ]              [ Borrar ]  │
│                                           │
│  Score Biométrico: 0.82 (Aceptado)        │
│                                           │
│  ─────── O Métodos Alternativos ───────   │
│                                           │
│  [ 👆 Usar Huella Digital ]               │
│  [ 📧 Código enviado a tu Correo ]        │
└───────────────────────────────────────────┘
```

---

## 6. Diseño del Overlay de Desbloqueo (Pantalla en Vivo al Abrir WhatsApp)

Cuando el usuario abre una aplicación protegida, el `AccessibilityService` despliega de inmediato esta interfaz táctil superpuesta:

```text
┌───────────────────────────────────────────┐
│ 🔒 WhatsApp está bloqueado                │
│                                           │
│ Frase requerida:                          │
│ ┌───────────────────────────────────────┐ │
│ │  m i s   s e c r e t o s   a q u i    │ │
│ └───────────────────────────────────────┘ │
│  👆 Teclea con tu ritmo natural           │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ m i s   s e [·]                     │  │
│  └─────────────────────────────────────┘  │
│  Avance: [████████░░░░░░░░░] 45%          │
│                                           │
│  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐│
│  │ Q │ W │ E │ R │ T │ Y │ U │ I │ O │ P ││
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤│
│  │ A │ S │ D │ F │ G │ H │ J │ K │ L │ Ñ ││
│  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘│
│      │ Z │ X │ C │ V │ B │ N │ M │ ⌫ │     │
│      └───┴───┴───┴───┴───┴───┴───┴───┘     │
│             [   E S P A C I O   ]         │
│                                           │
│ ❓ ¿Dificultad para teclear? [Usar 2FA]   │
└───────────────────────────────────────────┘
```

### Características Técnicas del Teclado Táctil Integrado:
1. **Precisión Temporal en Microsegundos:** Registra `pointerdown` y `pointerup` usando `performance.now()`.
2. **Medición de Presión:** `event.pressure` para capturar la fuerza del impacto táctil.
3. **Área de Contacto:** `event.width` y `event.height` (radio de la yema del pulgar).
4. **Desviación Espacial:** Coordenadas $(x, y)$ respecto al centroide geométrico de cada tecla virtual.

---

## 7. Plataforma Web del Investigador / Admin ("Observatorio Científico TecleoLlave")

Para que el administrador/investigador (tú) supervise el estudio y genere las tablas y figuras de su artículo científico, se define una aplicación web completa desarrollada en React + FastAPI.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             ARQUITECTURA DE LA PLATAFORMA WEB DEL INVESTIGADOR              │
│                                                                             │
│   Aplicaciones Móviles (Android)             Observatorio Web (Admin)       │
│   ┌───────────────────────────┐             ┌───────────────────────────┐   │
│   │ App Participante 01       │             │ Panel de Control Científico│  │
│   │ - 30 Repeticiones iniciales│             │ - Vista por Usuario       │  │
│   │ - Desbloqueos diarios     │             │ - Vista Global Poblacional│  │
│   │ - Ataques de Impostores   │             │ - Exportación LaTeX/CSV   │  │
│   └─────────────┬─────────────┘             └─────────────▲─────────────┘   │
│                 │                                         │                 │
│                 ▼ HTTPS / JSON Telemetry                  │ REST API / WSS  │
│   ┌───────────────────────────────────────────────────────┴─────────────┐   │
│   │                        BACKEND FASTAPI                              │   │
│   │  /api/v1/study/overview         /api/v1/study/users/{id}            │   │
│   │  /api/v1/study/roc-eer          /api/v1/study/export-latex          │   │
│   └──────────────────────────────────────┬──────────────────────────────┘   │
│                                          ▼                                  │
│                        PostgreSQL + TimescaleDB (Métricas)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.1 Módulo 1: Vista Individual por Usuario / Participante
Permite auditar el comportamiento biomecánico detallado de cada sujeto reclutado.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔬 OBSERVATORIO TECLEOLLAVE  ·  PARTICIPANTE: USR-042 (usuario@unitru.pe)  │
│ Estado: ACTIVO  |  Dispositivo: Xiaomi Redmi Note 13 (120Hz)  |  Mano: Diestro│
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. CURVA DE APRENDIZAJE MOTOR (WPM vs Repeticiones 1 a 30)                  │
│  WPM                                                                        │
│   45 │                                        ╭───────●──────● Meseta Final │
│   35 │                         ╭──────●───────╯                             │
│   25 │          ●──────●───────╯  Fase Asociativa                           │
│   15 │   ●──────╯ Fase Cognitiva                                            │
│      └───┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴─────     │
│         R1     R5     R10    R15    R20    R25    R28    R30 (Repetición)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. DESGLOSE DE TIEMPOS DE PULSACIÓN (Hold Time Boxplots por Tecla)          │
│  ms                                                                         │
│  120 │     ┬        ┬               ┬        ┬                              │
│   90 │    ┌┴┐      ┌┴┐             ┌┴┐      ┌┴┐      ┌─┐                    │
│   60 │    └┬┘      └┬┘             └┬┘      └┬┘      └┬┘                    │
│      └─────┴────────┴───────────────┴────────┴────────┴────────────────     │
│           's'      'e'     ...     'u'      'n'      't'                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. REGISTRO DE EVENTOS Y TELEMETRÍA                                         │
│ • Total Desbloqueos Reales Registrados: 142 (97.8% Éxito legítimo)          │
│ • Deriva Biométrica Actual ($D_t$): 0.12 (Estable dentro de umbral)         │
│ • Ataques de Impostores Sufridos: 15 (100% Bloqueados con éxito, FAR = 0.0%)│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.2 Módulo 2: Vista Global / Poblacional del Estudio (Para el Artículo)
Sintetiza la estadística inferencial de toda la cohorte de prueba ($N = 35 - 50$ participantes).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 RESUMEN POBLACIONAL DEL ESTUDIO CIENTÍFICO (N = 45 Sujetos)             │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ MÉTRICAS CLAVE GLOBALES              │ MATRIZ DE CONFUSIÓN GLOBAL           │
│ • Equal Error Rate (EER): 2.45%      │                Predicho              │
│ • Area Under Curve (AUC): 0.988      │            Legítimo   Impostor       │
│ • FAR (Zero-Effort): 0.62%           │ Legítimo    1,840       35   (FRR 1.8%)│
│ • FAR (Informed Impostors): 2.80%    │ Impostor       18      622   (FAR 2.8%)│
│ • FRR con Motor Adaptativo: 1.86%    │                                      │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ CURVA ROC POBLACIONAL                                                       │
│ 1.0 ┌─────────────────────────────────────────────────╭─────────────────────│
│     │                                          ╭──────╯  EER = 2.45%        │
│     │                                   ╭──────╯                            │
│ TPR │                            ╭──────╯                                   │
│     │                     ╭──────╯                                          │
│ 0.0 └─────────────────────┴─────────────────────────────────────────────────│
│    0.0                                          FPR                     1.0 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ANÁLISIS DE FACTORES:                                                       │
│ • Tasa de Refresco: Pantallas 120Hz reducen EER en 0.8% frente a 60Hz.     │
│ • Longitud de Frase: Frases de 18-24 caracteres logran el mejor balance EER.│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.3 Módulo 3: Motor de Exportación Académica Directa
Facilita la redacción del paper con herramientas de exportación en un clic:

1. **Botón `[Exportar Tablas a LaTeX]`:** Genera código listo para copiar y pegar en Overleaf:
   ```latex
   \begin{table}[htbp]
   \centering
   \caption{Rendimiento Biométrico según Tipo de Ataque y Adaptabilidad}
   \label{tab:biometric_performance}
   \begin{tabular}{lcccc}
   \hline
   \textbf{Configuración} & \textbf{EER (\%)} & \textbf{FAR (\%)} & \textbf{FRR (\%)} & \textbf{AUC} \\
   \hline
   Modelo Estático ($M_0$) & 5.12 & 3.10 & 7.20 & 0.945 \\
   Modelo Adaptativo ($M_t$) & \textbf{2.45} & \textbf{2.80} & \textbf{1.86} & \textbf{0.988} \\
   Impostor Casual (Zero-Effort) & 1.10 & 0.62 & 1.86 & 0.994 \\
   Impostor Informado (Shoulder) & 2.45 & 2.80 & 1.86 & 0.988 \\
   \hline
   \end{tabular}
   \end{table}
   ```
2. **Botón `[Descargar Dataset Anonimizado (.CSV / .JSON)]`:** Descarga vectores de características normalizados listos para análisis en Python (Pandas / SciPy).
3. **Botón `[Exportar Figuras en SVG de Alta Resolución]`:** Gráficos vectoriales sin pérdida de calidad para la publicación.

---

## 8. Propuestas Estratégicas de Innovación (UX y Calidad del Estudio)

A continuación, se presentan propuestas adicionales para potenciar tanto la experiencia del usuario como el impacto del artículo científico:

### Propuesta 1: Gamificación por Fases en el Enrolamiento de 30 Repeticiones
* **Problema:** Teclear la misma frase 30 veces seguidas causa fatiga motriz (*cramps*), lo que incrementa artificialmente la varianza de las últimas 10 muestras.
* **Solución UX:** Dividir las 30 repeticiones en **3 Bloques Temáticos de 10**:
  * *Bloque 1 (1-10): Calentamiento.* El teclado muestra ayudas visuales suaves.
  * *Bloque 2 (11-20): Enfoque y Ritmo.* Desaparecen las ayudas visuales; se muestra barra de ritmo estable.
  * *Bloque 3 (21-30): Prueba de Maestría.* Cronómetro visual no invasivo y medidor de consistencia porcentual en vivo ("¡Firma 94% pura!").
  * Entre bloques, una pantalla con animación de descanso de 15 segundos y ejercicios para relajar las muñecas.

### Propuesta 2: In-App "Modo Desafío Impostor" (Crowdsourcing de Ataques)
* **Impacto Científico:** Los revisores de artículos de revistas Q1/Q2 exigen evaluar el sistema ante atacantes informados (*Informed Impostors*).
* **Solución:** Una función dentro de la app móvil donde el usuario le entrega el móvil a un compañero para que intente vulnerar el bloqueo viendo la frase en pantalla. La app etiqueta automáticamente el intento como `ground_truth = IMPOSTOR_INFORMED`, asociando el ID del atacante y el del legítimo.

### Propuesta 3: Arquitectura *Offline-First* con Sincronización Diferida
* **Problema:** Un App Locker no puede fallar si el usuario no tiene conexión a internet en la calle.
* **Solución:**
  * El motor de clasificación liviano ($M_t$) evalúa localmente en el móvil en milisegundos usando un vector de parámetros descargado.
  * Los eventos de desbloqueo, tiempos de pulsación e intentos de intrusión se guardan en una base de datos local SQLite/Room cifrada con SQLCipher.
  * Cuando el dispositivo detecta conexión Wi-Fi o datos móviles, sincroniza en segundo plano mediante un worker silencioso (`WorkManager`) hacia el backend del investigador.

### Propuesta 4: Retroalimentación Háptica Hábil (*Haptic Micro-Feedback*)
* **Impacto UX y Biométrico:** Al teclear en pantallas de cristal planas, la falta de tacto físico incrementa el error de tipeo.
* **Solución:** Disparar una vibración háptica minúscula (10 a 15 ms) con `Vibrator.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))` en cada pulsación. La literatura demuestra que el feedback háptico reduce los tiempos de vuelo aberrantes y estabiliza la firma rítmica.

### Propuesta 5: Enriquecimiento Multimodal con Sensores de Movimiento (Giroscopio y Acelerómetro)
* **Contribución para el Paper:** Capturar los valores medios del acelerómetro durante el tecleo ($a_x, a_y, a_z$) permite clasificar la postura del usuario (tecleo en reposo vs tecleo caminando).
* **Sección Novedosa para el Paper:** Demostrar cómo el algoritmo adaptativo tolera la marcha del usuario sin degradar la seguridad.

---

## 9. Estructura y Plan para el Artículo Científico

### 9.1 Título Propuesto para el Paper
> **"Evaluación Empírica de la Biometría Conductual Táctil frente a Contraseñas Comunes: Mitigación de la Suplantación de Identidad a Nivel de Sistema y Aplicaciones en Dispositivos Móviles"**  
> *(Empirical Assessment of Touch Keystroke Biometrics Against Common Passwords: Mitigating Identity Theft at System and Application Levels in Mobile Devices)*

---

### 9.2 Planteamiento del Problema Científico
En la actualidad, los usuarios de teléfonos inteligentes continúan seleccionando contraseñas, PINs (ej. `1234`, `0000`, fechas de nacimiento) y patrones geométricos débiles o comunes debido a la fatiga cognitiva de contraseñas. Esto expone al dispositivo a una vulnerabilidad crítica: **la suplantación de identidad física (*physical impersonation / shoulder surfing*)**, donde un atacante casual o conocido:
1. **Suplanta el acceso al sistema del móvil** (desbloqueo de pantalla / Lockscreen).
2. **Suplanta el acceso a aplicaciones sensibles** (WhatsApp, bancos, billeteras digitales, galería) aprovechando el préstamo consentido o el descuido del teléfono desbloqueado.

Si el atacante conoce o adivina la contraseña común, los sistemas convencionales colapsan porque solo validan *lo que el usuario sabe*. A través de los resultados empíricos que arroja el software desarrollado (telemetría de tiempos, $FAR$, $FRR$, $EER$, tiempo de respuesta), este estudio evalúa si la biometría conductual táctil es **factible para convertir contraseñas comunes en barreras biométricas inviolables**, erradicando la suplantación de identidad a doble nivel.

---

### 9.3 Preguntas de Investigación (Research Questions - RQ)
* **$RQ_1$ (Factibilidad ante Contraseñas Comunes):** ¿Puede el software discriminar con precisión ($FAR < 3\%$) a un atacante que teclea una contraseña común o predecible que coincide exactamente con el texto de la víctima?
* **$RQ_2$ (Suplantación a Nivel de Sistema vs. Aplicaciones):** ¿Existe una diferencia significativa en la efectividad contra la suplantación de identidad cuando el software protege el acceso general al sistema del teléfono (Lockscreen Overlay) frente a la protección granular de aplicaciones críticas (App Locker)?
* **$RQ_3$ (Viabilidad y Desempeño Operativo del Software):** Según los resultados de telemetría y tiempos de inferencia en milisegundos que reporta el software, ¿es viable este mecanismo para el uso cotidiano sin introducir retardos que degraden la experiencia del usuario?

---

### 9.4 Hipótesis de Investigación Formales

#### Hipótesis Principal ($H_1$ - Neutralización de Contraseñas Comunes):
> **$H_1$:** *La integración de biometría conductual táctil en el software permite que el uso de contraseñas o frases comunes de hoy en día sea factible y seguro frente a ataques de suplantación de identidad, manteniendo una Tasa de Falsa Aceptación ($FAR$) inferior al $3\%$ y un $EER \le 2.5\%$, desacoplando la seguridad del secreto textual de la contraseña hacia la firma neuromuscular del usuario.*
* **Criterio de Validación en el Software:** El software registrará ataques de impostores que teclean la misma frase común del usuario. Si el score de similitud biométrica se mantiene bajo el umbral de decisión ($\theta$) en $> 97\%$ de los casos, $H_1$ se acepta.

#### Hipótesis Secundaria 1 ($H_2$ - Protección Dual: Sistema Móvil vs. Apps):
> **$H_2$:** *La eficacia en la prevención de la suplantación de identidad reportada por el software es invariante y estadísticamente consistente ($p > 0.05$) tanto en el punto de ingreso al sistema del dispositivo móvil (escudo de pantalla) como en el acceso individual a aplicaciones protegidas (App Locker), neutralizando la suplantación tanto en accesos no autorizados al teléfono como en escenarios de préstamo consentido.*
* **Criterio de Validación en el Software:** Comparación de matrices de confusión y métricas $EER$ obtenidas en el módulo de pantalla de bloqueo frente a los eventos de intercepción de aplicaciones (WhatsApp/Bancos).

#### Hipótesis Secundaria 2 ($H_3$ - Viabilidad Operativa y Usabilidad en Móviles):
> **$H_3$:** *El procesamiento de las 30 muestras de entrenamiento y la inferencia biométrica local en el dispositivo móvil se ejecutan en un tiempo inferior a $50\text{ ms}$ con un retardo total de desbloqueo menor a $1.8\text{ s}$, demostrando mediante la telemetría empírica del software que la solución es viable y apta para el reemplazo o robustecimiento de los PINs y patrones convencionales.*
* **Criterio de Validación en el Software:** Registro de timestamps en microsegundos (`performance.now()`), tasa de rechazo falso ($FRR < 2\%$) y distribución del tiempo de autenticación recopilados en el Observatorio Web.

---

### 9.5 Diseño Experimental Orientado a los Resultados del Software

```
                             Población del Estudio
                          (N = 35 a 50 Participantes)
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
  Evaluación Nivel 1: Contraseñas Comunes                   Evaluación Nivel 2: Doble Barrera
  - Prueba A: Contraseñas/Frases comunes de hoy             - Barrera A: Ingreso al Sistema Móvil
    (ej: "clave123456", "micelular2026")                      (Overlay al encender pantalla)
  - Prueba B: Frases personalizadas del usuario             - Barrera B: Ingreso a Apps Específicas
  - Enrolamiento de 30 repeticiones en el software            (App Locker para WhatsApp / Banco)
        │                                                             │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
  Pruebas de Ataque y Suplantación de Identidad (Modo Impostor In-App)
  - Escenario 1: Suplantador conoce la contraseña común e intenta ingresar al móvil.
  - Escenario 2: Teléfono prestado; suplantador intenta ingresar a WhatsApp/Banco.
  - El software etiqueta los intentos como: GROUND_TRUTH = "IMPOSTOR_KNOWN_CREDENTIAL".
                                       │
                                       ▼
  Extracción de Resultados y Telemetría en el Observatorio Web Admin
  - FAR ante contraseñas comunes vs. frases personalizadas (Validación H1).
  - Comparativa de EER: Sistema del teléfono vs. Apps protegidas (Validación H2).
  - Tiempos de respuesta y usabilidad en milisegundos (Validación H3).
  - Generación de tablas LaTeX y gráficos ROC para publicación.
```

---

## 10. Hoja de Ruta de Implementación Técnica Actualizada

| Componente | Módulos a Desarrollar / Adaptar | Tecnologías |
| :--- | :--- | :--- |
| **Backend Auth & Study** | Endpoints de OTP por email (`/auth/register-request`, `/auth/verify-code`) y recepción de paquetes de 30 repeticiones (`/study/enroll-30`). | Python, FastAPI, Pydantic, SQLAlchemy, Resend/SMTP |
| **App Móvil (Core)** | Interfaz de usuario móvil (pantallas de registro OTP, enrolamiento gamificado 30 reps, dashboard, configuración de apps/bloques y modo impostor). | React, Capacitor 6, Vanilla CSS, Lucide Icons |
| **Teclado Táctil Móvil** | Componente de teclado virtual in-app con micro-precisión temporal (`performance.now()`), captura de presión y vibración háptica. | Web Pointer Events API, Web Audio/Vibration API |
| **Servicio Android** | Plugin de Accesibilidad y Superposición de Pantalla (`AccessibilityService` + `SYSTEM_ALERT_WINDOW`). | Java / Kotlin, Android SDK 34 |
| **Observatorio Web Admin** | Dashboard web de investigación con vistas individual y poblacional, gráficas interactivas y exportador LaTeX/CSV. | React, Recharts/Chart.js, Lucide Icons |

---

## 11. Conclusión

La ampliación del diseño para incluir:
1. **Identificación formal de participantes mediante correo y verificación OTP**,
2. **Protocolo de enrolamiento riguroso de 30 repeticiones estructurado para neutralizar la fatiga**,
3. **Observatorio web del investigador con análisis individual y macroscópico**, y
4. **Mecanismos de ataque controlado (Modo Impostor)**,

transforma a TecleoLlave-Adapt de una aplicación utilitaria en una **plataforma experimental de ciberseguridad biométrica de nivel doctoral**, lista para generar datos científicos reproducibles y de alto impacto académico.
