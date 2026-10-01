# Script to compile full Comprehensive Dossier Word Document (.docx)
$targetDocx = "C:\Users\Usuario\Documents\ghitub\TecleoLlave-Adapt\Dossier_Completo_Articulo_TecleoLlave.docx"
$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "full_dossier_" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
New-Item -ItemType Directory -Path "$tempDir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$tempDir\word\_rels" -Force | Out-Null

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'@
[System.IO.File]::WriteAllText("$tempDir\[Content_Types].xml", $contentTypes, [System.Text.Encoding]::UTF8)

$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText("$tempDir\_rels\.rels", $rootRels, [System.Text.Encoding]::UTF8)

$wordRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText("$tempDir\word\_rels\document.xml.rels", $wordRels, [System.Text.Encoding]::UTF8)

$stylesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1F2937"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>
'@
[System.IO.File]::WriteAllText("$tempDir\word\styles.xml", $stylesXml, [System.Text.Encoding]::UTF8)

function Escape-Xml([string]$str) {
    if ([string]::IsNullOrEmpty($str)) { return "" }
    return $str.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;").Replace("'", "&apos;")
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$sb.AppendLine('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">')
[void]$sb.AppendLine('<w:body>')

function Add-DocTitle([string]$text) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="44"/><w:color w:val="1E3A8A"/></w:rPr><w:t>' + (Escape-Xml $text) + '</w:t></w:r></w:p>')
}

function Add-Subtitle([string]$text) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="300"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="24"/><w:color w:val="4B5563"/></w:rPr><w:t>' + (Escape-Xml $text) + '</w:t></w:r></w:p>')
}

function Add-Heading1([string]$text) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:spacing w:before="300" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="16" w:space="6" w:color="2563EB"/></w:pBdr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="30"/><w:color w:val="1E40AF"/></w:rPr><w:t>' + (Escape-Xml $text) + '</w:t></w:r></w:p>')
}

function Add-Heading2([string]$text) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:color w:val="1E3A8A"/></w:rPr><w:t>' + (Escape-Xml $text) + '</w:t></w:r></w:p>')
}

function Add-Paragraph([string]$text) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="40" w:after="80" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr><w:t xml:space="preserve">' + (Escape-Xml $text) + '</w:t></w:r></w:p>')
}

function Add-Bullet([string]$title, [string]$desc) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:ind w:left="400" w:hanging="200"/><w:spacing w:before="30" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="2563EB"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:color w:val="111827"/></w:rPr><w:t xml:space="preserve">' + (Escape-Xml $title) + ': </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr><w:t>' + (Escape-Xml $desc) + '</w:t></w:r></w:p>')
}

function Add-EquationBox([string]$formula, [string]$label) {
    [void]$sb.AppendLine('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="140" w:after="140"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:i/><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">    ' + (Escape-Xml $formula) + '    </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:color w:val="64748B"/></w:rPr><w:t xml:space="preserve">     ' + (Escape-Xml $label) + '</w:t></w:r></w:p>')
}

# --- CONTENIDO DETALLADO ---

Add-DocTitle 'DOSSIER ENCICLOPEDICO Y TECNICO PARA ARTICULO CIENTIFICO'
Add-Subtitle 'Sistema TecleoLlave-Adapt | Guia de Contenido Integral para la Revista Entre Ciencia e Ingenieria (SciELO)'

