# La Gran Aventura Matemática · El desafío de los cuatro reinos

Integrador de Matemática para **3º grado**: una aplicación web gamificada en la que cada alumno recorre cuatro reinos, resuelve **24 desafíos** y recupera los cuatro cristales matemáticos acompañado por **Lupe, la exploradora**. Los resultados se registran automáticamente en **Google Sheets**.

- **Destinatarios:** alumnos de 3º grado (8 y 9 años), trabajo individual.
- **Dispositivos:** Chromebooks (pantalla horizontal 16:9, sin scroll vertical). También funciona en notebooks y tablets en horizontal.
- **Duración estimada:** 45 minutos.
- **Tecnologías:** HTML5, CSS3, JavaScript vanilla (sin frameworks ni dependencias) y Google Apps Script.
- **Publicación:** GitHub Pages. No necesita servidor propio.

---

## 1. Qué evalúa

| Misión | Reino | Eje | Desafíos |
|---|---|---|---|
| 1. Exploradores de Números | Reino de los Números | Numeración y valor posicional (hasta 10.000) | Número secreto · Leer y escribir · Armar y desarmar · Valor de la cifra · Ordenar · Series, anterior y posterior |
| 2. El Laboratorio de las Fracciones | Isla de las Fracciones | Fracciones (½, ¼ y el entero) | Pintar · ¿Qué fracción es? · Partes iguales · Armar el entero · La cocina de Anita · ¿Más, menos o igual que un entero? |
| 3. Constructores Geométricos | Ciudad Geométrica | Figuras y cuerpos geométricos | Adiviná quién soy · Lados, vértices y diagonales · Clasificar y guardas · ¿Figura o cuerpo? · Cuerpos en la vida cotidiana · Caras, aristas y vértices |
| 4. Detectives de Problemas | Valle de los Problemas | Situaciones problemáticas (+ − × :) | Kiosco · Final del torneo · Útiles para el aula · Reparto de figuritas · Equipos para el torneo · Compras del supermercado (dos pasos) |

El banco completo con las respuestas correctas está en **[BANCO_DE_ACTIVIDADES.md](BANCO_DE_ACTIVIDADES.md)**.

**No hay preguntas de opción múltiple.** Los formatos son: completar espacios, completar tablas, armar números con tarjetas, armar nombres con tarjetas de palabras, ordenar arrastrando, clasificar en cajas, relacionar columnas con líneas, pintar partes de figuras, seleccionar elementos de una imagen, tocar los datos de un problema y armar el cálculo con fichas.

## 2. Cómo funciona para el alumno

1. **Inicio:** escribe nombre y apellido y elige grado y división (3º A o 3º B). No se piden otros datos.
2. **Mapa:** solo está habilitado el primer reino. Al terminar cada misión gana un cristal y se habilita el siguiente. Los reinos completados quedan marcados.
3. **Misión:** pantalla de presentación con la explicación, 6 desafíos con barra de progreso y pantalla final con el cristal.
4. **Modo examen:** durante el juego **no se muestra si la respuesta es correcta o incorrecta**. Si deja partes sin completar, la app le avisa una vez y lo deja seguir.
5. **Revisión:** al terminar las cuatro misiones ve los 24 desafíos (completos o incompletos), puede volver a cualquiera y cambiar sus respuestas.
6. **Envío e informe:** al tocar «Enviar a la docente» se calcula el resultado, se envía a la planilla y se muestra el informe final (nombre, puntaje, porcentaje, desafíos resueltos, cristales, resultado por misión, mensaje y recomendaciones de repaso), con botón para **imprimir o guardar en PDF**.

Si se cierra la pestaña o se apaga la Chromebook, el progreso queda guardado en ese equipo: al volver a abrir la app aparece «Continuar la aventura».

## 3. Sistema de evaluación

