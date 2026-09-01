"""
Extracción de características de dinámica de tecleo - TECLEOLLAVE-ADAPT

Esquema: 91 features deterministas por posición en frase fija
Frase: "La seguridad protege la información" (32 chars incluyendo 5 espacios)

Features:
- 32 Hold Times (HT[0]..HT[31]) - tiempo de pulsación por carácter
- 31 Latencias/Digraphs (LT[0]..LT[30]) - transición entre teclas consecutivas
- 28 Estadísticas agregadas
"""

import numpy as np
from typing import List, Dict, Any, Tuple

# Configuración inmutable del esquema de features
PHRASE = "La seguridad protege la información"
PHRASE_LENGTH = 35
N_FEATURES = 100  # 35 HT + 34 LT + 31 aggregated

# Nombres de features en orden fijo para reproducibilidad
FEATURE_NAMES = (
    [f"hold_time_{i}" for i in range(PHRASE_LENGTH)] +           # 35 HT
    [f"latency_{i}" for i in range(PHRASE_LENGTH - 1)] +         # 34 LT
    [
        "total_duration", "wpm",
        "hold_mean", "hold_std", "latency_mean", "latency_std",
        "hold_median", "hold_iqr", "latency_median", "latency_iqr",
        "hold_p10", "hold_p25", "hold_p75", "hold_p90",
        "latency_p10", "latency_p25", "latency_p75", "latency_p90",
        "hold_cv", "latency_cv",
        "flight_time_mean", "flight_time_std",
        "hold_skew", "hold_kurtosis",
        "latency_skew", "latency_kurtosis",
        "hold_min", "hold_max",
        "latency_min", "latency_max",
        "consistency_score"
    ]  # 31 aggregated
)

assert len(FEATURE_NAMES) == N_FEATURES, f"Expected {N_FEATURES} features, got {len(FEATURE_NAMES)}"


def validate_raw_timestamps(raw_timestamps: List[Dict], phrase_typed: str) -> Tuple[bool, str]:
    """
    Valida que los timestamps crudos correspondan a la frase esperada.
    
    Returns: (is_valid, error_message)
    """
    if not raw_timestamps:
        return False, "No timestamps provided"
    
    if len(raw_timestamps) != PHRASE_LENGTH:
        return False, f"Expected {PHRASE_LENGTH} events, got {len(raw_timestamps)}"
    
    if phrase_typed != PHRASE:
        return False, f"Phrase mismatch. Expected: '{PHRASE}', Got: '{phrase_typed}'"
    
    # Verificar orden temporal estricto
    for i, event in enumerate(raw_timestamps):
        required_keys = {'key', 'keydown_ts', 'keyup_ts'}
        if not all(k in event for k in required_keys):
            return False, f"Event {i} missing required keys: {required_keys}"
        
        kd = event['keydown_ts']
        ku = event['keyup_ts']
        
        if ku <= kd:
            return False, f"Event {i}: keyup_ts ({ku}) <= keydown_ts ({kd})"
        
        if i > 0:
            prev_ku = raw_timestamps[i-1]['keyup_ts']
            if kd < prev_ku:
                return False, f"Event {i}: keydown_ts ({kd}) < previous keyup_ts ({prev_ku})"
    
    return True, ""


