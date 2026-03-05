# Plan: CRM para Estudio de Danza - "DanceCRM"

## Resumen

CRM web dedicado para gestionar leads que llegan por WhatsApp, redes sociales, referidos y walk-ins. El objetivo es: no perder leads, hacer seguimiento sistemático, mejorar cierres y retención, y obtener mejor data para optimizar anuncios en Meta.

**Stack:** React 19 + Vite 7 + Tailwind CSS 4 + Supabase + Vercel (mismo stack que Studio Dancers Adm)
**Proyecto:** Separado del admin existente, nueva carpeta, nuevo repo, nuevo proyecto Supabase.

---

## Fase 1 - MVP (Lo que construiremos primero)

### 1.1 Scaffold del proyecto
- `npm create vite@latest dance-crm -- --template react`
- Instalar dependencias: `@supabase/supabase-js`, `date-fns`, `lucide-react`, `react-router-dom`
- Configurar Tailwind CSS 4, PostCSS
- Estructura de carpetas:

```
dance-crm/
├── src/
│   ├── main.jsx
│   ├── App.jsx                  # Router principal
│   ├── index.css                # Tailwind imports
│   ├── pages/
│   │   ├── LoginPage.jsx        # Auth
│   │   ├── DashboardPage.jsx    # Métricas principales
│   │   ├── LeadsPage.jsx        # Lista + Kanban de leads
│   │   ├── LeadDetailPage.jsx   # Detalle de un lead con timeline
│   │   ├── FollowUpsPage.jsx    # Tareas de seguimiento pendientes
│   │   └── SettingsPage.jsx     # Config (pipeline stages, templates)
│   ├── components/
│   │   ├── Layout.jsx           # Sidebar + header + main content
│   │   ├── Sidebar.jsx          # Navegación lateral
│   │   ├── KanbanBoard.jsx      # Vista kanban del pipeline
│   │   ├── LeadCard.jsx         # Card de lead en kanban/lista
│   │   ├── LeadForm.jsx         # Crear/editar lead
│   │   ├── InteractionTimeline.jsx  # Timeline de interacciones
│   │   ├── FollowUpForm.jsx     # Crear/editar follow-up
│   │   ├── FollowUpList.jsx     # Lista de follow-ups
│   │   ├── StatsCard.jsx        # Card de métrica del dashboard
│   │   ├── QuickActions.jsx     # Botones rápidos (nuevo lead, etc)
│   │   ├── MessageTemplate.jsx  # Template con copy-to-clipboard
│   │   ├── Toast.jsx            # Notificaciones
│   │   └── Modal.jsx            # Modal reutilizable
│   ├── hooks/
│   │   ├── useAuth.js           # Autenticación Supabase
│   │   ├── useLeads.js          # CRUD leads + pipeline
│   │   ├── useFollowUps.js      # CRUD follow-ups
│   │   ├── useInteractions.js   # CRUD interacciones
│   │   ├── useDashboard.js      # Métricas agregadas
│   │   └── useMessageTemplates.js # Templates de mensajes
│   └── lib/
│       ├── supabase.js          # Cliente Supabase
│       ├── constants.js         # Pipeline stages, fuentes, etc.
│       └── utils.js             # Helpers generales
├── public/
├── database-v1.sql              # Migración inicial
├── .env.example
├── package.json
└── vite.config.js
```

### 1.2 Base de datos (Supabase)

