# Guía de Seguridad — Studio Dancers Management System
**Arquitectura: React + Vite + Supabase | Orden de ejecución con prompts**

> ⚠️ Regla de oro: Un paso a la vez. No avanzas al siguiente hasta confirmar que el anterior está resuelto.

---

## FASE 1 — Respaldo completo antes de tocar cualquier código

**Objetivo:** Tener todo respaldado antes de cualquier cambio.

---

### Paso 1 — Backup de la base de datos en Supabase

Esto lo haces TÚ directamente en el dashboard, no Claude Code:

1. Entra a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Settings → Database → Backups
4. Haz clic en "Create backup" para generar un backup manual ahora mismo

> Guarda el backup antes de continuar.

---

### Paso 2 — Verificar que .env está protegido

**Prompt para Claude Code:**
```
Revisa el proyecto y dime:

1. ¿Existe un archivo .env en la raíz?
2. ¿Qué variables contiene? (solo los nombres, no los valores)
3. ¿El .env está listado en el .gitignore?
4. ¿Existe un .env.example?
5. ¿Hay algún lugar en el código donde se use o mencione 
   una service_role key de Supabase?

No hagas cambios. Solo el diagnóstico.
```

---

### Paso 3 — Guardar código actual y crear rama de seguridad

**Prompt para Claude Code:**
```
Necesito guardar el estado actual antes de cualquier cambio de seguridad.

Por favor ejecuta en orden:

1. git status
2. git add .
3. git commit -m "Estado actual del sistema - funcionando antes de sesión de seguridad"
4. git checkout -b seguridad

Confírmame que estamos en la rama "seguridad" y que main quedó intacto.
```

---

## FASE 2 — Diagnóstico completo (sin cambiar nada)

**Objetivo:** Entender exactamente el estado de seguridad actual.

---

### Paso 4 — Mapear los tres sistemas

**Prompt para Claude Code:**
```
Mi proyecto tiene tres frontends React conectados al mismo proyecto de Supabase.

Por favor revisa la estructura de carpetas y dime:

1. ¿Dónde está cada sistema?
   - Sistema de gestión principal
   - Mi Studio Portal (alumnos)
   - Mi Studio Portal (instructoras)

2. ¿En qué puerto corre cada uno según su vite.config.js?

3. ¿Todos usan el mismo archivo supabase.js con createClient()?
   ¿O cada uno tiene su propia instancia del cliente?

4. ¿Cómo se maneja la sesión del usuario en cada sistema?
   ¿Usan onAuthStateChange o verifican la sesión de otra forma?

No hagas cambios. Solo el diagnóstico.
```

---

### Paso 5 — Auditoría de rutas protegidas

**Prompt para Claude Code:**
```
Revisa el sistema de rutas en los tres frontends.

Para cada sistema dime:

1. ¿Qué rutas requieren sesión activa para verse?
2. ¿Qué rutas son públicas (login, registro)?
3. ¿Hay alguna ruta que debería estar protegida pero no lo está?
4. ¿Cómo se implementa la redirección al login cuando no hay sesión?
   ¿Con un componente ProtectedRoute, un hook, o de otra forma?

Muéstrame el código actual de protección de rutas.
No hagas cambios.
```

---

### Paso 6 — Auditoría de RLS en Supabase

Este paso lo revisas TÚ en el dashboard de Supabase:

1. Entra a tu proyecto en Supabase
2. Ve a Database → Tables
3. Para cada tabla verifica que el ícono de RLS diga "RLS enabled"
4. Ve a Authentication → Policies
5. Anota qué tablas tienen políticas definidas y cuáles no

Luego dile a Claude Code:

