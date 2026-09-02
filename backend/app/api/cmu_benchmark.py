from fastapi import APIRouter, HTTPException, Query
from app.services.cmu_benchmark_service import cmu_service

router = APIRouter(prefix="/cmu-benchmark", tags=["experiments"])

@router.get("")
@router.get("/")
def get_cmu_benchmark_results(
    n_subjects: int = Query(default=10, ge=1, le=51, description="Número de sujetos a evaluar (máx 51)")
):
    """
    Ejecuta el experimento de benchmarking sobre el perfil del dataset de referencia CMU.
    Retorna métricas comparativas: Modelo Estático vs Modelo Adaptativo.
    """
    try:
        results = cmu_service.run_benchmark_simulation(n_test_subjects=n_subjects)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