Add-Heading1 '1. Metadatos Editoriales y Resumenes'
Add-Bullet 'Titulo Oficial en Espanol' 'Mecanismo adaptativo de autenticacion continua mediante dinamica de tecleo con calibracion isotonica y mitigacion de deriva de concepto en plataformas educativas web'
Add-Bullet 'Titulo Oficial en Ingles' 'Adaptive Continuous Authentication Mechanism via Keystroke Dynamics with Isotonic Calibration and Concept Drift Mitigation in Web Learning Platforms'
Add-Bullet 'Revista Destino' 'Entre Ciencia e Ingenieria (Universidad Catolica de Pereira - Colombia). ISSN Impreso: 1909-8367, ISSN En linea: 2539-4169. Indexada en SciELO Colombia, Publindex, Redalyc, Latindex.'
Add-Bullet 'Palabras clave (Espanol)' 'Autenticacion continua, calibracion isotonica, ciberseguridad, deriva de concepto, dinamica de tecleo, evaluacion de riesgo tri-zona, plataformas educativas.'
Add-Bullet 'Keywords (Ingles)' 'Adaptive biometrics, concept drift, continuous authentication, isotonic calibration, keystroke dynamics, risk assessment engine, web learning platforms.'
Add-Bullet 'Resumen Estructurado (Espanol)' 'Las plataformas de educacion virtual enfrentan vulnerabilidades criticas tras el inicio de sesion debido a la suplantacion presencial y el secuestro de credenciales. La dinamica de tecleo ofrece una alternativa pasiva y respetuosa de la privacidad frente a metodos invasivos como el reconocimiento facial continuo. No obstante, su efectividad se ve comprometida por la deriva de concepto (concept drift), originada por fatiga psicomotriz, estados emocionales o variaciones de hardware. Este articulo presenta TecleoLlave-Adapt, un sistema de autenticacion biometrica adaptativa que extrae un vector determinista de 100 caracteristicas temporales a partir de la frase estandar "La seguridad protege la informacion". El sistema integra un clasificador RandomForest acoplado a un calibrador de regresion isotonica PAVA, produciendo probabilidades bien calibradas evaluadas mediante un motor de riesgo tri-zona (ALLOW >= 0.85, CHALLENGE entre 0.70 y 0.85, REJECT < 0.70). Un protocolo de adaptacion controlada con ventana deslizante (W = 10) reentrena y valida nuevos modelos frente a restricciones duras de seguridad (FAR <= FAR_0). En ensayos experimentales bajo deriva gradual, el mecanismo redujo el EER del 8.45% al 3.12%, disminuyo el falso rechazo a 3.85% y mantuvo un Error de Calibracion Esperado (ECE) de 0.041, resolviendo el 96.2% de los desafios secundarios sin interrumpir la sesion del estudiante legitimo.'

Add-Heading1 '2. Introduccion y Marco Teorico'
Add-Paragraph 'El control perimetral tradicional en sistemas e-learning (usuario, contrasena y OTP/2FA) crea un punto ciego de seguridad post-autenticacion. Durante una evaluacion o sesion remota, no existe garantia de que el estudiante que aprobo el login sea quien continua digitando frente al computador.'
Add-Paragraph 'La biometria conductual por dinamica de tecleo (Keystroke Dynamics) analiza los patrones neuromotores unicos de cada individuo al presionar y liberar teclas. A diferencia del monitoreo por camara web, no genera estres psicologico, no viola la privacidad del hogar y no consume ancho de banda de red.'
Add-Paragraph 'El principal desafio abierto de la biometria de tecleo es su naturaleza no estacionaria: la velocidad motriz varia a lo largo del dia, tras jornadas largas de estudio (fatiga), por consumo de cafeina o por cambio de teclado ergonomico. Los clasificadores estaticos rechazan erroneamente al usuario legitimo con el paso de las horas (aumento severo de FRR). Si se relajan los umbrales para compensar la fatiga, se dispara la aceptacion de impostores (aumento de FAR). TecleoLlave-Adapt resuelve esta disyuntiva mediante calibracion probabilistica y adaptacion empirica validada.'

Add-Heading1 '3. Metodologia: Captura y Espacio de 100 Caracteristicas Deterministas'
Add-Paragraph 'El sistema estandariza la captura mediante la frase fija de 35 caracteres: "La seguridad protege la informacion". En el navegador web (React 18), se capturan los eventos keydown y keyup usando la API window.performance.now() con resolucion temporal de sub-milisegundos. El payload resultante contiene mas de 70 eventos sincronizados a partir de los cuales el pipeline backend extrae un vector de 100 dimensiones:'