**Prompt para Claude Code:**
```
Revisé el dashboard de Supabase. Las siguientes tablas tienen RLS activado: [lista]
Las siguientes tablas NO tienen RLS o no tienen políticas: [lista]

Por favor:
1. Dime qué riesgo representa cada tabla sin RLS
2. Genera las políticas SQL necesarias para cada tabla según estos roles:
   - admin: acceso total a todas las tablas
   - instructor: solo SELECT en sus grupos asignados y gestión de asistencia
   - Sin acceso a pagos para instructores bajo ninguna circunstancia

Muéstrame el SQL antes de que yo lo ejecute en Supabase.
```

---

### Paso 7 — Análisis general del estado

**Prompt para Claude Code:**
```
Quiero un diagnóstico completo del estado de seguridad actual del proyecto.

Revisa:

1. Variables de entorno: ¿están todas en .env y ninguna hardcodeada?
2. Autenticación: ¿cómo se verifica la sesión en cada pantalla protegida?
3. Roles: ¿cómo se determina si el usuario es admin o instructor?
   ¿Se verifica en el frontend o solo en RLS?
4. Errores de Supabase: ¿se muestran en crudo al usuario o se traducen?
5. Validación de formularios: ¿se valida antes de enviar a Supabase?

Dame el reporte en este formato:

✅ Funciona correctamente: [lista]
⚠️ Posibles problemas: [lista]
🔴 Roto o incompleto: [lista]

No hagas cambios.
```

---

## FASE 3 — Levantar ambiente de pruebas paralelo

**Objetivo:** Probar los tres sistemas al mismo tiempo antes y después de los cambios.

---

### Paso 8 — Configurar pruebas paralelas

**Prompt para Claude Code:**
```
Necesito correr los tres frontends al mismo tiempo para probar en paralelo.

1. Verifica los puertos configurados en cada vite.config.js
2. Si hay conflictos de puerto, muéstrame el ajuste antes de aplicarlo
3. Dame los comandos exactos para abrir cuatro terminales:
   - Terminal 1: sistema de gestión
   - Terminal 2: portal alumnos
   - Terminal 3: portal instructoras
   (el backend es Supabase, no necesita terminal local)
```

---

### Paso 9 — Verificación manual antes de cambios

Con los tres sistemas corriendo, verifica en el navegador:

**Sistema de gestión:**
- [ ] Login funciona
- [ ] Lista de alumnos carga
- [ ] Grupos muestran datos
- [ ] Pagos accesibles solo como admin
- [ ] Logout funciona

**Portal alumnos:**
- [ ] Login funciona
- [ ] Solo muestra datos del alumno logueado

**Portal instructoras:**
- [ ] Login funciona
- [ ] Solo muestra grupos asignados
- [ ] No tiene acceso a pagos

> ✅ Si todo está bien aquí, recién avanzas a la Fase 4.

---

## FASE 4 — Implementación de seguridad

**Objetivo:** Aplicar correcciones en orden, del menor al mayor riesgo.

---

### Paso 10 — Proteger .env y eliminar service_role key

**Prompt para Claude Code:**
```
Aplica las correcciones de variables de entorno:

1. Si el .env no está en .gitignore, agrégalo ahora
2. Si existe un .env.example, verifica que no tenga valores reales
3. Si no existe, créalo con los nombres de variables sin valores
4. Busca en TODO el código si hay alguna service_role key hardcodeada
   y elimínala si la encuentras

Confirma cada cambio realizado.
```

---

### Paso 11 — Implementar RLS en Supabase

Después de revisar el SQL que te dio Claude Code en el Paso 6:

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta cada política SQL una por una
3. Verifica en Database → Tables que RLS aparece activado en cada tabla

Luego confirma a Claude Code:

**Prompt para Claude Code:**
```
Ya ejecuté las políticas RLS en Supabase. 

Por favor genera consultas de prueba para verificar que:
1. Un usuario con rol instructor NO puede ver datos de pagos
2. Un instructor NO puede ver grupos que no le pertenecen
3. Un admin SÍ puede ver todo

Dame el código JavaScript usando el cliente de Supabase 
para hacer estas pruebas desde la consola del navegador.
```

---

### Paso 12 — Reforzar protección de rutas

