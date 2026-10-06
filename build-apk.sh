#!/usr/bin/env bash
# ==============================================================================
# Script de compilación automática del APK de Android (Ubuntu CLI)
# TecleoLlave-Adapt - Biometría Conductual UNT
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"

echo "=========================================================="
echo "🚀 Iniciando compilación de APK Android (TecleoLlave)"
echo "=========================================================="

# 1. Configurar Entorno Java 21 LTS y Android SDK
export JAVA_HOME="/home/pandaman/.local/share/mise/installs/java/21.0.2"
export ANDROID_HOME="/home/pandaman/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "☕ Java: $($JAVA_HOME/bin/java -version 2>&1 | head -n 1)"
echo "📱 Android SDK: $ANDROID_HOME"

# 2. Compilar Frontend Web (Vite)
echo ""
echo "📦 1/3 Compilando Frontend con Vite..."
cd "$FRONTEND_DIR"
npm run build

# 3. Sincronizar activos web con el proyecto nativo Android (Capacitor)
echo ""
echo "🔄 2/3 Sincronizando con Capacitor Android..."
npx cap sync android

# 4. Compilar APK con Gradle
echo ""
echo "⚙️ 3/3 Ensamblando APK Debug con Gradle..."
cd "$ANDROID_DIR"
./gradlew assembleDebug

# 5. Comprobar resultado
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "=========================================================="
    echo "✅ ¡APK COMPILADO CON ÉXITO!"
    echo "📍 Ubicación: $APK_PATH"
    echo "⚖️ Tamaño: $APK_SIZE"
    echo "=========================================================="
    echo "Para pasarlo a tu celular Android:"
    echo "  1) Conectar por cable USB con depuración USB y ejecutar:"
    echo "     adb install -r \"$APK_PATH\""
    echo "  2) O transferir el archivo 'app-debug.apk' por Telegram, Google Drive, WhatsApp o cable."
    echo "=========================================================="
else
    echo "❌ Error: No se encontró el APK generado en $APK_PATH"
    exit 1
fi