def extract_raw_arrays(raw_timestamps: List[Dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extrae arrays base de los timestamps validados.
    
    Returns: (keydown_times, keyup_times, hold_times, latencies)
    - keydown_times: array[32] - timestamp de keydown por posición
    - keyup_times: array[32] - timestamp de keyup por posición
    - hold_times: array[32] - keyup - keydown por posición
    - latencies: array[31] - keydown[i+1] - keyup[i] por posición
    """
    n = len(raw_timestamps)
    keydown_times = np.zeros(n, dtype=np.float64)
    keyup_times = np.zeros(n, dtype=np.float64)
    hold_times = np.zeros(n, dtype=np.float64)
    
    for i, event in enumerate(raw_timestamps):
        keydown_times[i] = event['keydown_ts']
        keyup_times[i] = event['keyup_ts']
        hold_times[i] = keyup_times[i] - keydown_times[i]
    
    # Latencias (digraphs): keydown[i+1] - keyup[i]
    latencies = np.zeros(n - 1, dtype=np.float64)
    for i in range(n - 1):
        latencies[i] = keydown_times[i + 1] - keyup_times[i]
    
    return keydown_times, keyup_times, hold_times, latencies


def compute_aggregated_features(
    hold_times: np.ndarray, 
    latencies: np.ndarray,
    keydown_times: np.ndarray,
    keyup_times: np.ndarray
) -> np.ndarray:
    """
    Computa 28 estadísticas agregadas.
    """
    features = []
    
    # 1. Duración total
    total_duration = keyup_times[-1] - keydown_times[0]
    features.append(total_duration)
    
    # 2. WPM (palabras por minuto)
    # 32 caracteres / 5 = 6.4 palabras
    wpm = (PHRASE_LENGTH / 5) / (total_duration / 60000) if total_duration > 0 else 0
    features.append(wpm)
    
    # 3-4. Hold mean, std
    features.append(np.mean(hold_times))
    features.append(np.std(hold_times, ddof=1) if len(hold_times) > 1 else 0.0)
    
    # 5-6. Latency mean, std
    features.append(np.mean(latencies))
    features.append(np.std(latencies, ddof=1) if len(latencies) > 1 else 0.0)
    
    # 7-8. Hold median, IQR
    features.append(np.median(hold_times))
    q75, q25 = np.percentile(hold_times, [75, 25])
    features.append(q75 - q25)
    
    # 9-10. Latency median, IQR
    features.append(np.median(latencies))
    q75, q25 = np.percentile(latencies, [75, 25])
    features.append(q75 - q25)
    
    # 11-18. Percentiles hold y latency (8 features)
    features.append(np.percentile(hold_times, 10))
    features.append(np.percentile(hold_times, 25))
    features.append(np.percentile(hold_times, 75))
    features.append(np.percentile(hold_times, 90))
    features.append(np.percentile(latencies, 10))
    features.append(np.percentile(latencies, 25))
    features.append(np.percentile(latencies, 75))
    features.append(np.percentile(latencies, 90))
    
    # 19-20. Coeficiente de variación
    hold_mean = np.mean(hold_times)
    latency_mean = np.mean(latencies)
    hold_std = np.std(hold_times, ddof=1) if len(hold_times) > 1 else 0.0
    latency_std = np.std(latencies, ddof=1) if len(latencies) > 1 else 0.0
    features.append(hold_std / hold_mean if hold_mean > 0 else 0.0)
    features.append(latency_std / latency_mean if latency_mean > 0 else 0.0)
    
    # 21-22. Flight time (tiempo entre keydowns consecutivos)
    flight_times = keydown_times[1:] - keydown_times[:-1]
    features.append(np.mean(flight_times))
    features.append(np.std(flight_times, ddof=1) if len(flight_times) > 1 else 0.0)
    
    # 23-26. Skewness y Kurtosis (numpy implementation)
    def _skew(arr):
        if len(arr) < 3:
            return 0.0
        mean = np.mean(arr)
        std = np.std(arr, ddof=1)
        if std == 0:
            return 0.0
        return np.mean(((arr - mean) / std) ** 3)
    
    def _kurtosis(arr):
        if len(arr) < 4:
            return 0.0
        mean = np.mean(arr)
        std = np.std(arr, ddof=1)
        if std == 0:
            return 0.0
        return np.mean(((arr - mean) / std) ** 4) - 3  # Excess kurtosis
    
    features.append(_skew(hold_times))
    features.append(_kurtosis(hold_times))
    features.append(_skew(latencies))
    features.append(_kurtosis(latencies))
    
    # 27-30. Min/Max
    features.append(np.min(hold_times))
    features.append(np.max(hold_times))
    features.append(np.min(latencies))
    features.append(np.max(latencies))
    
    # 31. Consistency score (1 - outlier_ratio)
    # Outliers usando método IQR (1.5 * IQR)
    def outlier_ratio(arr):
        if len(arr) < 4:
            return 0.0
        q75, q25 = np.percentile(arr, [75, 25])
        iqr = q75 - q25
        lower = q25 - 1.5 * iqr
        upper = q75 + 1.5 * iqr
        outliers = np.sum((arr < lower) | (arr > upper))
        return outliers / len(arr)
    
    hold_outliers = outlier_ratio(hold_times)
    latency_outliers = outlier_ratio(latencies)
    total_outliers = hold_outliers + latency_outliers
    consistency = 1.0 - min(total_outliers, 1.0)
    features.append(consistency)
    
    return np.array(features, dtype=np.float64)


def extract_features(raw_timestamps: List[Dict], phrase_typed: str) -> Dict[str, Any]:
    """
    Función principal de extracción de características.
    
    Returns:
        {
            'feature_vector': List[float] (91 features),
            'feature_names': List[str] (91 nombres),
            'valid': bool,
            'error': str (si no válido),
            'consistency_score': float,
            'sample_quality': 'high'|'medium'|'low'
        }
    """
    # Validar
    is_valid, error = validate_raw_timestamps(raw_timestamps, phrase_typed)
    if not is_valid:
        return {
            'feature_vector': None,
            'feature_names': FEATURE_NAMES,
            'valid': False,
            'error': error,
            'consistency_score': 0.0,
            'sample_quality': 'low'
        }
    
    # Extraer arrays base
    keydown_times, keyup_times, hold_times, latencies = extract_raw_arrays(raw_timestamps)
    
    # Features crudas (63): 32 HT + 31 LT
    raw_features = np.concatenate([hold_times, latencies])
    
    # Features agregadas (28)
    agg_features = compute_aggregated_features(hold_times, latencies, keydown_times, keyup_times)
    
    # Vector completo (91)
    feature_vector = np.concatenate([raw_features, agg_features]).tolist()
    
    # Consistency score (última feature agregada)
    consistency_score = float(agg_features[-1])
    
    # Calidad de muestra
    if consistency_score >= 0.95:
        quality = 'high'
    elif consistency_score >= 0.85:
        quality = 'medium'
    else:
        quality = 'low'
    
    return {
        'feature_vector': feature_vector,
        'feature_names': FEATURE_NAMES,
        'valid': True,
        'error': None,
        'consistency_score': consistency_score,
        'sample_quality': quality
    }


def get_feature_schema() -> Dict[str, Any]:
    """Retorna el esquema de features para versionado."""
    return {
        'version': '1.0',
        'phrase': PHRASE,
        'phrase_length': PHRASE_LENGTH,
        'n_features': N_FEATURES,
        'feature_names': FEATURE_NAMES,
        'feature_order': {
            'hold_times': list(range(0, 32)),
            'latencies': list(range(32, 63)),
            'aggregated': list(range(63, 91))
        }
    }