```sql
-- ============================================
-- PIPELINE STAGES (configurable)
-- ============================================
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- 'Nuevo', 'Contactado', 'Interesado', etc.
  slug TEXT NOT NULL UNIQUE,       -- 'new', 'contacted', 'interested', etc.
  position INT NOT NULL,           -- Orden en el kanban
  color TEXT DEFAULT 'gray',       -- Color para UI
  is_won BOOLEAN DEFAULT false,    -- Stage = ganado (Inscrito)
  is_lost BOOLEAN DEFAULT false,   -- Stage = perdido
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stages iniciales
INSERT INTO pipeline_stages (name, slug, position, color) VALUES
  ('Nuevo', 'new', 1, 'blue'),
  ('Contactado', 'contacted', 2, 'yellow'),
  ('Interesado', 'interested', 3, 'orange'),
  ('Clase de prueba', 'trial', 4, 'purple'),
  ('Inscrito', 'enrolled', 5, 'green'),
  ('Perdido', 'lost', 6, 'red');

UPDATE pipeline_stages SET is_won = true WHERE slug = 'enrolled';
UPDATE pipeline_stages SET is_lost = true WHERE slug = 'lost';

-- ============================================
-- LEADS (tabla principal)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos de contacto
  full_name TEXT NOT NULL,
  phone TEXT,                      -- Número WhatsApp/teléfono
  email TEXT,
  instagram TEXT,                  -- @username

  -- Pipeline
  stage_id UUID REFERENCES pipeline_stages(id),

  -- Interés
  course_interest TEXT,            -- 'Salsa', 'Ballet', 'Bachata', etc.
  age_range TEXT,                  -- 'niño', 'adolescente', 'adulto'
  notes TEXT,                      -- Notas generales

  -- Origen/Fuente
  source TEXT NOT NULL DEFAULT 'direct', -- 'meta_ads', 'instagram', 'whatsapp', 'walk_in', 'referral', 'website'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  referrer_name TEXT,              -- Nombre de quien refirió

  -- Scoring
  lead_score INT DEFAULT 0,        -- 0-100

  -- Asignación
  assigned_to UUID REFERENCES auth.users(id),

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,        -- Fecha de conversión (inscripción)
  lost_at TIMESTAMPTZ,             -- Fecha de pérdida
  lost_reason TEXT,                -- Por qué se perdió
  deleted_at TIMESTAMPTZ           -- Soft delete
);

CREATE INDEX idx_leads_stage ON leads(stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_source ON leads(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created ON leads(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- INTERACTIONS (timeline de contactos)
-- ============================================
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  type TEXT NOT NULL,              -- 'whatsapp_in', 'whatsapp_out', 'call_in', 'call_out', 'visit', 'instagram_dm', 'email', 'note', 'stage_change'
  content TEXT,                    -- Resumen del contacto

  -- Para cambios de stage
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID REFERENCES pipeline_stages(id),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interactions_lead ON lead_interactions(lead_id, created_at DESC);

-- ============================================
-- FOLLOW-UPS (tareas de seguimiento)
-- ============================================
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  title TEXT NOT NULL,             -- 'Llamar para confirmar clase de prueba'
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,

  status TEXT DEFAULT 'pending',   -- 'pending', 'completed', 'skipped'
  completed_at TIMESTAMPTZ,

  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_followups_due ON follow_ups(due_date) WHERE status = 'pending';
CREATE INDEX idx_followups_lead ON follow_ups(lead_id);

-- ============================================
-- TRIAL CLASSES (clases de prueba)
-- ============================================
CREATE TABLE trial_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  course_name TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,

  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'attended', 'no_show', 'cancelled'
  feedback TEXT,                   -- Comentarios post-clase
  rating INT,                      -- 1-5 satisfacción

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MESSAGE TEMPLATES (plantillas de mensajes)
-- ============================================
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- 'Bienvenida', 'Horarios', 'Precios'
  category TEXT DEFAULT 'general', -- 'welcome', 'follow_up', 'pricing', 'schedule', 'trial', 'general'
  content TEXT NOT NULL,           -- Texto con {variables}
  variables TEXT[],                -- ['nombre', 'curso', 'fecha']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Templates iniciales
INSERT INTO message_templates (name, category, content, variables) VALUES
  ('Bienvenida', 'welcome',
   'Hola {nombre}! Gracias por tu interés en nuestro estudio de danza. ¿En qué estilo te gustaría iniciar? Tenemos: Salsa, Bachata, Ballet, y más. ¿Cuántos años tienes para ubicarte en el grupo ideal?',
   ARRAY['nombre']),
  ('Horarios', 'schedule',
   'Hola {nombre}! Estos son nuestros horarios disponibles para {curso}:\n\n{horarios}\n\n¿Cuál te queda mejor? Te podemos agendar una clase de prueba GRATIS.',
   ARRAY['nombre', 'curso', 'horarios']),
  ('Seguimiento Día 1', 'follow_up',
   'Hola {nombre}! Ayer conversamos sobre nuestras clases de {curso}. ¿Tienes alguna pregunta? Estamos con cupos limitados este mes.',
   ARRAY['nombre', 'curso']),
  ('Seguimiento Día 3', 'follow_up',
   'Hola {nombre}! Te comparto lo que dicen nuestros estudiantes de {curso} 💃 ¿Te animarías a una clase de prueba gratuita esta semana?',
   ARRAY['nombre', 'curso']),
  ('Clase de prueba', 'trial',
   'Hola {nombre}! Tu clase de prueba de {curso} está confirmada para el {fecha} a las {hora}. Trae ropa cómoda y muchas ganas de bailar! Te esperamos 🎶',
   ARRAY['nombre', 'curso', 'fecha', 'hora']);

-- ============================================
-- CONVERSION EVENTS (para futuro Meta CAPI)
-- ============================================
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),

  event_name TEXT NOT NULL,        -- 'Lead', 'InitiateContact', 'Schedule', 'CompleteRegistration', 'Purchase'
  event_data JSONB,                -- Datos custom del evento

  -- Para Meta CAPI
  sent_to_meta BOOLEAN DEFAULT false,
  meta_event_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Política simple: usuarios autenticados pueden todo
CREATE POLICY "Authenticated users full access" ON leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON lead_interactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON follow_ups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON trial_classes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON message_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON pipeline_stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON conversion_events FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 1.3 Autenticación
- Supabase Auth (email/password), mismo patrón que la app actual
- Login simple, sin roles complejos por ahora (todo usuario autenticado = admin)

### 1.4 Layout principal
- **Sidebar** izquierda con navegación: Dashboard, Leads, Seguimientos, Templates, Config
- **Header** con nombre del usuario y botón de nuevo lead
- **React Router** para navegación entre páginas (no tabs)
- Responsive: sidebar colapsable en móvil

### 1.5 Páginas MVP

#### Dashboard (página principal)
- Cards de métricas: Leads nuevos (hoy/semana/mes), Tasa de conversión, Leads por stage, Seguimientos pendientes hoy
- Gráfico simple de leads por fuente (barras)
- Lista de follow-ups vencidos y de hoy
- Últimos leads agregados

#### Leads (lista + kanban)
- Toggle entre vista **Lista** (tabla con filtros) y vista **Kanban** (drag-and-drop por stages)
- Filtros: por fuente, curso de interés, fecha, búsqueda por nombre/teléfono
- Botón "Nuevo Lead" abre modal con formulario
- Click en lead → navega a LeadDetailPage

#### Lead Detail (vista individual)
- Header: nombre, teléfono (click-to-WhatsApp), stage actual (dropdown para cambiar)
- Sección info: fuente, curso interés, notas, lead score
- **Timeline** cronológica de todas las interacciones (mensajes, llamadas, visitas, cambios de stage)
- Panel lateral: follow-ups pendientes, clase de prueba agendada
- Botón "Agregar interacción" (tipo + contenido)
- Botón "Agendar seguimiento"
- Botón "Agendar clase de prueba"
- Templates de mensajes (click → copia al clipboard → pega en WhatsApp)

#### Follow-ups (tareas de seguimiento)
- Lista de todos los follow-ups pendientes, ordenados por fecha
- Filtros: Vencidos, Hoy, Esta semana, Todos
- Marcar como completado o saltar
- Click en follow-up → navega al lead

#### Settings
- Gestión de pipeline stages (agregar, reordenar, editar colores)
- Gestión de message templates
- Configuración de cursos disponibles (para el selector en leads)

### 1.6 Funcionalidades clave MVP

#### Click-to-WhatsApp
- El número de teléfono del lead es clickeable
- Abre `https://wa.me/593XXXXXXXXX` (formato Ecuador)
- Si hay template seleccionado, agrega `?text=` con el mensaje pre-llenado

