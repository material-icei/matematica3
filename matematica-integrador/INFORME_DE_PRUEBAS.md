# Informe de pruebas y verificación de funcionamiento

**Proyecto:** La Gran Aventura Matemática · Integrador 3º grado · versión 1.0.0
**Fecha de las pruebas:** 2 de noviembre de 2026
**Entorno:** Chromium (el motor de Chrome en las Chromebooks) automatizado con Playwright, servidor web local, y el archivo `Code.gs` real ejecutado sobre un simulador de Google Sheets.

## Resumen

| Bloque | Pruebas | Resultado |
|---|---|---|
| Recorrido visual completo en 5 resoluciones (24 desafíos, revisión e informe) | 5 recorridos | ✔ Sin desbordes ni elementos fuera de pantalla |
| Interacción real, corrección, progresión, envío y fallas de red (punta a punta) | 69 | ✔ 69 correctas, 0 fallidas |
| `Code.gs`: hojas, encabezados, registro, duplicados y validación | 23 | ✔ 23 correctas, 0 fallidas |
| Banco de respuestas: cada respuesta correcta da 10/10 | 24 desafíos | ✔ 240/240 puntos, 100 % en los cuatro ejes |
| Informe impreso (PDF A4 apaisado) | 1 | ✔ Una sola hoja, fondo blanco |

## Qué pide la especificación (punto 14) y cómo se verificó

| Verificación | Cómo se probó | Resultado |
|---|---|---|
| Que todas las actividades funcionen | Se recorrieron las 24 con clics, arrastre y teclado; cada tipo de interacción (12 tipos) se usó al menos una vez | ✔ |
| Que las respuestas se validen correctamente | Se cargaron respuestas correctas, incorrectas, parciales y equivalentes (2/4 = 1/2, 1/1 = 4/4, sumas en otro orden, «3.058» y «3058») y se compararon con el puntaje esperado en 15 desafíos | ✔ |
| Que los puntajes se calculen sin errores | Suma de los 24 desafíos = puntaje total; % = total / 240; correctas + incorrectas = 24 | ✔ |
| Que las misiones se desbloqueen en orden | Al comenzar solo la misión 1 está habilitada; tocar una bloqueada no hace nada; al terminar la 1 se habilita solo la 2 | ✔ |
| Que el progreso se actualice | Barra de cada misión, barra y cristales del mapa, estado «Completo / Incompleto» en la revisión | ✔ |
| Que el informe coincida con lo registrado | Se comparó nombre, curso, puntaje, porcentaje y resultados por eje entre el informe y la fila recibida por la planilla | ✔ |
| Que Google Sheets reciba los datos | El `Code.gs` real (con simulador de Sheets) recibió 1 fila general y 24 de detalle por alumno | ✔ (ver limitación abajo) |
| Que no se generen registros duplicados | Respuesta del servidor perdida a propósito → la app reintentó → el script respondió «duplicado» → una sola fila | ✔ |
| Que el almacenamiento temporal funcione sin conexión | Envío sin Internet → queda pendiente en el navegador → aviso en el inicio tras recargar → envío automático al volver la conexión | ✔ |
| Que se vea bien en una Chromebook | Capturas en 1366×768, 1280×720 (área visible 1366×657 y 1280×610), 1920×1080, 1536×730 y 1024×600 sin scroll ni desbordes | ✔ |
| Que no haya errores en la consola | Sin errores de la aplicación. Únicos mensajes: la carga de Google Fonts (bloqueada en el entorno de pruebas, sin efecto: se usan tipografías del sistema) y los avisos de red del navegador cuando se simuló a propósito que el servidor fallaba | ✔ |
| Sin datos ficticios en la versión final | No hay respuestas de ejemplo precargadas; las herramientas de prueba solo se activan con `MODO_PRUEBA`, que está desactivado | ✔ |

## Escenario de corrección usado (respuestas cargadas a mano)

