# GUÍA TÉCNICA: DESPLIEGUE, GENERACIÓN DEL APK ANDROID Y PROTOCOLO DE ESTUDIO CIENTÍFICO

**Proyecto:** TecleoLlave-Adapt (Seguridad de la Información - UNT)  
**Destinatario:** Investigador Principal (Admin)  
**Fecha:** Octubre 2026  

---

## 1. Resumen de Componentes Implementados y Refactorizados

El sistema ha sido completamente implementado y verificado en código de producción:

| Componente | Ruta en el Proyecto | Funcionalidad Clave |
| :--- | :--- | :--- |
| **Modelos de Estudio & OTP** | `backend/app/models/mobile_study.py` | Tablas `mobile_otps`, `mobile_participants` y `mobile_study_samples` (almacena timestamps, presiones, latencias y etiquetas de ground truth). |
| **Servicio de Estudio Científico** | `backend/app/services/mobile_study_service.py` | Motor de cálculo de 30 repeticiones (curva de aprendizaje motor de Newell & Rosenbloom), inferencia biométrica en caliente con deriva $M_t$, y agregador de métricas poblacionales ($FAR, FRR, EER, AUC$). |
| **API Endpoints Móviles** | `backend/app/api/mobile_study.py` | Endpoints `/mobile/auth/request-otp`, `/mobile/auth/verify-otp`, `/mobile/study/enroll-30`, `/mobile/study/evaluate-auth`, `/mobile/study/observatory/overview` y exportador `/export/csv`. |
| **Teclado Táctil In-App** | `frontend/src/components/mobile/MobileTouchKeyboard.jsx` | Captura con microsegundos (`performance.now()`), presión de contacto táctil, radio de pulgar y retroalimentación háptica (vibración de 15 ms). |
| **App Locker Móvil** | `frontend/src/pages/mobile/MobileAppContainer.jsx` | Experiencia móvil completa: Onboarding con consentimiento ético, verificación OTP, enrolamiento gamificado en 3 series de 10 con descansos, suite AppLocker, modo desafío impostor y overlay en vivo de desbloqueo. |
| **Observatorio Científico Web** | `frontend/src/pages/admin/ObservatorioWeb.jsx` | Panel web para el admin con vista poblacional (curvas ROC, matriz de confusión, validación de hipótesis $H_1, H_2, H_3$), generador de tablas en LaTeX para Overleaf y vista individual por participante. |
| **Configuración Capacitor** | `frontend/capacitor.config.json` | Configuración oficial para empaquetado directo a proyecto nativo Android Studio. |

---

## 2. Pruebas Locales Inmediatas (Web & Emulador)

Antes de compilar el APK, puedes ejecutar y probar toda la suite en tu navegador:

### 2.1 Iniciar el Backend FastAPI
En una terminal:
```bash
cd "/run/media/pandaman/Datos1/UNT/4to AÑO/VIII/Seguridad de la Información/TecleoLlave-Adapt/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2.2 Iniciar el Frontend Vite
En otra terminal:
```bash
cd "/run/media/pandaman/Datos1/UNT/4to AÑO/VIII/Seguridad de la Información/TecleoLlave-Adapt/frontend"
npm run dev
```

### 2.3 URLs de Acceso Directo:
* **App Móvil (Experiencia del Participante / Alumno):**  
  👉 `http://localhost:5173/mobile`  
  *(Permite simular el smartphone con marco realista, solicitar el OTP, entrenar las 30 repeticiones y probar el bloqueo de WhatsApp y el modo impostor)*.
* **Observatorio Científico (Panel del Investigador - Tú):**  
  👉 `http://localhost:5173/admin/observatorio`  
  *(Permite ver las métricas globales, curvas ROC, matriz de confusión, el desglose individual por participante, copiar el código LaTeX y descargar el dataset CSV)*.

---

## 3. Paso a Paso para Generar el APK Nativo de Android

Para empaquetar la aplicación en un archivo `.apk` instalable en teléfonos Android reales:

### Paso 1: Instalar dependencias de Capacitor en el frontend
En la carpeta `frontend`:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Paso 2: Compilar el código de producción Web
```bash
npm run build
```
*(Esto genera la carpeta optimizada `dist/` que ya fue verificada con éxito).*

### Paso 3: Inicializar la plataforma Android
```bash
npx cap add android
```
*(Esto crea automáticamente el proyecto nativo en `frontend/android/`).*

### Paso 4: Sincronizar cambios web hacia Android
```bash
npx cap sync
```

### Paso 5: Abrir el proyecto en Android Studio
```bash
npx cap open android
```

### Paso 6: Configurar Permisos del AppLocker en `AndroidManifest.xml`
En Android Studio, abre el archivo `app/src/main/AndroidManifest.xml` y asegúrate de que incluya los permisos necesarios para el App Locker:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Conectividad con el backend del observatorio -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Retroalimentación háptica por pulsación -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Permisos esenciales de App Locker -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
...
```

### Paso 7: Generar el archivo APK
En la barra superior de Android Studio:
1. Menú **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. Al terminar la compilación en Gradle, Android Studio mostrará un globo emergente con el botón **locate**.
3. El archivo generado estará en:
   `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 4. Protocolo de Difusión y Recolección de Datos con Alumnos de la UNT

Para ejecutar el estudio empírico con rigor científico para tu artículo:

1. **Despliegue del Backend:**
   * Despliega el backend en un VPS (ej. DigitalOcean, Render, AWS o en una IP pública de la universidad) para que las APKs puedan enviar telemetría desde cualquier red móvil.
   * Cambia la URL base en la configuración de la app por la URL de tu servidor desplegado.
2. **Difusión del APK:**
   * Sube el archivo `.apk` a una carpeta de Google Drive institucional o distribúyelo mediante un código QR en el aula de clases.
3. **Flujo de los Participantes ($N = 35 - 50$):**
   * **Paso A:** El alumno instala la app y abre el formulario de consentimiento ético.
   * **Paso B:** Ingresa su correo (`@unitru.edu.pe`) y recibe su código de 6 dígitos.
   * **Paso C:** Crea su frase o selecciona una contraseña común de estudio y realiza el entrenamiento de **30 repeticiones**.
   * **Paso D (Uso Longitudinal):** Usa la app durante 7 a 14 días para bloquear aplicaciones cotidianas como WhatsApp, BCP o Galería.
   * **Paso E (Campaña de Ataques de Impostores):** En el aula o laboratorio, el alumno abre el **Modo Desafío Impostor** y le entrega su celular a un compañero para que intente vulnerar la clave visible 5 veces.
4. **Monitoreo y Extracción de Resultados:**
   * Tú como admin abres `http://localhost:5173/admin/observatorio`.
   * Presionas el botón **"Copiar Tablas LaTeX"** y pegas las tablas de resultados directamente en tu plantilla de Overleaf (IEEE Transactions / Scopus).
   * Presionas **"Exportar Dataset CSV"** para adjuntar los datos suplementarios de investigación.
