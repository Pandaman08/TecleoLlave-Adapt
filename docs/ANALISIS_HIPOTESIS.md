# Metodología y Marco Analítico: Módulo de Análisis de Hipótesis ($H_1, H_2, H_3$)
**Proyecto:** TecleoLlave-Adapt: Biometría Conductual Táctil y App Locker Adaptativo en Android  
**Institución:** Universidad Nacional de Trujillo — Seguridad de la Información  

---

## 1. Introducción y Marco Teórico

El módulo **Análisis de Hipótesis** del Observatorio Web permite contrastar empíricamente las tres hipótesis formuladas en la investigación mediante datos telemetricos reales recopilados por la aplicación móvil.

A diferencia de los paneles de monitoreo convencionales que únicamente calculan estimadores puntuales, este módulo implementa un **marco estadístico inferencial estricto**:
1. **Intervalos de Confianza Exactos:** Cálculo de proporciones mediante la distribución Beta (Clopper-Pearson).
2. **Bootstrap por Conglomerados de Participante:** Muestreo no paramétrico donde la unidad de remuestreo es el sujeto y no el intento, evitando la subestimación de la varianza producida por correlación intra-sujeto.
3. **Criterio de Veredicto Conservador:** Todo criterio de cota superior ($FAR < 3\%$, $EER \le 2.5\%$, $FRR < 2\%$) se evalúa sobre el **límite superior del Intervalo de Confianza al 95%** ($IC_{95\%}^{sup}$).

---

## 2. Hipótesis Científicas y Criterios Operativos

### Hipótesis Principal ($H_1$): Neutralización de Contraseñas Comunes
> **Enunciado:** *La integración de biometría conductual táctil en el software permite que el uso de contraseñas o frases comunes sea factible y seguro frente a ataques de suplantación de identidad, manteniendo una Tasa de Falsa Aceptación ($FAR$) inferior al $3\%$ y un $EER \le 2.5\%$, desacoplando la seguridad del secreto textual hacia la firma neuromuscular del usuario.*

* **Criterio de Aceptación:**
  $$\text{FAR}_{IC, 95\%}^{sup} < 3.00\% \quad \land \quad \text{EER}_{IC, 95\%}^{sup} \le 2.50\%$$
* **Variables Analizadas:**
  - Puntuaciones de similitud $S \in [0.05, 0.99]$ generadas por el vector de Z-score normalizado frente al perfil motor del usuario legítimo.
  - Intentos de impostores informados (que teclean la misma frase idéntica) e impostores de esfuerzo cero sintetizados mediante evaluación cruzada inter-sujeto (`CROSS_EVAL`).
  - Umbral de decisión $\theta$ (por defecto $\theta = 0.75$).

---

### Hipótesis Secundaria 1 ($H_2$): Protección Dual (Sistema Móvil vs. Apps)
> **Enunciado:** *La eficacia en la prevención de la suplantación de identidad reportada por el software es invariante y estadísticamente consistente ($p > 0.05$) tanto en el punto de ingreso al sistema del dispositivo móvil (escudo de pantalla maestro) como en el acceso individual a aplicaciones protegidas (App Locker), neutralizando la suplantación tanto en accesos no autorizados al teléfono como en escenarios de préstamo consentido.*

* **Criterio de Aceptación:**
  $$p_{\text{Wilcoxon}} > 0.05 \quad \land \quad \text{TOST}_{\pm 3.0\%} \text{ (Equivalencia Demostrada)}$$
* **Variables Analizadas:**
  - Contexto 1: `SYSTEM_LOCK` (Pantalla de bloqueo de la APK).
  - Contexto 2: `APPLOCKER` (Aplicaciones interceptadas: WhatsApp, Bancos, Galería, etc.).
  - Diferencia pareada intra-sujeto en puntuación y en $EER$: $d_i = \text{Score}_{i}^{\text{SYSTEM}} - \text{Score}_{i}^{\text{APPLOCKER}}$.

---

### Hipótesis Secundaria 2 ($H_3$): Viabilidad Operativa y Usabilidad en Móviles
> **Enunciado:** *El procesamiento y la inferencia biométrica en el dispositivo móvil se ejecutan en un tiempo inferior a $50\text{ ms}$ con un retardo total de desbloqueo menor a $1.8\text{ s}$, y una tasa de rechazo falso $FRR < 2.0\%$, demostrando mediante la telemetría empírica del software que la solución es viable y apta para el reemplazo o robustecimiento de los PINs y patrones convencionales.*

* **Criterio de Aceptación:**
  $$P_{95}(\text{Inferencia}) < 50.0\text{ ms} \quad \land \quad P_{95}(\text{Retardo Total}) < 1800.0\text{ ms} \quad \land \quad \text{FRR}_{neto, IC, 95\%}^{sup} < 2.00\%$$
