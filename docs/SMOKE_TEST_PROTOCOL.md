# Protocolo de Smoke Test antes de push a producción

**Regla acordada con el dueño (2026-06-09):** ningún cambio que pueda afectar
la coherencia del sistema sale a producción sin smoke test cuantitativo previo.

## Cuándo aplica

Cualquier cambio que toque alguno de estos vectores:

- Cálculo de fechas de pago (`next_payment_date`, `last_payment_date`)
- Cálculo de clases (contadores `Clase N/M`, calendarios)
- Estado de pago de la alumna (`paid`, `partial`, `overdue`, `cycle_ended`)
- Datos derivados del curso (`ciclo_inicio`, `ciclo_fin`, `class_days`,
  `classes_per_cycle`, `monthly_fee`)
- Migraciones SQL contra tablas con datos (>10 filas afectadas)
- Cambios al RPC `rpc_client_login` o `rpc_public_courses`
- Cambios al admin panel que afecten a Mi Studio Portal y viceversa

**No aplica** para cambios puramente cosméticos (color, padding, copy)
sin lógica detrás.

## Procedimiento (5 pasos)

### 1. Identificar alumna real de testing

Usar un caso de la BD productiva con la combinación de campos que el cambio
afecta. Para el modelo de cobros se usa:

- **Alejandra Gómez Salazar** (id `bef7446f-7d92-438b-9d6f-cc27fedcf142`)
  - Curso: Baby Ballet - Ciclo Formativo (rolling=false, ciclo 15jun→13ene)
  - Pago: 8 jun 2026, próximo 15 jul 2026
  - Edge case: pagó *antes* del inicio del ciclo

### 2. Query datos reales

```sql
SELECT s.*, c.ciclo_inicio, c.ciclo_fin, c.class_days, c.classes_per_cycle,
       c.renovacion_rolling, c.vigencia_meses
FROM students s
LEFT JOIN courses c ON c.id::text = s.course_id OR c.code = s.course_id
WHERE s.id = '<id>';
```

Verificar con `npx supabase db query --linked -f /tmp/x.sql -o table`.

### 3. Tabla de esperado vs renderizado

Construir una tabla con cada métrica afectada y su valor esperado, calculado
*manualmente* a partir de los datos crudos. Ejemplo:

| Indicador | Esperado (calculado) | Renderizado (en pantalla) | OK? |
|---|---|---|---|
| Próximo pago | 15-jul | 15-jul | ✓ |
| Clases este mes | 8 | 8 | ✓ |

Si difiere, hay un bug — no pushear.

### 4. Edge cases obligatorios

Cada cambio debe revisar:

- **Sin ciclo escolar** (ciclo_inicio = null) → ¿comportamiento original intacto?
- **Solo ciclo_inicio o solo ciclo_fin** → ¿no rompe nada?
- **Ciclo finalizado** (today > ciclo_fin) → ¿se muestra "Ciclo finalizado"?
- **Antes del ciclo** (today < ciclo_inicio) → ¿se muestra "Inicia el…"?
- **Curso rolling vs día fijo** → ambos siguen funcionando.
- **Alumna sin `next_payment_date`** (recién inscrita) → no crashea.
- **Alumna en pausa** (`is_paused = true`) → no rompe la pantalla.

### 5. Cross-repo: validar coherencia SDA Admin ↔ Mi Studio Portal

Cuando un cambio toque datos compartidos (curso, alumna, pago), revisar
*ambos* repos. La info que ve la admin debe coincidir con la del padre.

- SDA Admin: `D:\Studio Dancers Adm` (branch `main`)
- Mi Studio Portal: `D:\Studio Dancers Portal` (branch `master`)

## Anti-patrones cazados (registro de incidentes)

| Fecha | Bug | Causa raíz |
|---|---|---|
| 2026-06-09 | Calendario marcaba 9 y 10 jun como "Próxima clase" | `isClass` no respetaba `ciclo_inicio`, solo `last_payment_date` |
| 2026-06-09 | "Próximo pago: 08-jul" después del fix a 15-jul | CalendarTab leía `session.students` cacheado del login |
| 2026-06-09 | Alejandra: `next_payment_date` = 8/07 en lugar de 15/07 | `registerPayment` no clampaba al ciclo escolar |
| 2026-06-09 | Mi Studio decía "Tu próxima clase: Hoy" antes del ciclo | `getNextClassDate` no recibía `ciclo_inicio` |
| 2026-06-09 | Admin "Clase 2/14" para Alejandra (debería ser pre-ciclo) | `getCycleInfo` se llamaba con `last_payment_date` en vez de clampar |

## Checklist para futuros cambios

```
□ Smoke test con dato real de BD ejecutado
□ Tabla esperado vs renderizado construida
□ Edge cases obligatorios revisados
□ Coherencia cross-repo verificada (si aplica)
□ Build limpio en ambos repos
□ Commit message describe el smoke test
```
