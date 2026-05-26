# ITechProject Price Control

## Descripción
ITechProject Price Control es una aplicación web estática de control de precios y liquidación que corre en el navegador sin backend. Incluye una pantalla de inicio de sesión simple y un panel de cálculo de precios que permite gestionar productos, nómina y gastos operativos, calcular utilidades, impuestos y exportar resultados en formato de factura para impresión.

## Estructura física del proyecto

- `index.html`
  - Página de acceso principal.
  - Formulario de inicio de sesión con usuario y contraseña.
  - Referencia al script `js/login.js`.

- `dashboard.html`
  - Interfaz principal de la app después del login.
  - Contiene el dashboard, tabla de productos, panel de impuestos, nómina y gastos.
  - Incluye modales, notificaciones y botón de exportación.

- `css/`
  - `fonts.css`: definiciones de fuentes.
  - `styles.css`: estilos personalizados de la aplicación.

- `js/`
  - `app.js`: lógica principal de la aplicación, cálculos, renderizado, almacenamiento local y UI.
  - `login.js`: lógica de autenticación offline y manejo de sesión.
  - `lucide.js`: librería de iconos Lucide.
  - `tailwind-config.js` y `tailwind.js`: configuración y carga de Tailwind CSS.

- `assets/`
  - Contiene iconos e imágenes usados por la aplicación.

- `partials/`
  - Fragmentos HTML incluidos en la app (no se usan directamente en `dashboard.html` y `index.html` en la versión analizada).

- `ITechProjectCostOffline/`
  - Directorio auxiliar presente en el proyecto; su contenido no fue necesario para documentar la app principal.

## Funcionalidad principal

### Autenticación
- Login offline basado en usuario y contraseña.
- Credenciales predeterminadas:
  - Usuario: `admin`
  - Contraseña: `1234`
- El inicio de sesión puede recordarse usando `localStorage` con expiración de 7 días.
- También existe la opción de sesión temporal usando `sessionStorage`.
- Se redirige automáticamente a `dashboard.html` si la sesión está activa.
- Botón de cierre de sesión disponible en el dashboard para eliminar la sesión y volver a `index.html`.

### Almacenamiento de datos
- Los datos se guardan en `localStorage` bajo la clave `finance_v65_itech`.
- El almacenamiento abarca:
  - Configuración: tasa de cambio, utilidad %, efectivo %.
  - Productos/servicios.
  - Nómina de empleados.
  - Gastos operativos.
  - Tema seleccionado (claro/oscuro).
- El código valida datos y protege contra valores inválidos, nombres demasiado largos y montos fuera de rango.

### Gestión de productos, nómina y gastos
- Se pueden agregar, editar y eliminar:
  - Productos/servicios con nombre, monto y moneda (`USD` o `CUP`).
  - Nómina de empleados con nombre y monto.
  - Gastos operativos con nombre y monto.
- La tabla de productos muestra valores sugeridos y subtotales calculados en tiempo real.
- Las listas de nómina y gastos permiten entrada directa de valores monetarios con formato.

### Cálculos financieros
- El botón `Calcular` realiza un procesamiento completo que incluye:
  - Conversión de USD a CUP usando tasa de cambio.
  - Aplicación de porcentaje de utilidad y porcentaje de efectivo.
  - Cálculo del precio de oferta final.
  - Cálculo de impuestos: ventas/servicios 10%, ingresos personales 5%, acumulativo 10%.
  - Resumen en tarjetas del dashboard:
    - Ventas Liquidada
    - Utilidad Bruta
    - Utilidad Neta
    - Retenciones ONAT
    - Inversión Base Total
- Se muestra una liquidación sugerida y un cálculo de factura exportable.

### Exportar factura
- Botón `Exportar` genera una vista de factura para impresión.
- La factura imprime fecha, referencia, tasa de cambio y totales por producto.
- Se usa la vista `print-only` para formatear el contenido durante la impresión.

### Experiencia de usuario
- Tema claro/oscuro con toggle.
- Notificaciones tipo toast para éxito y errores.
- Modales para:
  - Advertir falta de tasa de cambio.
  - Confirmar limpieza de configuración.
  - Confirmar reinicio de datos.
- Interfaz compatible con Tailwind CSS y efectos visuales modernos.

## Características adicionales

- Validaciones de seguridad en JavaScript:
  - Límite de 500 registros por tipo.
  - Límite de 100 caracteres en textos.
  - Monto máximo de `999999999.99`.
- Gestión de entrada monetaria con formateo automático.
- Control de estados vacío en la tabla de productos.
- Botón de limpiar configuración que restablece tasas y márgenes sin borrar datos de productos.
- Confirmación visual antes de eliminar registros.

## Requisitos y uso

- No requiere servidor; funciona como aplicación estática.
- Abra `index.html` en el navegador para iniciar la aplicación.
- Se recomienda usar navegadores modernos con soporte para `localStorage`, `sessionStorage` y `window.print()`.

## Notas importantes

- Es una aplicación de control local, no tiene backend ni base de datos remota.
- La autenticación es básica y no es adecuada para producción sin un servidor seguro.
- Datos sensibles se almacenan localmente en el navegador.

## Mejoras futuras sugeridas

- Integrar backend y API segura para autenticación y almacenamiento centralizado.
- Añadir gestión de usuarios con roles y permisos.
- Implementar exportación a formatos PDF/Excel además de impresión.
- Agregar validación y cálculo fiscal para más tipos de impuestos locales.
- Permitir importación/exportación de datos JSON para copias de seguridad.