#### Templates con copy-to-clipboard
- Al ver un lead, se muestran templates relevantes
- Click en template → reemplaza {variables} con datos del lead → copia al clipboard
- El usuario pega manualmente en WhatsApp (sin API por ahora)

#### Cambio de stage con registro automático
- Al cambiar el stage de un lead (via dropdown o drag en kanban)
- Se crea automáticamente una interacción tipo 'stage_change'
- Si se mueve a "Inscrito" → se marca converted_at
- Si se mueve a "Perdido" → pide razón y marca lost_at

#### Lead scoring básico
- Score calculado automáticamente:
  - +10 por cada interacción registrada
  - +20 si tiene clase de prueba agendada
  - +30 si asistió a clase de prueba
  - +15 si fue referido
  - -5 por cada día sin interacción (después de 3 días)
  - Max 100

---

## Fase 2 (después del MVP)

- **Lead scoring avanzado** con pesos configurables
- **Bulk actions**: cambiar stage, asignar, exportar múltiples leads
- **Export Excel**: listado de leads con filtros aplicados
- **Notificaciones in-app**: badge en sidebar cuando hay follow-ups vencidos
- **Estadísticas por fuente**: ROI por canal (leads vs conversiones por fuente)
- **Secuencias automáticas**: al crear un lead, auto-crear follow-ups en Día 1, 3, 7
- **Duplicado detection**: alerta si ya existe un lead con el mismo teléfono

