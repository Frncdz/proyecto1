-- =============================================
-- CARTA VIRTUAL — Schema de base de datos
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLAS
-- ─────────────────────────────────────────────

CREATE TABLE restaurants (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  description   TEXT,
  address       TEXT,
  phone         TEXT,
  theme_color   TEXT DEFAULT '#D4AF37',
  is_active     BOOLEAN DEFAULT true,
  -- FUTURO: subscription_tier TEXT DEFAULT 'free'
  -- FUTURO: stripe_customer_id TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  role           TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  full_name      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  image_url      TEXT,
  order_index    INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_items (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  price          DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url      TEXT,
  is_available   BOOLEAN DEFAULT true,
  order_index    INTEGER DEFAULT 0,
  tags           TEXT[],
  -- FUTURO: video_url TEXT  (YouTube API)
  -- FUTURO: calories INTEGER
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tables (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  number         INTEGER NOT NULL,
  name           TEXT NOT NULL,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, number)
);

CREATE TABLE orders (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id       UUID REFERENCES tables(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','rejected','preparing','ready','served','closed')),
  notes          TEXT,
  total          DECIMAL(10,2) DEFAULT 0,
  -- FUTURO: payment_status TEXT DEFAULT 'unpaid'
  -- FUTURO: payment_method TEXT
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id       UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id   UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     DECIMAL(10,2) NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE waiter_calls (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id       UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'attended')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  attended_at    TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- TRIGGERS: auto updated_at
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-crear perfil cuando se registra un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE restaurants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls  ENABLE ROW LEVEL SECURITY;

-- restaurants
CREATE POLICY "restaurants_public_read" ON restaurants
  FOR SELECT USING (is_active = true);

-- Cualquier usuario autenticado puede crear un restaurante (necesario para el onboarding)
CREATE POLICY "restaurants_authenticated_insert" ON restaurants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solo el admin vinculado puede modificar o eliminar su restaurante
CREATE POLICY "restaurants_admin_modify" ON restaurants
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = restaurants.id)
  );
CREATE POLICY "restaurants_admin_delete" ON restaurants
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = restaurants.id)
  );

-- profiles
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- categories
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = categories.restaurant_id)
  );

-- menu_items
CREATE POLICY "menu_items_public_read" ON menu_items
  FOR SELECT USING (true);
CREATE POLICY "menu_items_admin_all" ON menu_items
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = menu_items.restaurant_id)
  );

-- tables
CREATE POLICY "tables_public_read" ON tables
  FOR SELECT USING (is_active = true);
CREATE POLICY "tables_admin_all" ON tables
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = tables.restaurant_id)
  );

-- orders: clientes pueden insertar, admin gestiona
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = orders.restaurant_id)
  );

-- order_items: clientes pueden insertar, admin lee
CREATE POLICY "order_items_public_insert" ON order_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_admin_read" ON order_items
  FOR SELECT USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      JOIN orders o ON o.restaurant_id = p.restaurant_id
      WHERE o.id = order_items.order_id
    )
  );

-- waiter_calls: clientes pueden insertar, admin gestiona
CREATE POLICY "waiter_calls_public_insert" ON waiter_calls
  FOR INSERT WITH CHECK (true);
CREATE POLICY "waiter_calls_admin_all" ON waiter_calls
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE restaurant_id = waiter_calls.restaurant_id)
  );

-- ─────────────────────────────────────────────
-- REALTIME
-- Habilitar en: Supabase Dashboard > Database > Replication
-- o ejecutar estas líneas:
-- ─────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;

-- ─────────────────────────────────────────────
-- MIGRATIONS v2 — Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────

-- Permite que el cliente lea sus pedidos (estado, cuenta)
CREATE POLICY "orders_public_read" ON orders
  FOR SELECT USING (true);

-- Permite que el cliente lea los items de su pedido (para ver la cuenta)
CREATE POLICY "order_items_public_read" ON order_items
  FOR SELECT USING (true);

-- Tipo de llamada: 'waiter' (llamar mozo) o 'payment' (pedir la cuenta)
ALTER TABLE waiter_calls ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'waiter'
  CHECK (type IN ('waiter', 'payment'));

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- Crear manualmente en: Dashboard > Storage > New bucket
-- Bucket 1: "menu-images"       → público  (fotos de platos)
-- Bucket 2: "restaurant-logos"  → público  (logos del local)
-- ─────────────────────────────────────────────
-- STORAGE POLICIES
-- Ejecutar después de crear los buckets
-- ─────────────────────────────────────────────

-- menu-images: lectura pública, upload/delete solo admins autenticados
CREATE POLICY "menu_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

CREATE POLICY "menu_images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-images' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "menu_images_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'menu-images' AND auth.uid() IS NOT NULL
  );

-- restaurant-logos: lectura pública, upload/delete solo admins autenticados
CREATE POLICY "restaurant_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-logos');

CREATE POLICY "restaurant_logos_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-logos' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "restaurant_logos_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'restaurant-logos' AND auth.uid() IS NOT NULL
  );

-- ─────────────────────────────────────────────
-- MIGRATIONS v3 — Sistema de sesiones de mesa
-- ─────────────────────────────────────────────

CREATE TABLE table_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id      UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_participants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID REFERENCES table_sessions(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'companion' CHECK (role IN ('owner', 'companion')),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  token         UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  order_ready   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_cart_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id     UUID REFERENCES table_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE NOT NULL,
  menu_item_id   UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  deleted        BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE table_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_cart_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "table_sessions_public_all"      ON table_sessions      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "session_participants_public_all" ON session_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "session_cart_items_public_all"  ON session_cart_items  FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE session_cart_items;

-- ─────────────────────────────────────────────
-- SEED: datos iniciales de ejemplo
-- ─────────────────────────────────────────────

INSERT INTO restaurants (name, slug, description, theme_color)
VALUES ('Mi Restaurante', 'mi-restaurante', 'Bienvenido a nuestro menú digital', '#D4AF37');