* **Variables Analizadas:**
  - `inference_time_ms`: Tiempo de ejecución del algoritmo de extracción de características y distancia Mahalanobis/Z-score en milisegundos.
  - `total_unlock_delay_ms`: Tiempo transcurrido desde la presentación del desafío hasta la confirmación visual de desbloqueo.
  - Descomposición de $FRR$: $FRR$ general vs. $FRR$ biológico neto (excluyendo fallos por timeout o conectividad nula).

---

## 3. Fórmulas y Procedimientos Estadísticos

### 3.1 Intervalo de Confianza Exacto de Clopper-Pearson
Para una proporción binomial de $k$ eventos observados en $n$ ensayos independientes con nivel de confianza $1 - \alpha$ ($\alpha = 0.05$):

$$\text{Si } k = 0: \quad [0, \, 1 - (\alpha/2)^{1/n}]$$
$$\text{Si } k = n: \quad [(\alpha/2)^{1/n}, \, 1]$$
$$\text{Si } 0 < k < n: \quad \left[ B\left(\frac{\alpha}{2}; k, n - k + 1\right), \, B\left(1 - \frac{\alpha}{2}; k + 1, n - k\right) \right]$$

Donde $B(p; a, b)$ denota el cuantil de orden $p$ de una distribución Beta con parámetros de forma $a$ y $b$.

### 3.2 Bootstrap no Paramétrico por Conglomerados (Cluster Bootstrap)
Dado un conjunto de participantes $P = \{1, \dots, M\}$ con múltiples observaciones por participante:
1. Para cada réplica $b \in \{1, \dots, B\}$ ($B = 1000$, semilla fija):
   - Se muestrea con reemplazo un vector de índices de participantes $P^{(b)}$.
   - Se agrupan todas las muestras pertenecientes a los participantes seleccionados.
   - Se calcula el estadístico $\hat{\theta}^{(b)}$ ($EER$, diferencia pareada, etc.).
2. El intervalo de confianza percentil al 95% se obtiene como:
   $$IC_{95\%} = \left[ \hat{\theta}_{(\alpha/2)}^{(b)}, \, \hat{\theta}_{(1 - \alpha/2)}^{(b)} \right]$$

### 3.3 Prueba de Equivalencia TOST (Two One-Sided Tests)
Para validar $H_2$, una prueba de hipótesis nula convencional no prueba equivalencia (la ausencia de evidencia no es evidencia de ausencia). Se aplica el procedimiento TOST con margen de equivalencia $\epsilon = 3.0\%$ ($0.03$):
- $H_{01}: \mu_1 - \mu_2 \le -\epsilon$
- $H_{02}: \mu_1 - \mu_2 \ge +\epsilon$

Si el intervalo de confianza al 90% (o 95%) de la diferencia de medias se encuentra estrictamente dentro del intervalo $[-\epsilon, +\epsilon]$, se rechazan ambas hipótesis nulas y se concluye **equivalencia estadística demostrada**.

### 3.4 Curvas ROC, DET y Función ECDF
1. **Curva ROC (Receiver Operating Characteristic):** Representa la Tasa de Verdaderos Positivos ($TPR = 1 - FRR$) en función de la Tasa de Falsos Positivos ($FPR = FAR$). El Área Bajo la Curva ($AUC$) se calcula de forma exacta mediante el estadístico $U$ de Mann-Whitney:
   $$AUC = \frac{U_{\text{legítimos, impostores}}}{n_{\text{leg}} \cdot n_{\text{imp}}}$$
2. **Curva DET (Detection Error Trade-off):** Traza el compromiso directo entre $FAR$ y $FRR$ en escala lineal o normal desfasada.
3. **Función de Distribución Acumulada Empírica (ECDF):**
   $$\hat{F}_n(t) = \frac{1}{n} \sum_{i=1}^n \mathbb{I}(X_i \le t)$$
   Permite inspeccionar directamente la masa probabilística de retardos de desbloqueo por debajo de $1.8\text{ s}$ y tiempos de inferencia bajo $50\text{ ms}$.

---

## 4. Interpretación de Estados de Veredicto

| Estado | Significado Metodológico | Acción Requerida |
| :--- | :--- | :--- |
| **CUMPLE** | Los estimadores y los límites de confianza al 95% satisfacen plenamente las condiciones de la hipótesis. | Hipótesis aceptada. Citar resultados numéricos en el manuscrito. |
| **NO CUMPLE** | Los límites observados exceden los umbrales máximos tolerados (ej. $FAR \ge 3\%$ o $p \le 0.05$). | Hipótesis rechazada o sujeta a calibración de umbrales. |
| **INCONCLUSO** | La muestra recopilada no alcanza la potencia estadística mínima (N insuficiente, falta de datos en un contexto o ausencia de impostores). | Continuar la recolección de datos siguiendo el protocolo experimental. |