---

## Fase 3 (futuro)

- **WhatsApp Business API** vía proveedor (360dialog, Twilio)
- **Meta Conversions API** - enviar eventos de conversión para optimizar ads
- **Webhook para Meta Lead Ads** - leads de formularios de Facebook entran automáticamente
- **Multi-usuario** con asignación y permisos
- **Dashboard avanzado** con gráficos de tendencias, funnel visual
- **Supabase Edge Functions** para automatizaciones server-side

---

## Orden de implementación (pasos concretos)

### Paso 1: Scaffold del proyecto
- Crear proyecto Vite + React
- Instalar dependencias (supabase, date-fns, lucide-react, react-router-dom)
- Configurar Tailwind CSS 4
- Crear proyecto Supabase (nuevo, separado)
- Configurar .env con credenciales

### Paso 2: Base de datos
- Ejecutar SQL de creación de tablas en Supabase
- Verificar RLS policies
- Insertar datos seed (stages, templates)

### Paso 3: Auth + Layout
- useAuth hook
- LoginPage
- Layout con Sidebar + Header
- React Router setup (rutas protegidas)

### Paso 4: CRUD de Leads
- useLeads hook (fetch, create, update, delete, changeStage)
- LeadForm (modal para crear/editar)
- LeadsPage vista lista (tabla con filtros y búsqueda)
- LeadCard component

### Paso 5: Lead Detail + Interacciones
- LeadDetailPage con toda la info
- useInteractions hook
- InteractionTimeline component
- Formulario para agregar interacción

### Paso 6: Kanban Board
- KanbanBoard component (drag-and-drop entre stages)
- Toggle lista/kanban en LeadsPage
- Drag cambia stage + registra interacción

### Paso 7: Follow-ups
- useFollowUps hook
- FollowUpForm (crear follow-up)
- FollowUpsPage (lista con filtros por fecha)
- Integración en LeadDetailPage

### Paso 8: Message Templates
- useMessageTemplates hook
- MessageTemplate component (render + copy con variables)
- Integración en LeadDetailPage (mostrar templates relevantes)
- Click-to-WhatsApp con template pre-llenado

### Paso 9: Dashboard
- useDashboard hook (queries agregadas)
- DashboardPage con métricas, follow-ups pendientes, últimos leads
- StatsCards con números clave

### Paso 10: Settings
- SettingsPage
- CRUD pipeline stages
- CRUD message templates
- Configuración de cursos/estilos disponibles

### Paso 11: Polish + Deploy
- Responsive design (móvil)
- Loading states y error handling
- Deploy a Vercel
- Conectar dominio (opcional)