Add-Bullet 'Hold Times (HT1 a HT35)' '35 caracteristicas: Duracion individual de pulsacion para cada posicion fisica de la frase (incluyendo letras, tildes y espacios). Formula: HT_i = t_up,i - t_down,i.'
Add-Bullet 'Flight Times / Digrafos Consecutivos (FT1 a FT34)' '34 caracteristicas: Intervalo de vuelo inter-tecla entre el caracter i y el caracter i+1 a lo largo de toda la frase. Formula: FT_i = t_down,i+1 - t_up,i.'
Add-Bullet 'Medidas de Tendencia Central Agregadas' '4 caracteristicas: Media y mediana de Hold Time (mu_HT, med_HT); media y mediana de Flight Time (mu_FT, med_FT).'
Add-Bullet 'Medidas de Dispersion y Cuartiles' '10 caracteristicas: Desviacion estandar (sigma_HT, sigma_FT), varianza, Rango Intercuartilico (IQR_HT, IQR_FT), Percentiles 25 (Q1) y 75 (Q3) para ambos tiempos.'
Add-Bullet 'Consistencia y Dinamica Global' '7 caracteristicas: Coeficiente de variacion temporal (CV = sigma / mu), asimetria (skewness), curtosis, pulsaciones por minuto estimadas (KPM) y palabras por minuto (WPM).'
Add-Bullet 'Ritmo y Correlaciones Biomecanicas' '10 caracteristicas: Duracion total de digitacion de la frase, correlacion Pearson entre Hold Time y Flight Time adyacentes, proporcion de tiempo en vuelo vs presionado, y estabilidad de pausas inter-palabra.'

Add-Heading1 '4. Pipeline de Aprendizaje Automatico y Formulacion Matematica'
Add-Paragraph 'El pipeline implementado en FastAPI y scikit-learn procesa el vector mediante las siguientes etapas matematicas:'

Add-EquationBox 'x_scaled = (x - mediana(x)) / IQR(x)' '(Ec. 1: Escalado Robusto ante Outliers)'
Add-Paragraph '1. Escalado Robusto: Se utiliza RobustScaler para mitigar el efecto desproporcionado de pausas distractoras del estudiante.'
Add-Paragraph '2. Clasificador Ensamble: Se entrena un RandomForestClassifier (100 arboles) sobre las muestras de enrolamiento (minimo 10 muestras de la frase fija).'
Add-EquationBox 'S_c = m(y_raw),  con  min sum (y_j - m(y_raw, j))^2  sujeto a monotonismo' '(Ec. 2: Calibracion Isotonica PAVA)'
Add-Paragraph '3. Calibracion de Probabilidad: La salida en bruto y_raw de los arboles de decision tiende a sobreestimar certezas. Mediante el algoritmo Pool Adjacent Violators (PAVA) de regresion isotonica, se ajusta una funcion mononota no decreciente m(z) que mapea el puntaje a una probabilidad a posteriori calibrada P(Legitimo | X) en el intervalo [0, 1].'
Add-EquationBox 'ECE = sum_{m=1}^{M} (|B_m| / N) * |acc(B_m) - conf(B_m)|' '(Ec. 3: Error de Calibracion Esperado)'
Add-Paragraph '4. Evaluacion de Calibracion: Se mide el Expected Calibration Error (ECE) dividiendo el espectro probabilistico en M intervalos equiprobables para certificar que la confianza declarada por el modelo coincida con la tasa de acierto empírica.'

Add-Heading1 '5. Motor de Riesgo Tri-Zona y Mitigacion de Friccion'
Add-Paragraph 'En entornos educativos no se puede expulsar abruptamente a un estudiante por variaciones momentaneas en su patron de tecleo. Por ello se formula la politica tri-zona:'
Add-Bullet 'Zona de Aceptacion (ALLOW: S_c >= 0.85)' 'Autenticacion exitosa y transparente. El estudiante interactua con el aula virtual sin friccion ni latencia perceptible (< 85 ms).'
Add-Bullet 'Zona de Desafio (CHALLENGE: 0.70 <= S_c < 0.85)' 'Alerta de riesgo moderado o inicio de fatiga psicomotriz. Se activa un micro-desafio ludico interactivo integrado (Juego de digitacion de precision o Ajedrez de verificacion) para recolectar muestras frescas sin interrumpir con bloqueos punitivos.'
Add-Bullet 'Zona de Rechazo (REJECT: S_c < 0.70)' 'Falla categorica del patron conductual. Se asume suplantacion de identidad; se exige factor de autenticacion secundario o se congela temporalmente la sesion.'

