# Guía de Seguridad — Studio Dancers Management System
**Orden de ejecución completo con prompts para Claude Code**

> ⚠️ Regla de oro: Un paso a la vez. No avanzas al siguiente hasta confirmar que el anterior está resuelto.

---

## FASE 1 — Respaldo completo antes de tocar cualquier código

**Objetivo:** Tener todo respaldado y poder volver al estado actual si algo sale mal.

---

### Paso 1 — Identificar datos de conexión a PostgreSQL

**Prompt para Claude Code:**
```
Lee el archivo .env y cualquier archivo de configuración del proyecto.

Necesito que identifiques:
- Nombre de la base de datos
- Usuario de PostgreSQL
- Host y puerto
- Cualquier otra variable de entorno relacionada con la base de datos

No hagas ningún cambio. Solo muéstrame esa información para preparar el backup.
```

---

### Paso 2 — Generar el comando de backup de la base de datos

**Prompt para Claude Code:**
```
Con los datos de conexión que encontraste, dame el comando exacto de pg_dump 
para hacer un backup completo de la base de datos.

El archivo resultante debe llamarse:
backup_studio_dancers_[fecha de hoy].dump

Dime también en qué carpeta debo ejecutar el comando y dónde quedará guardado el archivo.
```

> 🖥️ **Tú ejecutas este comando en tu terminal.** Claude Code te lo da, tú lo corres.
> Cuando termine, sube el archivo .dump a Google Drive antes de continuar.

---

### Paso 3 — Guardar el código actual y crear rama de seguridad

**Prompt para Claude Code:**
```
Necesito guardar el estado actual del proyecto y crear una rama de trabajo 
antes de hacer cualquier cambio de seguridad.

Por favor ejecuta en orden:

1. git status
   (para ver qué archivos están pendientes)

2. git add .

3. git commit -m "Estado actual del sistema - funcionando antes de sesión de seguridad"

4. git checkout -b seguridad

5. Confírmame:
   - En qué rama estamos parados ahora
   - Que main quedó intacto con el estado anterior
   - Que la rama "seguridad" tiene exactamente el mismo estado que main
```

---

## FASE 2 — Diagnóstico completo (sin cambiar nada)

**Objetivo:** Entender exactamente qué tienes antes de modificar cualquier cosa.

---

### Paso 4 — Mapear los tres frontends

**Prompt para Claude Code:**
```
Mi sistema tiene tres frontends. Necesito un diagnóstico completo antes de tocar nada.

Por favor revisa la estructura del proyecto y dime:

1. ¿En qué carpeta está cada uno de estos sistemas?
   - Sistema de gestión principal
   - Mi Studio Portal (alumnos)
   - Mi Studio Portal (instructoras)

2. ¿En qué puerto corre cada uno según su vite.config.js?

3. ¿Hacia qué URL del backend apunta cada uno?

4. ¿Comparten el mismo backend FastAPI o cada uno tiene el suyo?

No hagas cambios. Solo el diagnóstico.
```

---

### Paso 5 — Revisar el estado del CORS

**Prompt para Claude Code:**
```
Revisa la configuración de CORS en el backend FastAPI.

Dime:
1. ¿Qué orígenes están permitidos actualmente?
2. ¿Están los tres frontends incluidos como orígenes permitidos?
3. ¿Hay algún wildcard (*) configurado?
4. ¿Qué métodos HTTP están permitidos?

Muéstrame el código actual de la configuración CORS y dime 
qué habría que ajustar para que los tres frontends funcionen 
correctamente durante las pruebas locales.

No hagas cambios todavía.
```

---

### Paso 6 — Análisis general del estado del proyecto

**Prompt para Claude Code:**
```
Quiero un análisis completo del estado actual del proyecto antes de 
implementar cualquier cambio de seguridad.

Revisa:

1. BACKEND (FastAPI)
   - Todos los endpoints existentes
   - Cuáles tienen protección de autenticación y cuáles no
   - Estado de la conexión a la base de datos
   - Si hay validación de datos en los endpoints

2. FRONTEND — los tres sistemas (React)
   - Rutas protegidas vs rutas públicas
   - Cómo se manejan actualmente las sesiones o tokens
   - Llamadas al backend: ¿apuntan a las URLs correctas?

3. BASE DE DATOS
   - Modelos o schemas definidos
   - Relaciones entre tablas
   - Si hay migraciones pendientes

4. Dame el reporte final en este formato exacto:

   ✅ Funciona correctamente: [lista]
   ⚠️ Posibles problemas: [lista]  
   🔴 Roto o incompleto: [lista]

No implementes nada. Solo el diagnóstico.
```

---

## FASE 3 — Levantar ambiente de pruebas paralelo

**Objetivo:** Tener los cuatro servicios corriendo al mismo tiempo para probar sin afectar producción.

---

### Paso 7 — Configurar puertos para pruebas paralelas

