# InvenEasy

App personal de **orden y crecimiento personal**: un armario digital para controlar ropa, calzado, aseo y accesorios, con apartados para rutinas, finanzas, hábitos, calendario y lista de deseos.

---

## Secciones principales

### 1. Dashboard
Página principal con acceso directo a todos los apartados.

### 2. Armario
Icono de camiseta. Organiza lo que tienes en cuatro categorías.

**Categorías por defecto**

| Categoría | Subcategorías | Elementos de ejemplo |
|-----------|---------------|----------------------|
| **Ropa** | Pantalones | Jeans, clásicos, bermudas, sudaderas, pantalones |
| | Interiores | Boxers, franelas, cinturones, corbatas |
| | Torso | Blazer, camisetas overzize, camisetas deportivas, camisetas boxy, buzos |
| **Aseo** | Pies | Polvo para pies, pinta uñas, cortaúñas, jabones, lima para pies |
| | Boca | Enjuague bucal, Colgate, vaselina labial, raspador de lengua, hidratante de labios, chicles sin azúcar, pasta dental, hilo dental |
| | Cuerpo | Desodorante, clotrimazol, leche de magnesia, crema corporal, perfume casual y ocasional, máquina de afeitar, after shave, crema para depilar, jabones |
| | Cabello | Curl sponge, shampoo, crema para peinar, acondicionador, termoprotector, mascarilla, peines |
| | Cara | Limpiador facial, máquinas de afeitar, protector solar |
| **Calzado** | Deportivos | Zapatos casuales, zapatos deportivos |
| | Formales | Zapatos de iglesia, ocasiones especiales |
| | Descanso | Chanclas, sapos |
| | Medias | Blancas, negras, rojas, verdes |
| **Accesorios** | Estilo personal | Reloj, cadenas, grillz, pulsera, anillos, gafas, auriculares, cartera, máscara, durag, gorras |
| | Cabeza | Gorras, durag, sombrero, bandana |
| | Ojo y cara | Gafas de sol, lentes, mascarillas |
| | Tecnología | Auriculares, smartwatch, powerbank |
| | Bolsillo | Cartera, riñonera, celulares |
| | Funcionales | Cinturones, llaveros, maletas, bolsos, bolsas |

**Funcionamiento**

- Las categorías vienen por defecto, pero se pueden añadir más, cada una con su imagen o icono.
- Cada subcategoría muestra sus elementos. Un botón de añadir permite crear un elemento.
- Al crear un elemento: se elige una imagen (con opción de iconos), se le pone nombre y se guarda.
- Al presionar un elemento: opciones para editar nombre, cambiar imagen o eliminar (botón de eliminar en forma de icono).
- Buscador que filtra por nombre o categoría.
- Si no hay elementos, se muestra el texto: *"No tienes elementos aún"*.

**Vista de las cards:** imagen arriba, nombre abajo, sombras suaves y bordes redondeados.

**Flujo resumido:** icono de armario → 4 categorías + buscador → subcategorías → elementos → editar, cambiar imagen o eliminar.

---

### 3. Rutinas diarias
- Una card por día, con historial desde la fecha de inicio hasta hoy. Los días anteriores no se borran.
- Dentro de cada card: fecha arriba, botón para agregar rutina y lista de rutinas del día.
- **Al agregar una rutina** se puede:
  - Asignar un nombre.
  - Definir una hora (opcional).
  - Elegir la repetición: diaria, semanal, mensual o personalizada, para que el sistema la ponga solo cada día.
- **En la lista de rutinas:**
  - Círculo para marcarla como hecha (se tacha).
  - Botón para indicar que no se cumplió ese día.
  - Opciones de editar y borrar.
- **Progreso:** barra de progreso diaria con el porcentaje cumplido, calculado según las rutinas agregadas.
- **Panel general:** estadísticas de cada día, días anteriores, rutinas cumplidas y días completados seguidos.
- **Recordatorio por hora:** aviso tipo *"hoy no has realizado esta rutina"*.

---

### 4. Finanzas (orden financiero)

**Panel de control**
- Cuadros con esquinas redondeadas: ingresos del año, gastos del año, saldo disponible y gasto de hoy.
- Lista de transacciones recientes: ingresos en verde, gastos en rojo.
- Botón **"Añadir Transacción"** (arriba a la derecha): elegir ingreso o gasto, monto, categoría, descripción y fecha. Los cuadros y la lista se actualizan solos.