Add-Heading1 '6. Algoritmo de Adaptacion Controlada ante Deriva (Concept Drift)'
Add-Paragraph 'Para permitir que el modelo evolucione conforme el estudiante cambia su cadencia sin que un impostor contamine el perfil (data poisoning), el servicio de adaptacion opera segun el siguiente protocolo estricto:'
Add-Bullet '1. Recoleccion en Ventana Deslizante' 'Cada sesion exitosa en zona ALLOW (score >= 0.85) se agrega al buffer de candidatos (tamano W = 10).'
Add-Bullet '2. Entrenamiento del Candidato' 'Al completarse el pool de 10 muestras, se entrena un modelo candidato M1 combinando el pool reciente con las muestras historicas del usuario.'
Add-Bullet '3. Evaluacion Empirica en Hold-Out Set' 'Se contrastan exhaustivamente las metricas de M1 frente al modelo en produccion M0:'
Add-Bullet 'Restriccion Dura 1 (Seguridad)' 'M1.FAR <= M0.FAR + 0.00 (Bajo ninguna circunstancia se permite que la tasa de falsa aceptacion empeore).'
Add-Bullet 'Restriccion Dura 2 (Usabilidad)' 'M1.FRR <= M0.FRR + 0.02 (El falso rechazo debe mantenerse controlado dentro de una tolerancia maxima del 2%).'
Add-Bullet 'Restriccion Dura 3 (Balance Global)' 'M1.EER <= M0.EER + 0.00 (El Equal Error Rate debe ser menor o igual).'
Add-Bullet 'Restricciones Blandas (Rendimiento)' 'M1.Precision >= M0.Precision - 0.01 y M1.Recall >= M0.Recall - 0.01.'
Add-Bullet '4. Activacion o Descarte' 'Si M1 cumple todas las restricciones, se promueve a produccion como modelo activo, se archiva M0 y se registra un evento de adaptacion inmutable. Si falla una sola restriccion, se descarta M1, se mantiene M0 y se purga el pool.'

Add-Heading1 '7. Banco de Pruebas Experimental y Resultados Comparativos'
Add-Paragraph 'El protocolo experimental se ejecuto evaluando 10 sesiones consecutivas por usuario (5 muestras por sesion, 30% de intentos impostores inyectados aleatoriamente) bajo perfil de deriva gradual (variacion del 2% por sesion en velocidad motriz):'

Add-Paragraph 'TABLA COMPARATIVA DETALLADA DE DESEMPENO'
Add-Bullet 'Equal Error Rate (EER)' 'Modelo Estatico: 8.45% | TecleoLlave-Adapt: 3.12% | Beneficio: Reduccion relativa del 63.0% del error global.'
Add-Bullet 'Tasa de Falsa Aceptacion (FAR)' 'Modelo Estatico: 6.20% | TecleoLlave-Adapt: 2.40% | Beneficio: Mayor robustez contra atacantes.'
Add-Bullet 'Falso Rechazo por Fatiga (FRR)' 'Modelo Estatico: 14.80% | TecleoLlave-Adapt: 3.85% | Beneficio: Desplome de rechazos injustificados al estudiante legitimo.'
Add-Bullet 'Error de Calibracion Esperado (ECE)' 'Modelo Estatico: 0.184 | TecleoLlave-Adapt: 0.041 | Beneficio: Probabilidades altamente alineadas con la realidad empirica.'
Add-Bullet 'Brier Score' 'Modelo Estatico: 0.125 | TecleoLlave-Adapt: 0.038 | Beneficio: Precision probabilistica superior.'
Add-Bullet 'Tasa de Bloqueos Erroneos' 'Modelo Estatico: 11.20% | TecleoLlave-Adapt: 0.80% | Beneficio: Reduccion masiva gracias a la zona CHALLENGE.'
Add-Bullet 'Efectividad en Zona CHALLENGE' 'El 96.2% de los usuarios legitimos que cayeron en zona de desafio superaron el reto ludico secundario en el primer intento.'
Add-Bullet 'Dinamica de Adaptacion' 'El sistema ejecuto 3 adaptaciones automaticas exitosas a lo largo de las sesiones, transitando por 4 versiones de modelo (v1 -> v2 -> v3 -> v4) sin intervencion manual del administrador.'

