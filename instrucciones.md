# Instrucciones de deploy — Entrenamiento Personal
## Eduardo / Los Newenches

---

## Paso 1 — Crear el Google Sheet

1. Ir a [sheets.google.com](https://sheets.google.com) → **Nuevo**
2. Nombrar el archivo: `Entrenamiento Los Newenches`
3. Anotar la URL — tiene el formato:  
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`  
   Guardar el `SPREADSHEET_ID` para el paso siguiente.

---

## Paso 2 — Crear el proyecto Apps Script

1. Dentro del Sheet, ir a: **Extensiones → Apps Script**
2. Se abre el editor. Renombrar el proyecto (arriba a la izquierda): `Entrenamiento Newenches`
3. Borrar el contenido del archivo `Código.gs` que aparece por defecto
4. Pegar el contenido completo del archivo `Codigo.gs` de esta carpeta
5. Crear un segundo archivo: click en **+** → **HTML** → nombrar `Index`  
   (debe quedar exactamente como `Index.html` en el editor, sin extensión adicional)
6. Pegar el contenido completo del archivo `Index.html` de esta carpeta

---

## Paso 3 — Inicializar las hojas

1. En el editor de Apps Script, seleccionar la función `initSheets` en el menú desplegable
2. Click en **Ejecutar**
3. La primera vez pedirá permisos — aceptar todo (es tu propia cuenta)
4. Aparecerá un popup: `✅ Hojas creadas. La app está lista para deployar.`
5. Volver al Sheet y verificar que se crearon las hojas: `Plan`, `Estado`, `Sesiones`, `Ejercicios`, `Medidas`, `Evaluacion`
6. La hoja `Plan` ya tiene las Semanas 1 y 2 cargadas

---

## Paso 4 — Deployar como Web App

1. En el editor de Apps Script, click en **Implementar → Nueva implementación**
2. Click en el ícono de engranaje ⚙ → seleccionar **Aplicación web**
3. Configurar:
   - **Descripción**: `v1.0`
   - **Ejecutar como**: `Yo (tu-email@gmail.com)`
   - **Quién tiene acceso**: `Cualquier persona`
4. Click en **Implementar**
5. Copiar la **URL de la aplicación web** — es la URL de la app

**La URL tiene este formato:**  
`https://script.google.com/macros/s/XXXXXXXXXXXX/exec`

---

## Paso 5 — Probar

1. Abrir la URL en el navegador → debe aparecer el spinner y luego la app
2. Registrar algunas series en el Día 1 Semana 1
3. Cerrar el navegador y volver a abrir la misma URL
4. Verificar que los datos se restauraron
5. Verificar en el Sheet que la hoja `Estado` tiene una fila con el JSON, y `Sesiones`/`Ejercicios` tienen filas normalizadas

---

## Paso 6 — Agregar Semana 3 (y siguientes)

1. Abrir el Sheet → hoja `Plan`
2. Copiar las filas de la Semana 2 que quieras usar como base
3. Cambiar la columna `Semana` de `2` a `3`
4. Ajustar columnas `Plan`, `Series`, `Nota` según la progresión
5. Guardar — la próxima vez que se abra la app cargará la Semana 3 automáticamente

**Estructura de la hoja Plan:**

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Semana | Número de semana | 3 |
| Dia | Día 1-5 | 1 |
| NombreDia | Nombre del día | KB Base |
| Orden | Orden del ejercicio en el día | 1 |
| ExID | ID único del ejercicio | swing |
| Nombre | Nombre completo | Swing KB (2 manos) |
| Plan | Descripción del plan | 3 × 12 / KB 12kg |
| Series | Cantidad de series para tracking | 3 |
| Nota | Nota técnica | Bisagra de cadera... |
| Alerta | Alerta especial (puede quedar vacío) | L5-S1: ... |
| Tipo | `normal` o `movilidad` | normal |

> **Regla para tipo:** usar `movilidad` solo para ejercicios del Día 4 (Movilidad). El resto siempre `normal`.

---

## Actualizar después de cambios en el código

Si se modifica `Codigo.gs` o `Index.html`:

1. En el editor de Apps Script, click en **Implementar → Administrar implementaciones**
2. Click en el lápiz ✏ de la implementación activa
3. En **Versión** seleccionar **Nueva versión**
4. Click en **Implementar**

La URL no cambia — solo se actualiza el código.

---

## Modo offline

La app funciona sin conexión:
- El plan y el estado se guardan en `localStorage` del navegador
- Si se pierde la conexión, los datos se siguen guardando localmente
- Al recuperar conexión, los datos pendientes se sincronizan automáticamente con el Sheet
- El punto de color en el encabezado indica el estado: **verde** = guardado, **amarillo** = guardando, **rojo** = sin conexión

---

## Análisis en el Sheet

Las hojas de análisis se actualizan en cada guardado:

- **Sesiones**: una fila por día entrenado, con estado del día y nota post
- **Ejercicios**: una fila por ejercicio registrado, con series y sensación
- **Medidas**: dos filas fijas (Inicio / Cierre)
- **Evaluacion**: una fila con la evaluación subjetiva del ciclo

Fórmulas útiles en el Sheet:

```
Promedio sensación por ejercicio:
=AVERAGEIF(Ejercicios!D:D,"swing",Ejercicios!I:I)

Días completados semana 1:
=COUNTIFS(Sesiones!B:B,1,Sesiones!D:D,">0")

Evolución peso:
=INDEX(Medidas!B:B,MATCH("Cierre",Medidas!A:A,0))-INDEX(Medidas!B:B,MATCH("Inicio",Medidas!A:A,0))
```
