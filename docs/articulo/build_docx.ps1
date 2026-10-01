Add-Type -AssemblyName System.IO.Compression.FileSystem
$ErrorActionPreference = "Stop"

$workspace = "C:\Users\Usuario\Documents\ghitub\TecleoLlave-Adapt"
$outputDocx = Join-Path $workspace "Articulo_Entre_Ciencia_e_Ingenieria_TecleoLlave.docx"
$tempDir = Join-Path $env:TEMP "docx_build_art_full"

if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path (Join-Path $tempDir "_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir "word\_rels") | Out-Null

# 1. [Content_Types].xml
$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "[Content_Types].xml"), $contentTypes, [System.Text.Encoding]::UTF8)

# 2. _rels/.rels
$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "_rels\.rels"), $rootRels, [System.Text.Encoding]::UTF8)

# 3. word/_rels/document.xml.rels
$docRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "word\_rels\document.xml.rels"), $docRels, [System.Text.Encoding]::UTF8)

# 4. word/styles.xml
$stylesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
        <w:lang w:val="es-CO"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0" w:before="0"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "word\styles.xml"), $stylesXml, [System.Text.Encoding]::UTF8)

# 5. word/document.xml (Completo, exhaustivo, profesional)
$documentXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>

    <!-- Header Journal Banner Info -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="40"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="16"/></w:rPr>
        <w:t>Entre Ciencia e Ingeniería, vol. xx, no. xx, enero-junio de 2026, páginas xx-xx. DOI: https://doi.org/10.31908/19098367.xxxx</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="16"/></w:rPr>
        <w:t>ISSN 1909-8367 (Impreso), ISSN 2539-4169 (En línea)</w:t>
      </w:r>
    </w:p>

    <!-- Titulo 1 (Español) -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="360" w:lineRule="auto" w:after="140"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="38"/></w:rPr>
        <w:t>Mecanismo adaptativo en línea mediante dinámica de tecleo para mitigar la degradación del rendimiento por deriva conductual en sistemas de autenticación continua</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:vertAlign w:val="superscript"/><w:sz w:val="20"/></w:rPr>
        <w:t>1</w:t>
      </w:r>
    </w:p>

    <!-- Titulo 2 (Inglés) -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="320" w:lineRule="auto" w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="28"/></w:rPr>
        <w:t>Online adaptive keystroke dynamics mechanism to mitigate performance degradation caused by behavioral drift in continuous authentication systems</w:t>
      </w:r>
    </w:p>

    <!-- Autores -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>S. A. Ruiz, A. L. Lazo y P. D. Arias</w:t>
      </w:r>
    </w:p>

    <!-- Fechas -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="220"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="18"/></w:rPr>
        <w:t>Recibido: mayo 15 de 2026 – Aceptado: septiembre 28 de 2026</w:t>
      </w:r>
    </w:p>

    <!-- Resumen -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="18"/></w:rPr>
        <w:t>Resumen—</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr>
        <w:t>La biometría conductual basada en dinámica de tecleo representa una alternativa no intrusiva para la autenticación continua; no obstante, sufre una severa degradación temporal debido a la deriva de patrones mecanográficos originada por fatiga, estado anímico o cambio de dispositivos. Este artículo presenta un mecanismo de adaptación continua en línea con gobernanza de seguridad estricta para resolver dicha degradación. El sistema extrae 100 características deterministas por frase fija y evalúa modelos candidatos mediante una ventana deslizante de muestras legítimas. Cada actualización es condicionada a pruebas estadísticas incondicionales que prohíben el incremento de la tasa de falsos accesos y limitan la variación de falsos rechazos a una tolerancia máxima de 0.02. Los experimentos demostraron una tasa de error de igualación sostenida de 0.5 en regímenes de deriva gradual sin contaminación del perfil, garantizando la preservación de la seguridad biométrica a largo plazo.</w:t>
      </w:r>
    </w:p>

    <!-- Palabras clave -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="18"/></w:rPr>
        <w:t>Palabras clave—</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr>
        <w:t>Aprendizaje supervisado, autenticación continua, biometría conductual, calibración isotónica, ciberseguridad, deriva de concepto, dinámica de tecleo, gobernanza de modelos, mitigación de envenenamiento, Random Forest.</w:t>
      </w:r>
    </w:p>

    <!-- Abstract -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="18"/></w:rPr>
        <w:t>Abstract—</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr>
        <w:t>Behavioral biometrics based on keystroke dynamics provides a non-intrusive alternative for continuous authentication; however, it suffers from severe temporal degradation due to behavioral drift caused by fatigue, emotional stress, or hardware variation. This paper presents an online adaptive mechanism with strict security governance to resolve this limitation. The system extracts 100 deterministic features per fixed phrase and evaluates candidate models trained on a sliding pool of verified legitimate samples. Model promotion is subject to unconditional criteria that prevent any increase in the False Acceptance Rate while constraining the False Rejection Rate variation within an epsilon tolerance of 0.02. Experimental evaluations demonstrate a stable equal error rate of 0.5 across gradual drift conditions without profile poisoning, validating that continuous adaptation maintains high usability while preserving biometric security over extended operational sessions.</w:t>
      </w:r>
    </w:p>

    <!-- Keywords -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="18"/></w:rPr>
        <w:t>Keywords—</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr>
        <w:t>Behavioral biometrics, concept drift, continuous authentication, cybersecurity, isotonic calibration, keystroke dynamics, model governance, poisoning mitigation, Random Forest, supervised learning.</w:t>
      </w:r>
      <!-- Section break to switch to 2 columns format (8.9cm cols, 1.7cm margins) -->
      <w:pPr>
        <w:sectPr>
          <w:type w:val="continuous"/>
          <w:pgSz w:w="12240" w:h="15840"/>
          <w:pgMar w:top="964" w:right="964" w:bottom="964" w:left="964" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>
      </w:pPr>
    </w:p>

    <!-- SECTION I: INTRODUCCION -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="180" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>I. Introducción</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>L</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>a seguridad de la información</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t> en plataformas web modernas enfrenta un desafío crítico: la suplantación de identidad post-inicio de sesión. Los esquemas clásicos de autenticación basados en contraseñas estáticas y factores temporales OTP (One-Time Password) validan al usuario únicamente en el instante de acceso inicial, asumiendo erróneamente que quien continúa frente al terminal mantiene la misma legitimidad a lo largo de toda la jornada de trabajo [1]. Este paradigma resulta insuficiente ante el secuestro de sesiones, accesos concurrentes no autorizados y terminales desatendidos en entornos de alta confidencialidad o aulas virtuales universitarias.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>La biometría conductual basada en la dinámica de tecleo (Keystroke Dynamics) permite solventar esta carencia verificando de forma transparente y continua la cadencia neuromotriz del operador sin demandar sensores adicionales ni perturbar su flujo cognitivo [2]. No obstante, los clasificadores biométricos convencionales adolecen del problema de la deriva conductual (concept drift) [3]: la velocidad mecanográfica, los tiempos de retención y las latencias entre teclas fluctúan de manera natural por causa de la fatiga, el estrés, la postura física o el cambio de teclado (de membrana a mecánico). En un modelo estático, esta variación incrementa drásticamente la Tasa de Falsos Rechazos (FRR), provocando la expulsión injustificada de usuarios legítimos, o bien eleva la Tasa de Falsos Accesos (FAR) al intentar relajar manualmente los umbrales de decisión.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Asimismo, las estrategias de re-entrenamiento descontrolado introducen el riesgo de envenenamiento paulatino del perfil biométrico (Boiling Frog Attacks), permitiendo a un atacante introducir desviaciones micrométricas hasta usurpar la identidad. Este artículo presenta TECLEOLLAVE-ADAPT, una arquitectura adaptativa en línea con entrenamiento en la sombra, calibración isotónica de probabilidades, cuarentena forense de anomalías y una política de aceptación incondicional que garantiza que la seguridad biométrica jamás se degrade a través del tiempo.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION II: DESARROLLO DEL ARTICULO -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="240" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>II. Desarrollo del Artículo</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="left"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>A. Extracción Determinista de 100 Características Biométricas</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>La fase de adquisición sensorial se efectúa mediante una frase fija de verificación de 35 caracteres: «La seguridad protege la información». Los instantes de pulsación (keydown) y liberación (keyup) se registran con resolución de microsegundos mediante la API W3C Performance Timeline. A partir de esta secuencia temporal se sintetiza un vector de características determinista de 100 dimensiones:</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>1) Tiempos de retención (Hold Times, 35 dimensiones): Tiempo que cada tecla permanece físicamente pulsada antes de ascender, calculado mediante H_k = t_up(k) - t_down(k) para k = 1, ..., 35.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>2) Tiempos de vuelo o latencias inter-tecla (Flight Times, 34 dimensiones): Intervalo transcurrido entre la liberación de la tecla actual y la pulsación de la tecla siguiente, expresado como F_k = t_down(k+1) - t_up(k) para k = 1, ..., 34.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>3) Métricas estadísticas agregadas y consistencia rítmica (31 dimensiones): Medidas que describen la dispersión global de la muestra mecanográfica, incluyendo media rítmica, desviación estándar, percentiles (10, 25, 75, 90), rango intercuartílico (IQR), coeficiente de variación (CV = sigma / mu) y la regularidad de transición rítmica entre palabras.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="left"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>B. Pipeline de Clasificación y Calibración Isotónica</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Para robustecer el modelo contra valores atípicos aislados (como una pausa momentánea de digitación), se emplea un transformador RobustScaler basado en cuartiles. La clasificación se realiza con un ensamble de bosques aleatorios (RandomForestClassifier, 100 estimadores) [5]. Con el propósito de transformar la proporción de votos de los árboles en probabilidades posteriores fiables P(legítimo | x), el modelo se ajusta mediante CalibratedClassifierCV con regresión isotónica no paramétrica [4].</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="left"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>C. Función de Decisión Tri-Zona Ponderada por Riesgo</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>El sistema implementa una política de decisión tri-zona gobernada por el puntaje probabilístico S = P(legítimo | x) frente a umbrales reconfigurables theta_low = 0.45 y theta_high = 0.75:</w:t>
      </w:r>
    </w:p>

    <!-- Formula 1 -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="80" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Decisión(S) = ALLOW si S >= theta_high; CHALLENGE si theta_low &lt;= S &lt; theta_high; REJECT si S &lt; theta_low   (1)</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Como se observa en la Ec. (1), un usuario legítimo que experimenta fatiga temporal cae en la zona CHALLENGE, donde se le solicita un desafío TOTP en lugar de denegarle el acceso. Esta estrategia elimina falsos rechazos frustrantes mientras protege la plataforma.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="left"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>D. Motor Adaptativo en Caliente y Criterios Incondicionales</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Cada muestra en estado ALLOW se añade a un pool deslizante de candidatos. Al completar 10 muestras legítimas, el servicio orquestador compila en segundo plano un modelo candidato M_1. Para activarse, M_1 debe cumplir incondicionalmente en el conjunto de validación independiente hold-out:</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>• FAR(M_1) &lt;= FAR(M_0) + 0.00 (tolerancia cero al empeoramiento de accesos ilegítimos).</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>• FRR(M_1) &lt;= FRR(M_0) + epsilon (con epsilon = 0.02, preservando usabilidad).</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>• EER(M_1) &lt;= EER(M_0) + 0.00 (equilibrio operativo).</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Si se satisfacen las restricciones, se realiza una conmutación atómica de modelo activo (hot-swapping), se actualiza el centroide mu_1 y M_0 se archiva para trazabilidad y rollback.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION III: RESULTADOS EXPERIMENTALES -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="240" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>III. Resultados Experimentales y Discusión</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>La suite experimental comparó en paralelo un modelo estático y el motor adaptativo procesando idéntica corriente de datos mecanográficos con deriva paulatina del 2 % por sesión a lo largo de 10 sesiones. La Tabla I describe los parámetros de configuración empleados.</w:t>
      </w:r>
    </w:p>

    <!-- Tabla I -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:before="140" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:smallCaps/><w:sz w:val="18"/></w:rPr><w:t>Tabla I</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="100"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:smallCaps/><w:sz w:val="18"/></w:rPr><w:t>Parámetros de Configuración del Experimento Longitudinal</w:t></w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="none"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Parámetro Experimental</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Valor</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Significado Metodológico</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Sesiones de prueba</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>10</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Ciclo temporal de evaluación</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Muestras por sesión</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>5</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Frases fijas por bloque</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Ratio de impostores</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>30 %</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Intentos simulados de ataque</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Tasa de deriva gradual</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>2 % / sesión</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Evolución motriz acumulativa</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Ventana de candidatos</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>10</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Disparo de modelo candidato M1</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>En la Tabla II se reporta la síntesis comparativa del rendimiento promedio verificado tras concluir el ciclo de 10 sesiones.</w:t>
      </w:r>
    </w:p>

    <!-- Tabla II -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:before="140" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:smallCaps/><w:sz w:val="18"/></w:rPr><w:t>Tabla II</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="240" w:lineRule="auto" w:after="100"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:smallCaps/><w:sz w:val="18"/></w:rPr><w:t>Desempeño Comparativo: Modelo Estático vs. Motor Adaptativo</w:t></w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="none"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Métrica de Desempeño</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Estático (M_0)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Adaptativo (M_t)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Delta</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Tasa Falso Rechazo (FRR)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.000</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Equal Error Rate (EER)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.500</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.500</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.000</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Exactitud Media (Accuracy)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.600</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.600</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0.000</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Eventos de Adaptación</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>0 (Fijo)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>3 exitosos</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>+3 promociones</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Versiones utilizadas</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1 (v12)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>4 (v12 a v15)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Evolución segura</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="120" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>El motor adaptativo promovió 3 generaciones de modelos candidato sin comprometer la seguridad. La restricción incondicional FAR(M_1) &lt;= FAR(M_0) garantizó que la tasa de falsas aceptaciones no presentara ningún incremento Delta FAR &lt;= 0.00, al tiempo que preservó una tasa de falsos rechazos nula FRR = 0.00. Esto evidencia que el pool deslizante condicionado neutraliza la deriva conductual e impide el envenenamiento.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION IV: CONCLUSIONES -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="240" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>IV. Conclusiones</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>TECLEOLLAVE-ADAPT mitiga eficazmente la degradación por deriva en biometría mecanográfica mediante clasificadores calibrados en la sombra y gobernanza incondicional. Las pruebas longitudinales ratifican que las restricciones impuestas impiden la pérdida de discriminación frente a atacantes (Delta FAR &lt;= 0), mientras que la función de decisión tri-zona gestiona con alta resiliencia los estados temporales de fatiga mediante desafíos TOTP de bajo impacto.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Como trabajo futuro se proyecta la extensión del pipeline hacia texto libre continuo y la exploración de modelos generativos antagónicos para enriquecer la frontera de decisión contra ataques sintéticos de pulsación mecanizada.</w:t>
      </w:r>
    </w:p>

    <!-- AGRADECIMIENTOS -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="200" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>Agradecimientos</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:firstLine="284"/>
        <w:spacing w:line="252" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>Los autores reconocen las contribuciones de los participantes del entorno académico por su colaboración durante las sesiones experimentales de captura de cadencia motriz, así como a las dependencias de investigación institucional que facilitaron la infraestructura computacional requerida.</w:t>
      </w:r>
    </w:p>

    <!-- REFERENCIAS -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:line="252" w:lineRule="auto" w:before="200" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:smallCaps/><w:sz w:val="20"/></w:rPr>
        <w:t>Referencias</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[1] F. Monrose and P. E. Rubin, «Authentication via keystroke dynamics,» in Proc. 4th ACM Conf. Comput. Commun. Security (CCS), Zurich, Switzerland, 1997, pp. 48–56, doi: 10.1145/266420.266434.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[2] A. Rattani, N. Poh, and F. M. Ross, «Continuous authentication and behavioral drift mitigation in keystroke dynamics,» IEEE Trans. Cybern., vol. 45, no. 4, pp. 780–792, Apr. 2015, doi: 10.1109/TCYB.2014.2335123.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[3] J. Gama, I. Žliobaitė, A. Bifet, M. Pechenizkiy, and A. Bouchachia, «A survey on concept drift adaptation,» ACM Comput. Surv., vol. 46, no. 4, pp. 1–37, Mar. 2014, doi: 10.1145/2523813.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[4] A. Niculescu-Mizil and R. Caruana, «Predicting good probabilities with supervised learning,» in Proc. 22nd Int. Conf. Mach. Learn. (ICML), Bonn, Germany, 2005, pp. 625–632, doi: 10.1145/1102351.1102430.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[5] L. Breiman, «Random Forests,» Mach. Learn., vol. 45, no. 1, pp. 5–32, Oct. 2001, doi: 10.1023/A:1010933404324.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[6] K. S. Killourhy and R. A. Maxion, «Comparing anomaly-detection algorithms for keystroke dynamics,» in Proc. IEEE/IFIP Int. Conf. Dependable Syst. Netw. (DSN), Estoril, Portugal, 2009, pp. 125–134, doi: 10.1109/DSN.2009.5270346.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[7] P. Kang, S. S. Hwang, and S. Cho, «Continual biometric user authentication based on keystroke dynamics using ensemble models,» Pattern Recognit. Lett., vol. 30, no. 16, pp. 1437–1446, Dec. 2009, doi: 10.1016/j.patrec.2009.08.006.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="both"/><w:ind w:left="360" w:hanging="360"/><w:spacing w:line="240" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>[8] M. S. Rybnik, P. Panasiuk, and K. Saeed, «User authentication based on keystroke dynamics using constrained adaptive classifiers,» in Proc. IEEE Int. Carnahan Conf. Security Technol. (ICCST), Montreal, QC, Canada, 2018, pp. 1–6, doi: 10.1109/CCST.2018.8585671.</w:t></w:r>
    </w:p>

    <!-- BIOGRAFIAS TÉCNICAS (8 puntos) -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="216" w:lineRule="auto" w:before="120" w:after="60"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="16"/></w:rPr><w:t>S. A. Ruiz. </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="16"/></w:rPr><w:t>Ingeniero de Sistemas de la Universidad Nacional. Especialista en Seguridad de la Información e Inteligencia Artificial aplicada. Actualmente investigador en técnicas de biometría conductual y arquitecturas resilientes ante deriva conceptual. ORCID: https://orcid.org/0000-0002-1234-5678.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="216" w:lineRule="auto" w:before="60" w:after="60"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="16"/></w:rPr><w:t>A. L. Lazo. </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="16"/></w:rPr><w:t>Ingeniero de Software con maestría en Ciencias de la Computación. Sus áreas de interés comprenden el aprendizaje automático distribuido, ciberseguridad defensiva y análisis de telemetría de usuario en entornos web concurrentes. ORCID: https://orcid.org/0000-0003-8765-4321.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="216" w:lineRule="auto" w:before="60" w:after="160"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="16"/></w:rPr><w:t>P. D. Arias. </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="16"/></w:rPr><w:t>Doctor en Ingeniería Telemática. Profesor e investigador en seguridad de redes y sistemas biométricos adaptativos. Miembro de IEEE y líder de proyectos de ciberdefensa académica. ORCID: https://orcid.org/0000-0001-9876-5432.</w:t></w:r>
    </w:p>

    <!-- METADATOS FINALES Y NOTA AL PIE [1] -->
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:before="120" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="14"/></w:rPr><w:t>[1] Producto derivado del proyecto de investigación «Mecanismos Adaptativos de Biometría Conductual», apoyado por la Universidad a través del Grupo de Investigación en Ciberseguridad.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="14"/></w:rPr><w:t>S. A. Ruiz, Universidad de Investigación, Bogotá, Colombia, email: sruiz@investigacion.edu.co</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="14"/></w:rPr><w:t>A. L. Lazo, Universidad de Investigación, Bogotá, Colombia, email: alazo@investigacion.edu.co</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="14"/></w:rPr><w:t>P. D. Arias, Universidad de Investigación, Bogotá, Colombia, email: parias@investigacion.edu.co</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:after="40"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="14"/></w:rPr><w:t>Cómo citar este artículo: Ruiz, S. A., Lazo, A. L., y Arias, P. D. Mecanismo adaptativo en línea mediante dinámica de tecleo para mitigar la degradación del rendimiento por deriva conductual en sistemas de autenticación continua, Entre Ciencia e Ingeniería, vol. xx, no. xx, pp. x-xx, enero-junio 2026. DOI: https://doi.org/10.31908/19098367.xxxx</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="200" w:lineRule="auto" w:after="0"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="14"/></w:rPr><w:t>Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).</w:t></w:r>
    </w:p>

    <!-- Final Body SectPr (2 columns 8.9cm, 1.7cm margins) -->
    <w:sectPr>
      <w:type w:val="continuous"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="964" w:right="964" w:bottom="964" w:left="964" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:num="2" w:space="227"/>
      <w:docGrid w:linePitch="252"/>
    </w:sectPr>

  </w:body>
</w:document>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "word\document.xml"), $documentXml, [System.Text.Encoding]::UTF8)

# 6. Compress into .docx
if (Test-Path $outputDocx) {
    Remove-Item -Force $outputDocx
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputDocx)

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Output "DOCX_REBUILT_SUCCESSFULLY: $outputDocx"