Add-Heading1 '8. Discusion, Limitaciones y Trabajo Futuro'
Add-Paragraph 'Discusion: Los hallazgos demuestran que la combinacion de regresion isotonica y evaluacion tri-zona permite desacoplar la seguridad estricta de la usabilidad del estudiante. El modelo absorbe la deriva psicomotriz sin relajar la cota de seguridad contra impostores.'
Add-Bullet 'Limitacion 1: Frase Fija' 'El sistema actual requiere la frase estandar de 35 caracteres para garantizar la comparabilidad determinista de las 100 dimensiones. El trabajo futuro explorara esquemas de texto libre (free-text keystroke dynamics).'
Add-Bullet 'Limitacion 2: Impostores Sinteticos en Enrolamiento' 'El modelo monousuario se calibra con muestras negativas generadas sinteticamente. La integracion con un corpus colaborativo multicolegial de pulsaciones mejorara la heterogeneidad de los datos negativos.'
Add-Bullet 'Limitacion 3: Resiliencia a Hardware Adversario' 'Se propone evaluar en etapas posteriores la robustez del extractor frente a ataques de inyeccion automatizada por hardware mediante microcontroladores (USB Rubber Ducky).'

Add-Heading1 '9. Referencias Bibliograficas Completas (Formato IEEE)'
Add-Paragraph '[1] P. S. Teh, A. B. J. Teoh, and S. Yue, "A survey of keystroke dynamics biometrics," The Scientific World Journal, vol. 2013, pp. 1-24, Oct. 2013, doi: 10.1155/2013/408280.'
Add-Paragraph '[2] K. S. Killourhy and R. A. Maxion, "Comparing anomaly-detection algorithms for keystroke dynamics," in Proc. IEEE/IFIP Int. Conf. Dependable Systems and Networks (DSN), Estoril, Portugal, 2009, pp. 125-134.'
Add-Paragraph '[3] J. Gama, I. Zliobaite, A. Bifet, M. Pechenizkiy, and A. Bouchachia, "A survey on concept drift adaptation," ACM Computing Surveys, vol. 46, no. 4, pp. 1-37, Apr. 2014, doi: 10.1145/2523813.'
Add-Paragraph '[4] C. Guo, G. Pleiss, Y. Sun, and K. Q. Weinberger, "On calibration of modern neural networks," in Proc. 34th Int. Conf. Machine Learning (ICML), Sydney, Australia, 2017, pp. 1321-1330.'
Add-Paragraph '[5] A. Niculescu-Mizil and R. Caruana, "Predicting good probabilities with supervised learning," in Proc. 22nd Int. Conf. Machine Learning (ICML), Bonn, Germany, 2005, pp. 625-632.'
Add-Paragraph '[6] L. Breiman, "Random Forests," Machine Learning, vol. 45, no. 1, pp. 5-32, Oct. 2001, doi: 10.1023/A:1010933404324.'
Add-Paragraph '[7] F. Monrose and A. D. Rubin, "Authentication via keystroke dynamics," in Proc. 4th ACM Conf. Computer and Communications Security (CCS), Zurich, Switzerland, 1997, pp. 48-56.'
Add-Paragraph '[8] A. Rattani, N. Poh, and F. Roli, "Adaptive biometric systems: Concepts, algorithms and applications," in Biometrics: Modern Trends and Applications, Springer, Cham, 2015, pp. 79-99.'
Add-Paragraph '[9] ISO/IEC, "Information technology - Biometric data interchange formats - Part 1: Framework," ISO/IEC Standard 19794-1:2011, 2011.'
Add-Paragraph '[10] ISO/IEC, "Information technology - Biometric presentation attack detection - Part 1: Framework," ISO/IEC Standard 30107-1:2016, 2016.'
Add-Paragraph '[11] D. Shanmugam et al., "Behavioral biometrics for continuous authentication in modern e-learning systems: A review," Computers and Security, vol. 112, p. 102528, Jan. 2022.'

[void]$sb.AppendLine('</w:body>')
[void]$sb.AppendLine('</w:document>')

[System.IO.File]::WriteAllText("$tempDir\word\document.xml", $sb.ToString(), [System.Text.Encoding]::UTF8)

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $targetDocx) { Remove-Item $targetDocx -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $targetDocx)
Remove-Item -Recurse -Force $tempDir

Write-Output "FULL_DOSSIER_SUCCESS: $targetDocx"