**Prompt para Claude Code:**
```
Implementa protección de rutas robusta en los tres sistemas.

Para cada frontend:
1. Crea o mejora el componente ProtectedRoute que:
   - Verifica sesión activa con supabase.auth.getSession()
   - Redirige al login si no hay sesión
   - Verifica el rol del usuario antes de mostrar secciones sensibles

2. Aplica ProtectedRoute a todas las rutas que requieren autenticación

3. Asegura que el rol admin sea el único que puede ver:
   - Sección de pagos
   - Lista completa de alumnos
   - Gestión de instructoras

Muéstrame los cambios antes de aplicarlos.
```

---

### Paso 13 — Validación de formularios

**Prompt para Claude Code:**
```
Revisa todos los formularios del proyecto que envían datos a Supabase.

Para cada formulario verifica y aplica:
1. Campos requeridos validados antes del submit
2. Formatos correctos (emails, teléfonos, fechas)
3. Longitudes máximas en campos de texto
4. Mensaje de error claro al usuario si falta algo

Si el proyecto no usa Zod todavía, implementa validación básica 
con manejo de estado de errores por campo.

Muéstrame los formularios que necesitan corrección.
```

---

### Paso 14 — Manejo de errores de Supabase

**Prompt para Claude Code:**
```
Revisa cómo se manejan los errores de Supabase en todo el proyecto.

1. Identifica todos los lugares donde se hace una llamada a Supabase
   sin capturar el error correctamente

2. Para cada uno implementa:
   - Captura del error con try/catch o verificando el campo { error }
   - Mensaje amigable en español para el usuario
   - Nunca mostrar el error técnico de Supabase directamente

Ejemplo de lo que quiero:
   Antes: setError(error.message)
   Después: setError("Ocurrió un error al guardar. Intenta de nuevo.")

Muéstrame los cambios antes de aplicarlos.
```

---

## FASE 5 — Verificación final y merge a main

---

### Paso 15 — Análisis pre-merge

**Prompt para Claude Code:**
```
Antes de hacer merge a main, necesito un análisis completo.

1. VARIABLES DE ENTORNO
   - ¿El .env está en .gitignore?
   - ¿No hay service_role key en ningún archivo del proyecto?

2. AUTENTICACIÓN Y RUTAS
   - ¿Todas las rutas protegidas redirigen al login sin sesión?
   - ¿El rol del usuario se verifica antes de mostrar secciones sensibles?

3. FORMULARIOS
   - ¿Todos los formularios validan antes de enviar a Supabase?
   - ¿Los errores se muestran en español y de forma amigable?

4. CÓDIGO GENERAL
   - ¿Hay algo roto o incompleto después de los cambios?

Dame el reporte final:

✅ Correcto: [lista]
⚠️ Posibles problemas: [lista]
🔴 Roto: [lista]

No hagas merge hasta que yo confirme.
```

---

### Paso 16 — Verificación manual final

Con los tres sistemas corriendo, repite el checklist completo del Paso 9.
Si todo está bien, confirma a Claude Code:

**Prompt para Claude Code:**
```
Todo verificado y funciona correctamente en los tres sistemas.

Por favor:
1. git add .
2. git commit -m "Seguridad implementada - RLS, rutas protegidas, validación, manejo de errores"
3. git checkout main
4. git merge seguridad

Confirma que el merge quedó limpio.
```

---

## Resumen del flujo

| Fase | Qué haces | Riesgo |
|------|-----------|--------|
| Fase 1 | Backup Supabase + rama seguridad | ✅ Ninguno |
| Fase 2 | Diagnóstico completo | ✅ Ninguno |
| Fase 3 | Pruebas paralelas de los 3 sistemas | ✅ Bajo |
| Fase 4 | Implementación paso a paso | ⚠️ Controlado |
| Fase 5 | Verificación + merge a main | ✅ Bajo |

---

*Studio Dancers — Guayaquil, Ecuador*