**Prompt para Claude Code:**
```
Necesito levantar los cuatro servicios al mismo tiempo en puertos diferentes 
para poder probar que todo funciona en paralelo.

Por favor:

1. Verifica que cada frontend tenga su puerto asignado sin conflictos:
   - Backend FastAPI → puerto 8000
   - Sistema de gestión → puerto 5173
   - Portal alumnos → puerto 5174
   - Portal instructoras → puerto 5175

2. Si algún vite.config.js necesita ajuste de puerto, muéstrame 
   el cambio exacto antes de aplicarlo.

3. Dame los cuatro comandos exactos que debo ejecutar, 
   cada uno en una terminal diferente, para levantar todo en paralelo.

4. Confirma que el CORS del backend incluye los tres orígenes 
   (5173, 5174, 5175) para que no haya errores de CORS en las pruebas.
```

> 🖥️ **Abre cuatro terminales** y ejecuta cada comando en una terminal diferente.

---

### Paso 8 — Verificación manual antes de cambios

Con los cuatro servicios corriendo, verifica tú mismo en el navegador:

**Sistema de gestión (puerto 5173):**
- [ ] La pantalla de login carga
- [ ] Puedes iniciar sesión
- [ ] La lista de alumnos aparece correctamente
- [ ] Los grupos muestran sus datos

**Portal alumnos (puerto 5174):**
- [ ] La pantalla de acceso carga
- [ ] Un alumno puede entrar con sus credenciales
- [ ] Solo ve su propia información

**Portal instructoras (puerto 5175):**
- [ ] La pantalla de acceso carga
- [ ] Una instructora puede entrar
- [ ] Solo ve sus grupos asignados

> ✅ Si todo está bien aquí, recién avanzas a la Fase 4.

---

## FASE 4 — Implementación de seguridad

**Objetivo:** Aplicar los cambios con control, uno a la vez, del menor al mayor riesgo.

---

### Paso 9 — Colocar el archivo SECURITY_CONTEXT.md

**Prompt para Claude Code:**
```
Lee el archivo SECURITY_CONTEXT.md que está en la raíz del proyecto.

Confirma que lo leíste y haz un resumen de las reglas que contiene.
No implementes nada todavía.
```

---

### Paso 10 — Variables de entorno (sin riesgo)

**Prompt para Claude Code:**
```
Empecemos por el cambio de menor riesgo: las variables de entorno.

1. Revisa si ya existe un archivo .env con todas las variables necesarias
   según SECURITY_CONTEXT.md

2. Si faltan variables, agrégalas con valores placeholder para que yo 
   las complete manualmente

3. Verifica que el .env está en el .gitignore

4. Crea un archivo .env.example con los nombres de todas las variables 
   pero sin valores reales

5. Confirma los cambios realizados y si hay algo que yo deba completar manualmente
```

---

### Paso 11 — Hasheo de contraseñas

**Prompt para Claude Code:**
```
Implementa el hasheo de contraseñas con bcrypt.

1. Verifica si python-passlib o bcrypt ya están instalados. 
   Si no, agrégalos a requirements.txt e instálalos.

2. Revisa cómo se están guardando las contraseñas actualmente.

3. Implementa las funciones hash_password() y verify_password() 
   usando bcrypt.

4. Actualiza el flujo de registro y login para usar estas funciones.

5. IMPORTANTE: Si ya hay usuarios en la base de datos con contraseñas 
   en texto plano, no los borres. Muéstrame un script de migración 
   para hashearlas antes de ejecutarlo.

6. Confirma qué cambió y muéstrame el código nuevo.
```

---

### Paso 12 — JWT y protección de rutas

**Prompt para Claude Code:**
```
Implementa autenticación con JWT para los tres sistemas.

1. Instala python-jose si no está instalado. Agrégalo a requirements.txt.

2. Implementa:
   - Generación de access token (expiración: 30 minutos)
   - Generación de refresh token (expiración: 7 días)
   - Función de verificación de token
   - Dependencia get_current_user para proteger endpoints

3. Protege todos los endpoints existentes excepto /auth/login y /auth/refresh

4. En el frontend (los tres sistemas), implementa:
   - Guardado del token después del login
   - Envío del token en el header Authorization de cada petición
   - Redirección al login si el token expiró o es inválido

5. ANTES de aplicar, muéstrame la lista de endpoints que van a quedar 
   protegidos y los que quedarán públicos, para que yo confirme.

No apliques hasta que yo confirme la lista.
```

---

### Paso 13 — Sistema de roles

**Prompt para Claude Code:**
```
Implementa el sistema de roles admin e instructor.

Roles definidos:
- admin: acceso total (alumnos, grupos, pagos, instructoras, reportes)
- instructor: solo puede ver y editar sus propios grupos asignados. 
  Sin acceso a pagos ni datos financieros.

1. Agrega el campo "rol" al modelo de usuario si no existe
2. Crea una dependencia require_admin y require_instructor para los endpoints
3. Aplica la protección correspondiente a cada endpoint según el rol requerido
4. En el frontend, muestra u oculta secciones según el rol del usuario logueado

5. ANTES de aplicar, muéstrame:
   - Qué endpoints quedan solo para admin
   - Qué endpoints quedan para instructor
   - Qué cambios requiere la base de datos

No apliques hasta que yo confirme.
```