- Cada desafío vale **10 puntos** → total **240 puntos**.
- Si un desafío tiene varias partes, el puntaje es **proporcional** a las partes correctas (por ejemplo, 2 de 3 partes = 7 puntos).
- En «seleccionar figuras», cada elección incorrecta descuenta un acierto (tocar todas las figuras no suma).
- Se aceptan respuestas equivalentes cuando corresponde: fracciones equivalentes (2/4 = 1/2), sumas en distinto orden en la descomposición, cálculos conmutativos (5 × 12 o 12 × 5), números con o sin punto de miles (3.058 o 3058), cualquier combinación de tarjetas que forme el número pedido.
- **Correcta** = 10/10 · **Parcialmente correcta** = 1 a 9 · **Incorrecta** = 0 · **Sin responder**.
- **Respuestas correctas / incorrectas** cuentan desafíos: correctas son las de 10/10; incorrectas, todas las demás (incluye parciales y sin responder).
- **Porcentaje de aciertos** = puntaje obtenido / 240.
- **Resultado por eje** (y general): **Logrado** (80 % o más) · **En proceso** (50 a 79 %) · **Requiere refuerzo** (menos de 50 %).
- **Intentos:** se cuenta uno cada vez que el alumno deja un desafío con una respuesta distinta a la anterior (la primera vez y cada corrección en la revisión).
- **Tiempo:** se mide el tiempo total y el de cada desafío, solo con la pestaña visible.
- **Recomendaciones de repaso:** en cada eje se listan los contenidos de los desafíos con menos de 7 puntos.

## 4. Estructura de archivos

```
matematica-integrador-3grado/
│
├── index.html               Estructura: las 7 pantallas y el panel docente
├── styles.css               Diseño, escenario 16:9 adaptable, animaciones, impresión
├── script.js                Lógica del juego, banco de preguntas, corrección, envío
├── Code.gs                  Google Apps Script (recepción y registro en Sheets)
├── README.md                Este archivo
├── BANCO_DE_ACTIVIDADES.md  Las 24 actividades con sus respuestas correctas
├── INFORME_DE_PRUEBAS.md    Pruebas realizadas y resultados
├── .nojekyll                Indica a GitHub Pages que publique los archivos tal cual
│
└── assets/
    ├── images/
    │   └── exploradora.svg  Lupe, el personaje guía
    └── icons/
        └── favicon.svg      Ícono de la pestaña
```

El resto de las ilustraciones (figuras, cuerpos, objetos, fracciones, cristales, mapa) se dibujan con SVG desde `script.js`, así que no hay imágenes que puedan dejar de cargar.

---

## 5. Configurar Google Sheets y Google Apps Script

Hacelo con la cuenta de Google institucional o personal de la docente. Lleva unos 10 minutos.

### 5.1 Crear la planilla

1. Entrá a [sheets.google.com](https://sheets.google.com) y creá una **hoja de cálculo en blanco**.
2. Ponele un nombre, por ejemplo **«Integrador Matemática 3º – Resultados»**.

### 5.2 Pegar el código

1. En la planilla, abrí **Extensiones → Apps Script**.
2. Borrá todo lo que aparece en `Código.gs` y **pegá el contenido completo de `Code.gs`**.
3. Si tus divisiones no son A y B, cambialas en `CONFIG_GS.DIVISIONES` (y también en `CONFIG.DIVISIONES` de `script.js`).
4. Guardá (ícono del disquete).

### 5.3 Crear las hojas y autorizar

1. En la barra superior del editor elegí la función **`configurarPlanilla`** y tocá **Ejecutar**.
2. Google pide permisos: **Revisar permisos → elegí tu cuenta → Configuración avanzada → Ir a (nombre del proyecto) → Permitir**. El script solo accede a esta planilla.
3. Volvé a la planilla: van a aparecer dos hojas con sus encabezados:

**Resultados generales** (una fila por alumno)

| Fecha y hora | Nombre y apellido | Grado | División | Puntaje total | Porcentaje de aciertos | Respuestas correctas | Respuestas incorrectas | Tiempo total | Numeración y Valor Posicional | Fracciones | Figuras y Cuerpos Geométricos | Situaciones Problemáticas | Estado de finalización | Resultado general | ID de sesión |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

**Detalle de respuestas** (una fila por desafío: 24 por alumno)

| Fecha y hora | Alumno | Grado y división | Misión | N.º de actividad | Contenido evaluado | Respuesta seleccionada | Respuesta correcta | Resultado | Cantidad de intentos | Tiempo de resolución | ID de sesión |
|---|---|---|---|---|---|---|---|---|---|---|---|

> Las hojas también se crean solas con el primer envío si no ejecutaste `configurarPlanilla`. La planilla tiene además un menú **Aventura Matemática → Preparar hojas**.

### 5.4 Publicar el script como aplicación web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. En «Seleccionar tipo» (ícono de engranaje) elegí **Aplicación web**.
3. Completá:
   - **Descripción:** Integrador 3º grado
   - **Ejecutar como:** **Yo** (tu cuenta)
   - **Quién tiene acceso:** **Cualquier persona**
4. Tocá **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).

