# Despliegue del Backend en Render con Neon

Esta guía despliega FastAPI en Render y usa PostgreSQL administrado por Neon. El frontend web local y la APK pueden consumir la URL HTTPS de Render.

## Importante

- La plantilla `render.yaml` usa el plan `starter` y un disco persistente de 1 GB para los artefactos de modelos. Ambos pueden generar cargos. Render Free no ofrece disco persistente; si se elimina el disco, un redeploy puede borrar los modelos entrenados aunque PostgreSQL conserve las filas `model_versions`.
- El servicio puede tardar en iniciar durante un deploy y no ofrece alta disponibilidad en esta configuración de una sola instancia.
- Esta configuración crea un esquema nuevo con SQLAlchemy. No migra automáticamente una base SQLite existente ni sus modelos.
- Antes de recibir datos biométricos reales, protege con autenticación y autorización los endpoints móviles y del observatorio, y verifica los permisos de administrador. Algunas rutas actuales usan un `participant_id` enviado por el cliente y no exigen JWT; no publiques datos de participantes hasta cerrar ese acceso.
- Revisa el consentimiento del estudio, la retención de datos y los respaldos. No guardes `DATABASE_URL`, contraseñas ni datos biométricos en GitHub.

## 1. Crear la base en Neon

1. Crea un proyecto PostgreSQL en Neon.
2. Copia la URL de conexión recomendada para una aplicación. Puede ser la URL con pooler; debe empezar con `postgresql://` o `postgres://` y tener SSL habilitado (`sslmode=require`).
3. Conserva la URL como secreto. No la pongas en archivos versionados.

La aplicación convierte ambas formas de URL a `postgresql+psycopg://` y usa `psycopg` 3.

## 2. Desplegar el backend en Render

1. Sube el repositorio a GitHub sin bases reales, `.env`, credenciales ni modelos de participantes.
2. En Render selecciona **New > Blueprint** y conecta el repositorio. Render leerá `render.yaml`.
3. Al crear el servicio, proporciona `DATABASE_URL` con la URL copiada de Neon. Render genera `SECRET_KEY` y configura `DEBUG=false`, `MODELS_DIR=/var/data/models` y el chequeo `/api/health`.
4. Conserva el disco persistente configurado en `/var/data`. No cambies el servicio a Free esperando que ese disco siga disponible.
5. Espera el estado **Live** y prueba:

   ```text
   https://TU-SERVICIO.onrender.com/api/health
   ```

   La respuesta debe indicar `status: "ok"` y `db: "connected"`. Si falla la base, el endpoint responde HTTP 503.

## 3. Conectar frontend local y APK

La app ya permite configurar una URL de servidor en la pantalla móvil. Ingresa el origen de Render, por ejemplo `https://TU-SERVICIO.onrender.com`; el cliente construye las rutas bajo `/api` y el chequeo usa `/api/health`.

Para configurar el frontend web local sin usar el modal:

```env
VITE_API_URL=https://TU-SERVICIO.onrender.com/api
```

Guarda ese valor en `frontend/.env.local` (archivo ignorado por Git) y reinicia Vite. Para compilar la APK con la URL fijada en build:

```bash
cd frontend
VITE_API_URL=https://TU-SERVICIO.onrender.com/api npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Si configuras la URL desde la APK, no es necesario recompilar para cambiar el servidor. Para la URL fija de Vite, sí hay que volver a compilar.

## 4. Datos existentes y copias de seguridad

Los usuarios, muestras y referencias a versiones de modelo se guardan en Neon. Los ficheros del modelo (clasificador, escalador, calibrador y metadata) quedan bajo `/var/data/models` y se conservan en el disco de Render entre reinicios y despliegues.

La SQLite local no se copia automáticamente a Neon. Si necesitas conservar cuentas o datos existentes, prepara y prueba una migración controlada antes de cambiar el frontend a la URL pública. Haz un respaldo de PostgreSQL y del disco de modelos por separado; el disco persistente no sustituye un respaldo.

## 5. Vercel

Vercel está optimizado para funciones serverless y frontend. Este backend mantiene FastAPI, scikit-learn y artefactos de modelos en disco; por eso Render con disco persistente es la ruta prevista por esta configuración. No despliegues este Dockerfile en Vercel esperando que el sistema de archivos de una función conserve los modelos entrenados.