| Desafío | Lo que se respondió | Puntaje esperado | Obtenido |
|---|---|---|---|
| 1.1 Número secreto | 2 pistas bien, 1 mal | 7 | 7 |
| 1.2 Leer y escribir | Nombre del 8.021 mal armado | 8 | 8 |
| 1.3 Armar y desarmar | Tarjetas con clic y arrastre; descomposición en otro orden | 10 | 10 |
| 1.6 Series | Primero incompleto; corregido en la revisión (2 intentos) | 10 | 10 |
| 2.2 ¿Qué fracción es? | 1/2 para la figura de 2/4 y 1/1 para el entero | 10 | 10 |
| 2.3 Partes iguales | Una figura incorrecta elegida en «cuartos» | 7 | 7 |
| 2.6 Más o menos que un entero | Una tarjeta en la caja equivocada | 9 | 9 |
| 3.5 Cuerpos cotidianos | Dado y caja intercambiados | 7 | 7 |
| 4.2 Final del torneo | Resta escrita al revés (1.157 − 3.892) | 7 | 7 |

## Detalle: pruebas de punta a punta

```
1. Pantalla de inicio
  ✔ Pide nombre y apellido si está vacío
  ✔ Exige nombre Y apellido
  ✔ Exige elegir la división
  ✔ Divisiones disponibles: A y B
  ✔ Entra al mapa
2. Desbloqueo
  ✔ Solo la misión 1 está habilitada al comenzar
  ✔ Tocar una misión bloqueada no hace nada
3. Misión 1 con interacción real
  ✔ Las tarjetas de palabras arman el nombre en orden
  ✔ Tarjetas: se agregan con clic y arrastre y se quitan con un toque
  ✔ Ordenar arrastrando tarjetas funciona
  ✔ Ordenar tocando dos tarjetas (intercambio) funciona
  ✔ Avisa si quedan partes sin completar
  ✔ El aviso no avanza en el primer toque
  ✔ Segundo toque: termina la misión igual
  ✔ Misión 1 completada; se habilita la 2; la 3 sigue bloqueada
   Misión 2
  ✔ Pintar y despintar partes
  ✔ Armar entero: agregar y quitar piezas
  ✔ Clasificar: todas las tarjetas ubicadas (arrastre + toque)
   Misión 3
  ✔ Relacionar: se dibujan 6 líneas
   Misión 4
  ✔ Después de la misión 4 se abre la revisión
4. Revisión
  ✔ La revisión marca 1 desafío incompleto (M1A6)
  ✔ Al volver, la respuesta guardada sigue ahí
  ✔ Tras completarlo, ya no quedan incompletos
  ✔ Intentos de M1A6 = 2 (primera respuesta + corrección en la revisión) → 2
5. Corrección
  ✔ Desafío 1-1: 7 puntos (esperado 7)
  ✔ Desafío 1-2: 8 puntos (esperado 8)
  ✔ Desafío 1-3: 10 puntos (esperado 10)
  ✔ Desafío 1-4: 10 puntos (esperado 10)
  ✔ Desafío 1-5: 10 puntos (esperado 10)
  ✔ Desafío 1-6: 10 puntos (esperado 10)
  ✔ Desafío 2-1: 10 puntos (esperado 10)
  ✔ Desafío 2-2: 10 puntos (esperado 10)
  ✔ Desafío 2-3: 7 puntos (esperado 7)
  ✔ Desafío 2-4: 10 puntos (esperado 10)
  ✔ Desafío 2-6: 9 puntos (esperado 9)
  ✔ Desafío 3-1: 10 puntos (esperado 10)
  ✔ Desafío 3-5: 7 puntos (esperado 7)
  ✔ Desafío 4-1: 10 puntos (esperado 10)
  ✔ Desafío 4-2: 7 puntos (esperado 7)
  ✔ Total 225/240 = 94% (suma coherente)
  ✔ Correctas 18 + incorrectas 6 = 24
  ✔ El detalle registra la respuesta del alumno (cálculo invertido)
6. Envío a Google Sheets (Code.gs real con simulador)
  ✔ Mientras espera, NO dice «guardados»: «Enviando los resultados a la docente…»
  ✔ Con la confirmación del servidor muestra «Resultados guardados»
  ✔ La planilla recibió 1 fila general y 24 de detalle
  ✔ Envío como text/plain sin preflight CORS (compatible con GitHub Pages)
  ✔ La fila de la planilla coincide con el informe (nombre, curso, puntaje, %)
  ✔ Resultados por eje registrados
  ✔ El informe muestra nombre, puntaje y porcentaje
  ✔ Hay botón para imprimir / guardar PDF
  ✔ Sin errores en la consola: []
7. Sin conexión
  ✔ Sin Internet: queda «pendiente», no dice guardado
  ✔ El resultado queda en el almacenamiento local
  ✔ La planilla no recibió nada todavía
  ✔ Al volver la conexión se envía automáticamente
  ✔ La cola local queda vacía
  ✔ El informe ahora muestra el guardado confirmado
8. Duplicados y reintentos
  ✔ Se reintentó tras perder la respuesta (2 envíos)
  ✔ Se registró una sola vez (sin duplicados)
9. Servidor con errores
  ✔ Tras agotar reintentos muestra «pendiente» con botón para reintentar
  ✔ Tras recargar, la pantalla de inicio avisa que hay 1 resultado pendiente
  ✔ «Reintentar ahora» registra el resultado
  ✔ «Nueva aventura» (doble toque) vuelve al inicio para otro alumno
  ✔ Panel docente: «Probar conexión» funciona
  ✔ Sin errores de la app en la consola (solo los avisos de red de las fallas simuladas): []
10. Reanudar
  ✔ Al recargar ofrece continuar la aventura
  ✔ Continúa en el mismo desafío con la respuesta guardada
  ✔ Empezar otra aventura pide confirmación antes de borrar la anterior
11. Sin configurar
  ✔ Sin SCRIPT_URL: avisa y guarda localmente (no simula el guardado)
69 pruebas correctas, 0 fallidas
```