**Subsecciones**
- **Transacciones:** historial completo en tabla (fecha, descripción, categoría, monto). Incluye buscador, filtro de ingresos/gastos, filtro por categoría y botón **"Restablecer Filtros"**.
- **Lista de compras:** dos listas. *Artículos por Comprar* (con botón "Añadir Artículo" y precio estimado) y *Artículos Comprados* (tachados, con precio y fecha). Al marcar una casilla, el artículo pasa de una lista a otra.
- **Ahorros:** cuadro con el total ahorrado e historial. Botón **"Añadir Ahorro"** (monto, digital o efectivo, fecha). El total se suma solo.
- **Resumen mensual:** se elige mes y año, se presiona **"Generar Cierre Mensual"** y se muestran cuatro cuadros (ingresos, gastos, ahorros y saldo), un texto corto y sugerencias de una IA para mejorar.
- **Conversor de monedas:** dos casillas con monto y resultado, menús para elegir moneda de origen y destino, cambio en tiempo real y botón para invertir monedas. Las transacciones en otra moneda se convierten a la moneda principal.
- **Exportar:** botón junto a "Añadir Transacción". Formato Excel o PDF, elegir qué exportar (transacciones, ahorros, compras o resumen) y el periodo. El archivo se guarda en el celular.
- **Botón rápido "Agregar gasto":** siempre visible en la pantalla principal y disponible como widget. Abre una ventana corta ya marcada como "Gasto" con la fecha de hoy.
- **Presupuestos con alertas:** límite mensual por categoría con barra de colores (verde, amarillo y rojo). Notificación al llegar al 80 %.
- **Gastos fijos:** pagos recurrentes (internet, arriendo, matrícula, suscripciones) con monto y día del mes. Aviso uno o dos días antes y registro automático opcional.
- **Deudas y préstamos:** lo que se debe y lo que nos deben, con monto, fecha límite y botón para abonos. Recordatorios y paso al historial cuando se paga.

**Metodología:** en Exportar habrá un Google Sheet personalizado con el formato de reporte de Finanzas (Invencash). También habrá un widget para registrar sin entrar a la app.

---

### 5. Lista de deseos (Wishlist)
- Cards de productos deseados con botón de agregar.
- Al agregar: nombre y foto (la foto se muestra en la card).
- Acciones: editar, eliminar o marcar como comprado.

---

### 6. Mogged / Hábitos
Sección para crear hábitos, marcarlos cada día y ver la mejora con el tiempo.

**Crear un hábito**
- Nombre (ej. "Hacer ejercicio"), ícono y color.
- Frecuencia: todos los días, días de semana o días elegidos.
- Hora de recordatorio (ej. 6:00 a. m.).
- Meta diaria si es medible (ej. 8 vasos de agua o 30 minutos).
- Plantillas listas para no empezar desde cero.

**Pantalla "Hoy"**
- Lista de hábitos del día con casilla.
- Barra de porcentaje cumplido.
- Hábitos con contador (ej. sumar un vaso por toque).
- Opción de saltar un hábito sin perder la racha si hubo una razón válida.

**Rachas**
- Racha actual y mejor racha.
- Aviso de racha en peligro: *"¡Te faltan 2 horas para no perder tu racha de 10 días!"*

---

### 7. Calendario
- Vista de calendario con cada fecha como card. El día actual tiene un punto verde.
- Las fechas con pendientes se marcan con un color distinto.
- Al tocar una fecha se muestran sus eventos y un botón **+** para agregar uno.
- Al agregar: título, descripción y tipo (Evento, Recordatorio, Tarea, Urgente, Importante, Meta, Idea, y más en el futuro).
- Notificación cuando se acerca el día con los eventos pendientes.
- Cada evento se puede editar o borrar desde su card.

---

### 8. Recetas
Biblioteca personal de recetas de comida, medicinales, postres, bebidas y otras.

- CRUD completo con foto (galería o cámara), título, descripción y etiquetas.
- Categorías y dificultad (fácil, media, difícil); tiempos de preparación y cocción.
- Ingredientes con cantidad y unidad; pasos ordenados que se pueden reordenar.
- Búsqueda por nombre, ingrediente o etiqueta.
- Favoritas para tener siempre a mano.
- Botón **Cocinar ahora** que registra la fecha, una calificación de 1 a 5 estrellas y notas.
- Historial de veces cocinada y promedio de calificación.
- Estadísticas: total de recetas, favoritas, cocinadas y tiempo medio.

---

### 9. Metas
Control de metas a largo, medio y corto plazo, con progreso medible, fecha objetivo y resumen por tipo.

---

## Standby (soon)

Estas ideas no son para la versión actual. Quedan guardadas para más adelante.

### Combinación de ropa y más (soon)
Planear outfits, crear combinaciones y sugerencias automáticas.

### Ideas generales (soon)
- Automatizaciones.
- Planear outfits.
- Sugerencias automáticas.
- Crear combinaciones de ropa.
- Alarmas de rutinas.
- Recordatorio de metas.
- Estilos y referencias.
- Fotografías generales tipo Pinterest.
- Tipo, color y uso de prendas, con historial y tiempo de uso.

