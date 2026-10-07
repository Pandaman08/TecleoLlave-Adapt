#!/usr/bin/env bash
# ==============================================================================
# Script de Inicio Rápido: Backend FastAPI + Base de Datos + Túnel Ngrok Fijo
# TECLEOLLAVE-ADAPT (Seguridad de la Información - UNT)
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_DIR="$BACKEND_DIR/.venv"
DOMAIN="dime-bucket-filling.ngrok-free.dev"

echo "=========================================================="
echo "🚀 INICIANDO SISTEMA TECLEOLLAVE-ADAPT (BACKEND + NGROK)"
echo "=========================================================="

# 1. Comprobar entorno virtual de Python
if [ ! -d "$VENV_DIR" ]; then
    echo "❌ Error: No se encontró el entorno virtual en $VENV_DIR"
    exit 1
fi

# 2. Comprobar binario ngrok
NGROK_BIN="$(which ngrok 2>/dev/null || echo "$HOME/bin/ngrok")"
if [ ! -x "$NGROK_BIN" ]; then
    echo "❌ Error: No se encontró el binario 'ngrok'."
    echo "Verifica que esté instalado en tu PATH o en $HOME/bin/ngrok."
    exit 1
fi

# 3. Verificar si el authtoken de ngrok está configurado
if ! "$NGROK_BIN" config check >/dev/null 2>&1; then
    echo "⚠️ Advertencia: No se detectó el authtoken de ngrok configurado."
    echo "Para configurarlo, obtén tu token en https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "y ejecuta en la terminal:"
    echo "    ngrok config add-authtoken <TU_AUTHTOKEN>"
    echo ""
    read -p "¿Deseas ingresar tu authtoken ahora? (deja en blanco para intentar continuar): " USER_TOKEN
    if [ -n "$USER_TOKEN" ]; then
        "$NGROK_BIN" config add-authtoken "$USER_TOKEN"
        echo "✓ Authtoken guardado con éxito."
    fi
fi

# Función de limpieza al pulsar Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    if [ -n "$UVICORN_PID" ]; then
        kill "$UVICORN_PID" 2>/dev/null || true
    fi
    if [ -n "$NGROK_PID" ]; then
        kill "$NGROK_PID" 2>/dev/null || true
    fi
    echo "✅ Servicios detenidos correctamente."
    exit 0
}
trap cleanup SIGINT SIGTERM

# 4. Iniciar Backend FastAPI (con base de datos SQLite integrada)
echo "📡 1/2 Iniciando Backend FastAPI en http://127.0.0.1:8000..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"

# Inicializar/verificar base de datos SQLite
python -c "from app.database import init_db; init_db()"

# Levantar Uvicorn en segundo plano con hot-reload activado
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/tecleollave_uvicorn.log 2>&1 &
UVICORN_PID=$!

# Esperar 2 segundos para asegurar arranque del backend
sleep 2
if ! kill -0 "$UVICORN_PID" 2>/dev/null; then
    echo "❌ Error: Uvicorn no pudo iniciar. Revisa el log:"
    cat /tmp/tecleollave_uvicorn.log
    exit 1
fi
echo "   ✓ Backend y SQLite activos (PID: $UVICORN_PID)."

# 5. Iniciar Túnel Ngrok con el dominio fijo
echo ""
echo "🌐 2/2 Conectando Túnel Ngrok con dominio permanente: $DOMAIN..."
"$NGROK_BIN" http --url="$DOMAIN" 8000 > /tmp/tecleollave_ngrok.log 2>&1 &
NGROK_PID=$!

# Esperar 2 segundos para verificar si ngrok arrancó sin error
sleep 2
if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    echo "❌ Error al iniciar ngrok. Revisa el log:"
    cat /tmp/tecleollave_ngrok.log
    echo ""
    echo "💡 Recuerda configurar tu authtoken con: ngrok config add-authtoken <TU_TOKEN>"
    cleanup
    exit 1
fi

echo ""
echo "=========================================================="
echo "🎉 ¡SISTEMA EN LÍNEA Y OPERATIVO CON DOMINIO PERMANENTE!"
echo "🌐 URL Pública Fija:  https://$DOMAIN"
echo "📡 Endpoint API Base: https://$DOMAIN/api"
echo "🩺 Health Check:      https://$DOMAIN/api/health"
echo "=========================================================="
echo "💡 La APK ya tiene este dominio preconfigurado de fábrica."
echo "   No necesitas ingresar ninguna URL en los celulares."
echo "   Deja esta terminal abierta mientras realices pruebas."
echo "   Pulsa Ctrl+C para apagar el sistema cuando termines."
echo "=========================================================="

# Mantener script corriendo y redirigir logs
wait "$UVICORN_PID"