---

### Paso 14 — Validación Pydantic

**Prompt para Claude Code:**
```
Revisa y refuerza la validación de datos en todos los endpoints del backend.

1. Verifica que todos los endpoints tienen schemas Pydantic definidos
2. Para los que no tengan, créalos con:
   - Tipos de dato correctos
   - Longitudes máximas en campos de texto (nombres: 100 chars, etc.)
   - Campos requeridos marcados explícitamente
   - Emails validados con EmailStr
3. Confirma que el backend valida independientemente del frontend

Muéstrame los schemas nuevos o modificados antes de aplicarlos.
```

---

### Paso 15 — CORS final y headers de seguridad

**Prompt para Claude Code:**
```
Configura el CORS final del backend y agrega los headers de seguridad HTTP.

1. CORS: permite exactamente estos orígenes en producción:
   [dime tú cuáles son tus dominios reales]
   Y en desarrollo: http://localhost:5173, http://localhost:5174, http://localhost:5175

2. Sin wildcard (*) en producción bajo ninguna circunstancia

3. Agrega estos headers de seguridad HTTP a todas las respuestas:
   - Strict-Transport-Security
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY

4. Muéstrame el código antes de aplicarlo.
```

---

### Paso 16 — Manejo de errores

**Prompt para Claude Code:**
```
Implementa manejo de errores profesional en el backend.

1. Los endpoints deben capturar excepciones con try/except
2. Al cliente: mensaje genérico {"detail": "Error interno del servidor"}
3. Al log del servidor: detalle completo del error con timestamp
4. Configura logging con Python logging o loguru
5. Asegúrate de que los errores de base de datos no expongan 
   nombres de tablas ni queries al cliente

Muéstrame los cambios antes de aplicarlos.
```

---

## FASE 5 — Verificación final y merge a main

**Objetivo:** Confirmar que nada se rompió antes de subir a producción.

---

### Paso 17 — Análisis pre-merge por Claude Code

**Prompt para Claude Code:**
```
Antes de hacer merge a main, necesito un análisis completo del estado actual.

1. BACKEND
   - Confirma que todos los endpoints críticos están protegidos con JWT
   - Verifica que el sistema de roles funciona correctamente
   - Confirma que no hay queries construidas con concatenación de strings
   - Verifica que las credenciales están en .env

2. FRONTEND (los tres sistemas)
   - Confirma que las rutas protegidas redirigen al login sin sesión activa
   - Verifica que el token se envía correctamente en cada petición al backend
   - Identifica si algún componente puede estar fallando por los cambios

3. BASE DE DATOS
   - Confirma que las migraciones están aplicadas y en orden
   - Verifica que las relaciones entre tablas siguen intactas

4. Dame el reporte final:

   ✅ Funciona correctamente: [lista]
   ⚠️ Posibles problemas: [lista]
   🔴 Roto o incompleto: [lista]

No hagas merge hasta que yo lo confirme.
```

---

### Paso 18 — Verificación manual final (tú en el navegador)

Con los cuatro servicios corriendo, repite el checklist completo:

**Sistema de gestión:**
- [ ] Login funciona
- [ ] Lista de alumnos carga
- [ ] Grupos muestran datos correctamente
- [ ] Registro de pagos funciona
- [ ] Agregar / editar alumno funciona
- [ ] Logout funciona

**Portal alumnos:**
- [ ] Login funciona
- [ ] Solo muestra datos del alumno logueado
- [ ] No puede acceder a datos de otros alumnos

**Portal instructoras:**
- [ ] Login funciona
- [ ] Solo muestra sus grupos asignados
- [ ] No tiene acceso a sección de pagos

---

### Paso 19 — Merge a main

**Prompt para Claude Code:**
```
Todo está verificado y confirmado. Por favor:

1. git add .
2. git commit -m "Implementación de seguridad completa - autenticación JWT, roles, validación"
3. git checkout main
4. git merge seguridad
5. Confírmame que el merge quedó limpio y sin conflictos
```

---

## Resumen del flujo completo

| Fase | Qué haces | Riesgo |
|------|-----------|--------|
| Fase 1 | Backup BD + rama seguridad | ✅ Ninguno |
| Fase 2 | Diagnóstico completo | ✅ Ninguno |
| Fase 3 | Ambiente de pruebas paralelo | ✅ Bajo |
| Fase 4 | Implementación paso a paso | ⚠️ Controlado |
| Fase 5 | Verificación + merge a main | ✅ Bajo si fases anteriores OK |

---

*Generado para Studio Dancers Management System — Guayaquil, Ecuador*