> **Importante:** tiene que ser «Cualquier persona» (no «Cualquier persona con cuenta de Google»). Los alumnos no inician sesión y el navegador bloquea la respuesta si Google pide login. Esto **no** hace pública la planilla: solo permite que la app envíe resultados a este script, que valida los datos antes de escribir.

### 5.5 Probar la URL

Pegá la URL en una pestaña nueva del navegador. Tenés que ver algo así:

```json
{"ok":true,"servicio":"La Gran Aventura Matemática","planilla":"Integrador Matemática 3º – Resultados","registros":0}
```

### 5.6 Vincular la URL con la aplicación

Abrí `script.js` y pegá la URL en la primera sección:

```js
const CONFIG = Object.assign({
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfy.../exec',   // ← acá
  GRADOS: ['3º'],
  DIVISIONES: ['A', 'B'],
  ...
```

Guardá y subí el cambio a GitHub (ver sección 6).

### 5.7 Si más adelante cambiás `Code.gs`

**Implementar → Gestionar implementaciones → ✏ (editar) → Versión: Nueva versión → Implementar.** Así la URL se mantiene igual y no hay que tocar `script.js`.

---

## 6. Publicar la aplicación en GitHub Pages

### Opción A · Desde la web de GitHub (sin instalar nada)

1. Entrá a [github.com](https://github.com) e iniciá sesión.
2. **New repository** → nombre `matematica-integrador-3grado` → **Public** → **Create repository**.
3. Tocá **uploading an existing file** y arrastrá **todo el contenido** de la carpeta (incluida la carpeta `assets` y el archivo `.nojekyll`). Tocá **Commit changes**.
   - Si el explorador de archivos no muestra `.nojekyll` (está oculto), no pasa nada: la app funciona igual.
4. En el repositorio: **Settings → Pages**.
5. En **Build and deployment → Source** elegí **Deploy from a branch**; en **Branch** elegí **main** y la carpeta **/ (root)** → **Save**.
6. A los 1–2 minutos aparece la dirección: `https://TU-USUARIO.github.io/matematica-integrador-3grado/`.

### Opción B · Con Git desde la terminal

```bash
cd matematica-integrador-3grado
git init
git add .
git commit -m "Integrador de Matemática 3º grado"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/matematica-integrador-3grado.git
git push -u origin main
```

Después activá Pages como en los pasos 4 y 5 de la opción A.

### Compartir con los alumnos

Compartí la dirección de GitHub Pages (por ejemplo en Classroom, con un código QR o como favorito en las Chromebooks). Conviene abrirla en **pantalla completa (tecla de pantalla completa o F11)**.

> **Privacidad:** el repositorio es público, pero **no contiene contraseñas, credenciales ni datos de alumnos**. Los resultados viven solo en tu planilla de Google, que sigue siendo privada.

---

## 7. Pruebas de funcionamiento (antes de usarla con el grupo)

1. **Prueba de conexión:** abrí la app, tocá el botón discreto **«Docente»** (abajo a la derecha del inicio) → **Probar conexión**. Tiene que decir «✔ Conexión correcta con la planilla…».
2. **Recorrido completo:** jugá una vez con el nombre «Prueba Docente», respondé algunas cosas bien y otras mal, y enviá.
3. **Confirmación real:** en el informe tiene que aparecer «✔ Resultados guardados en la planilla de la docente». Ese mensaje **solo** aparece cuando Google Apps Script confirma el registro.
4. **Revisá la planilla:** 1 fila nueva en «Resultados generales» y 24 en «Detalle de respuestas». Compará los números con el informe.
5. **Sin conexión:** empezá otra prueba, desconectá el Wi-Fi antes de tocar «Enviar», y verificá que diga que quedó pendiente. Reconectá: se envía solo (o tocá «Reintentar ahora»).
6. **Duplicados:** tocá «Reintentar» o «Enviar pendientes» varias veces: la planilla no debe repetir filas.
7. Borrá las filas de prueba de la planilla antes de usarla con los alumnos.

El detalle de las pruebas automáticas realizadas está en **[INFORME_DE_PRUEBAS.md](INFORME_DE_PRUEBAS.md)**.

## 8. Qué pasa si se corta Internet

- El progreso del alumno se guarda en el navegador en todo momento.
- Al enviar, la app hace hasta 4 intentos con esperas crecientes. Si no logra la confirmación, guarda el resultado en una **cola local** y avisa con un mensaje naranja que todavía no se envió.
- La cola se reintenta sola: al volver la conexión, cada minuto mientras la app esté abierta y cada vez que se abre la app en ese equipo.
- En la pantalla de inicio aparece un aviso si hay resultados pendientes en esa Chromebook, y el **panel docente** muestra cuántos y de quién. Desde ahí se pueden **enviar** o **descargar una copia en JSON** como respaldo.
- Cada sesión tiene un **identificador único**. Si un envío llega dos veces (por ejemplo, porque se perdió la respuesta de Google), el script lo detecta y no duplica filas.

## 9. Solución de errores frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El informe dice «La app todavía no está conectada con la planilla» | `SCRIPT_URL` está vacía en `script.js` | Pegar la URL `/exec` (sección 5.6) y volver a subir `script.js` |
| «Probar conexión» dice que no se pudo conectar | URL incorrecta o la implementación no es «Cualquier persona» | Revisar que la URL termine en `/exec` (no `/dev`) y el acceso de la implementación (sección 5.4) |
| Al abrir la URL `/exec` aparece una pantalla de inicio de sesión de Google | Acceso configurado como «Solo yo» o «Cualquier persona con cuenta de Google» | Editar la implementación y elegir «Cualquier persona» |
| Aparece «Respuesta no válida del servidor (HTTP …)» | Google devolvió una página de error (permisos sin autorizar o cuota) | Ejecutar `configurarPlanilla` y aceptar permisos; esperar unos minutos y reintentar |
| Cambié `Code.gs` y no se nota | La implementación sigue con la versión anterior | Gestionar implementaciones → editar → Nueva versión (sección 5.7) |
| «La planilla rechazó los datos (División no válida)» | Las divisiones de `script.js` y `Code.gs` no coinciden | Igualar `DIVISIONES` en ambos archivos y crear una nueva versión de la implementación |
| GitHub Pages muestra error 404 | Pages todavía no se publicó o el archivo no se llama `index.html` | Esperar 2 minutos; revisar Settings → Pages y que `index.html` esté en la raíz |
| Los cambios en GitHub no se ven en las Chromebooks | Caché del navegador | Recargar con Ctrl + Shift + R |
| La app se ve chica o con bandas a los costados | La ventana no es 16:9 | Es normal: el escenario se ajusta sin cortar nada. Usar pantalla completa |
| Hay resultados pendientes en una Chromebook que se va a resetear | Sin conexión al terminar | Abrir el panel docente → «Enviar pendientes» con Internet, o «Descargar copia (JSON)» |
| Un alumno cerró sin terminar | — | Al abrir la app en el mismo equipo aparece «Continuar la aventura» |

## 10. Personalizar

- **Divisiones o grados:** `CONFIG.DIVISIONES` / `CONFIG.GRADOS` en `script.js` y `CONFIG_GS` en `Code.gs`.
- **Actividades:** están en la sección 4 de `script.js` (`MISIONES`). Cada ítem guarda su respuesta correcta (`resp`, `sol`, `pares`, `acepta`, etc.). Si las cambiás, actualizá también `BANCO_DE_ACTIVIDADES.md`.
- **Niveles de logro:** constante `NIVELES` en `script.js` (80 % y 50 %).

## 11. Limitaciones conocidas y soluciones propuestas

- **Las respuestas correctas están en el código fuente.** Toda corrección que se hace en el navegador tiene esta limitación. Para alumnos de 3º grado en Chromebooks administradas el riesgo es muy bajo. Si se necesitara mayor reserva, la corrección podría trasladarse a Apps Script (el navegador enviaría solo las respuestas).
- **La URL del Apps Script es pública** (cualquiera que la conozca podría enviar datos). El script valida estructura, rangos y divisiones, evita duplicados y neutraliza fórmulas, pero no puede saber quién envía. Recomendación: no publicar la URL fuera del repositorio y revisar la planilla.
- **Chromebooks en modo invitado** borran el almacenamiento local al cerrar sesión. Si un resultado quedó pendiente en ese modo, enviarlo o descargarlo desde el panel docente antes de cerrar.
- **Cuotas de Google:** una cuenta puede atender muchos envíos por día; para un grado completo enviando a la vez, el script ordena las escrituras con un bloqueo y la app reintenta si alguna tarda.
- **Tipografías:** se cargan desde Google Fonts; si no cargan, se usan tipografías del sistema y la app funciona igual.