### Avanzado (soon)
- Registro de uso, consumo, acabado, actualización y compra de productos.
- **Sistema de consumo:** cada producto con cantidad restante (%), fecha de compra y frecuencia de uso. Ejemplo: *"Te queda 20 % de shampoo"*.
- **Recordatorios inteligentes:** *"Compra desodorante"*, *"Cambia tu cepillo de dientes"*, *"Aplica mascarilla hoy"*.
- **Sugerencias automáticas:** *"Usa esto hoy"*, *"Compra esto"*, *"No estás usando esto"*.
- **Copia de seguridad** para no perder datos al cambiar de celular.
- **Buscador global** para prendas, hábitos, gastos y recetas.
- **Outfit por ocasión** (entrevista, gimnasio, salida).
- **Outfit exprés** ("tengo 5 minutos").
- **Planear la semana** (el domingo se dejan listos los 7 outfits).
- **Historial por lugar** para no repetir outfit en un mismo evento.
- **Sorpréndeme:** combinación al azar.
- **Pedir opinión:** compartir un outfit como imagen para que amigos voten.
- **Días sin...:** contador para hábitos que se quieren dejar.
- **Cosas por aprender:** lista de cursos o habilidades con progreso.
- **Cuenta regresiva:** por ejemplo "faltan 12 días para el parcial", en la pantalla principal.
- **Sincronización en la nube.**
- **Widgets de inicio:** hábito del día, outfit sugerido o gasto rápido.

---

## Funciones generales
Pendiente de detallar en la documentación original.


## tecnologias
SupabaseBase de datos (PostgreSQL) + Autenticación
CloudinaryAlmacenamiento y optimización de imágenes
FastAPI (Python)Cerebro / Lógica pesada
React + CapacitorInterfaz Web y Android APK
Móvil (Capacitor + Plugins)
Frontend (React + TypeScript + Tailwind CSS):

---

## Desarrollo

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements-dev.txt
uvicorn app.main:app --reload  # http://localhost:8000/docs
```

### Migraciones de base de datos

Ejecutar en orden en el **SQL Editor de Supabase**:

| Archivo | Contenido |
| --- | --- |
| `001_initial_schema.sql` | Perfiles + armario |
| `002_routines_and_finances.sql` | Rutinas, finanzas, compras y ahorros |
| `003_wishlist.sql` | Lista de deseos |
| `004_calendar_and_habits.sql` | Calendario y hábitos |
| `005_debts.sql` | Deudas |
| `006_habit_streaks.sql` | Rachas |
| `007_budgets_and_fixed_expenses.sql` | Presupuestos y gastos fijos |
| `008_goals_control.sql` | Metas |
| `009_recipes.sql` | **Recetas + historial de cocinadas** |
| `010_notifications.sql` | **Dispositivos push + preferencias** |

---

## Pruebas

```bash
# Frontend · unitarias (Vitest + Testing Library)
cd frontend
npm test
npm run test:watch

# Frontend · E2E (Playwright)
npx playwright install chromium
npm run test:e2e
# Con sesión real:
E2E_EMAIL=tu@email.com E2E_PASSWORD=tuclave npm run test:e2e

# Backend · API (pytest con Supabase en memoria)
cd backend
venv\Scripts\python -m pytest
```

El workflow `.github/workflows/tests.yml` ejecuta Vitest, Playwright y pytest en cada push a `main`.

---

## Notificaciones

- **Locales** (`@capacitor/local-notifications`): recordatorios de rutinas, hábitos y eventos del calendario, reprogramables desde **Ajustes → Notificaciones → Sincronizar recordatorios**.
- **Push** (`@capacitor/push-notifications`): el token se registra en el backend (`POST /notifications/register-device`).

Para activar el envío real de push:

1. **Android:** crear proyecto en Firebase, añadir `google-services.json` en `frontend/android/app/` y configurar `google-services` en Gradle.
2. **iOS:** crear una APNs Auth Key (`.p8`) en Apple Developer, habilitar *Push Notifications* en el target y subir la key al backend.
3. Implementar el envío en `POST /notifications/send` (hoy responde en modo `dry_run`).

---

## iOS

La plataforma iOS ya está creada (`frontend/ios`) con Capacitor 8.6 y el ciclo **UIScene** (`SceneDelegate.swift`).

```bash
cd frontend
npm run build
npx cap sync ios
npx cap open ios
```

En Xcode:

1. Seleccionar el target `App` → *Signing & Capabilities*.
2. Elegir tu equipo de desarrollo y un bundle identifier propio (el actual es `com.inven.easy`).
3. Añadir la capability **Push Notifications**.
4. Ejecutar en un simulador o dispositivo con iOS 16+.

> En Windows solo se puede generar y sincronizar el proyecto; compilar requiere macOS con Xcode.

---

## Accesibilidad

- Foco visible (`:focus-visible`) para teclado y switch control.
- Enlace **Saltar al contenido** y landmarks (`main`, `nav` con `aria-label`).
- Iconos decorativos con `aria-hidden` y botones con `aria-label`.
- Respeta `prefers-reduced-motion`.
- Safe area (`env(safe-area-inset-*)` + variables inyectadas por Capacitor) en navegación inferior y contenido.
