# Cambios Opcionales y Futuros para la APK Móvil (v2.0)
**Proyecto:** TecleoLlave-Adapt: Biometría Conductual Táctil Móvil  
**Documento:** Especificación de Telemetría Extendida para Clientes Android  

---

## 1. Estado Actual de la APK
La APK compilada actual (`TecleoLlave-Adapt.apk`, v1.0) es **100% compatible** con el backend y el módulo de Análisis de Hipótesis.

El backend cuenta con mecanismos de tolerancia y estimación para muestras que no contengan los nuevos campos:
- **Inferencia:** El backend mide la duración de inferencia directamente en el servidor si el cliente no la envía.
- **Retardo total:** Si no se envía `total_unlock_delay_ms`, se utiliza la duración neuromuscular de tecleo de la frase (`features.total_time_ms`).
- **Contexto:** Si `auth_context` es nulo, se infiere automáticamente: `target_app == 'SYSTEM_LOCK'` $\implies$ Bloqueo Maestro; de lo contrario $\implies$ App Locker.
- **Red:** Si `network_connection_type` es nulo, se etiqueta por defecto como `WIFI`.

---

## 2. Telemetría Extendida para Futuras Versiones del APK

En futuras actualizaciones del APK (versión 2.0+), se recomienda incluir los siguientes campos opcionales en el payload de `/api/mobile/study/evaluate-auth` y en la cola local IndexedDB:

### 2.1 Campos Recomendados en el Payload

```json
{
  "participant_id": 12,
  "phrase_typed": "La seguridad protege la información",
  "raw_events": [ ... ],
  "target_app": "WhatsApp",
  "ground_truth": "LEGITIMATE",
  "device_posture": "ESTATICO",
  "client_event_id": "a3b8c9d0-...",
  
  "inference_time_ms": 14.8,
  "total_unlock_delay_ms": 845.2,
  "network_connection_type": "WIFI",
  "challenge_session_id": "sess-98f7e6...",
  "attempt_number": 1,
  "auth_context": "APPLOCKER"
}
```

### 2.2 Descripción de Cada Campo

| Campo | Tipo | Origen en Android / Capacitor | Propósito en el Paper |
| :--- | :--- | :--- | :--- |
| `inference_time_ms` | `Float` | Medido con `performance.now()` en el cliente antes y después del procesamiento. | Telemetría precisa de latencia para la Hipótesis $H_3$ (< 50 ms). |
| `total_unlock_delay_ms` | `Float` | `performance.now() - modalOpenTimestamp` en el momento en que se desbloquea. | Medición empírica del retardo total de desbloqueo (< 1.8 s). |
| `network_connection_type` | `String` | Plugin `@capacitor/network`: `Network.getStatus().then(s => s.connectionType)`. Valores: `'wifi'`, `'cellular'`, `'none'`. | Desglose comparativo de rendimiento por tipo de red móvil. |
| `challenge_session_id` | `String` | Generado con `crypto.randomUUID()` cada vez que se levanta el modal de bloqueo. | Permite agrupar intentos para calcular el FAR por sesión de reintentos. |
| `attempt_number` | `Integer` | Contador incremental (1, 2, 3...) dentro de la misma sesión de desbloqueo. | Curva de FAR según número de intentos permitidos al usuario. |
| `auth_context` | `String` | `'SYSTEM_LOCK'` si intercepta el desbloqueo maestro del teléfono, o `'APPLOCKER'` si intercepta una app protegida. | Contraste pareado directo para la Hipótesis $H_2$. |

---

## 3. Ejemplo de Implementación en React / Capacitor

En `frontend/src/components/mobile/VerificationChallengeModal.jsx`:

```javascript
// Al abrir el modal
const sessionStartTime = useRef(performance.now());
const challengeSessionId = useRef(crypto.randomUUID());
const [attemptCount, setAttemptCount] = useState(1);

// Al enviar el reto
const totalDelay = performance.now() - sessionStartTime.current;

await api.post('/mobile/study/evaluate-auth', {
  participant_id: participant.id,
  phrase_typed: typedText,
  raw_events: capturedEvents,
  target_app: targetName,
  auth_context: targetName === 'SYSTEM_LOCK' ? 'SYSTEM_LOCK' : 'APPLOCKER',
  total_unlock_delay_ms: Math.round(totalDelay),
  challenge_session_id: challengeSessionId.current,
  attempt_number: attemptCount,
  network_connection_type: navigator.onLine ? 'WIFI' : 'OFFLINE'
});
```