## Detalle: pruebas de `Code.gs`

```
  ✔ Crea «Resultados generales» con 16 encabezados
  ✔ Crea «Detalle de respuestas» con 12 encabezados
  ✔ Congela la fila de encabezados
  ✔ No duplica encabezados si ya existen
  ✔ Registra una sesión válida y confirma con su ID
  ✔ Escribe 1 fila general y 24 de detalle
  ✔ Formatos: porcentaje 0,83 · puntaje 200 / 240 · tiempo «40 min 00 s»
  ✔ Fecha y hora como fecha real
  ✔ Neutraliza textos que empiezan con «=» (inyección de fórmulas)
  ✔ Un reenvío de la misma sesión responde ok + duplicado
  ✔ El reenvío NO duplica filas
  ✔ Una segunda sesión se agrega sin sobrescribir la anterior
  ✔ Limpia filas de detalle incompletas de un envío cortado
  ✔ Rechaza: texto que no es JSON → «Los datos no tienen formato JSON válido»
  ✔ Rechaza: sin ID → «Identificador de sesión inválido»
  ✔ Rechaza: división inexistente → «División no válida»
  ✔ Rechaza: nombre vacío → «El nombre debe tener entre 3 y 80 caracteres»
  ✔ Rechaza: puntaje mayor que el máximo → «Puntaje total inválido»
  ✔ Rechaza: detalle incompleto → «El detalle no coincide con la cantidad de actividades»
  ✔ Rechaza: correctas + incorrectas ≠ total → «Correctas + incorrectas no coincide con el total»
  ✔ Los envíos inválidos no escriben nada
  ✔ Rechaza un POST sin cuerpo
  ✔ doGet informa estado (3 registros)
```

## Limitación de las pruebas y verificación pendiente en Google

Desde el entorno de desarrollo no se puede acceder a una cuenta de Google, por lo que **no se hizo un envío a una planilla real**. Para cubrirlo, el archivo `Code.gs` real se ejecutó sobre un simulador de las funciones de Google Sheets usadas (`getSheetByName`, `insertSheet`, `getRange().setValues`, `getValues`, `deleteRow`, etc.) y se publicó detrás de un servidor local que imita la URL `/exec`. La app se comunicó con ese servidor tal como lo hará con Google: `POST` con cuerpo `text/plain`, sin solicitud previa CORS, esperando la confirmación `{ok:true, sessionId}`.

**Antes de usarla con los alumnos**, la docente debe hacer la prueba de la sección 7 del README (lleva 5 minutos): probar conexión desde el panel docente, hacer un recorrido de prueba y comprobar las filas en la planilla. La app nunca muestra «Resultados guardados» sin la confirmación real de Google, así que si algo no estuviera bien configurado se vería de inmediato como «pendiente».
