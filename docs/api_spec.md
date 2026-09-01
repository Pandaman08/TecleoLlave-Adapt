# Especificación API TECLEOLLAVE-ADAPT

## Base URL
```
http://localhost:8000/api
```

## Autenticación
- Login: `POST /auth/login` → JWT en respuesta
- Header: `Authorization: Bearer <token>`

---

## Fase 1 - Implementado

### Healthcheck
```
GET /health
```
**Respuesta 200:**
```json
{
  "status": "ok",
  "db": "connected",
  "version": "1.0.0"
}
```

---

## Fase 2+ - Pendientes

### Autenticación
```
POST /auth/register
POST /auth/login
POST /auth/verify-challenge
```

### Dinámica de Teclado
```
POST /typing/enroll
POST /typing/authenticate
GET  /typing/samples/{user_id}
```

### Machine Learning
```
POST /ml/train
GET  /ml/model/{user_id}
POST /ml/evaluate
```

### Adaptación
```
POST /adaptive/process-auth-result
GET  /adaptive/candidate-status/{user_id}
POST /adaptive/force-evaluation/{user_id}
GET  /adaptive/config/{user_id}
PUT  /adaptive/config/{user_id}
```

### Experimentos
```
POST /experiment/static-vs-adaptive
GET  /experiment/results/{experiment_id}
GET  /experiment/list
```

### Dashboard
```
GET /dashboard/stats/{user_id}
GET /dashboard/auth-history/{user_id}
GET /dashboard/adaptation-history/{user_id}
```

---

## Códigos de Error Estándar
| Código | Significado |
|--------|-------------|
| 400 | Validación fallida |
| 401 | No autenticado / Token inválido |
| 403 | No autorizado |
| 404 | Recurso no encontrado |
| 422 | Error de validación Pydantic |
| 500 | Error interno |