-- =====================================================
-- InvenEasy - Migración inicial
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Categorías del armario
CREATE TABLE IF NOT EXISTS public.closet_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Subcategorías
CREATE TABLE IF NOT EXISTS public.closet_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.closet_categories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Elementos individuales
CREATE TABLE IF NOT EXISTS public.closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES public.closet_subcategories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  cloudinary_public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closet_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closet_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Categories
CREATE POLICY "Users manage own categories"
  ON public.closet_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Subcategories
CREATE POLICY "Users manage own subcategories"
  ON public.closet_subcategories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Items
CREATE POLICY "Users manage own items"
  ON public.closet_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Índices para rendimiento
-- =====================================================
CREATE INDEX idx_closet_categories_user ON public.closet_categories(user_id);
CREATE INDEX idx_closet_subcategories_category ON public.closet_subcategories(category_id);
CREATE INDEX idx_closet_subcategories_user ON public.closet_subcategories(user_id);
CREATE INDEX idx_closet_items_subcategory ON public.closet_items(subcategory_id);
CREATE INDEX idx_closet_items_user ON public.closet_items(user_id);
CREATE INDEX idx_closet_items_name ON public.closet_items USING gin(to_tsvector('spanish', name));

-- =====================================================
-- Trigger: crear perfil automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Función: sembrar categorías por defecto al nuevo usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.seed_default_closet(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_cat_id UUID;
BEGIN
  -- === ROPA ===
  INSERT INTO public.closet_categories (user_id, name, sort_order)
  VALUES (p_user_id, 'Ropa', 1) RETURNING id INTO v_cat_id;

  INSERT INTO public.closet_subcategories (category_id, user_id, name, sort_order) VALUES
    (v_cat_id, p_user_id, 'Pantalones', 1),
    (v_cat_id, p_user_id, 'Interiores', 2),
    (v_cat_id, p_user_id, 'Torso', 3);

  -- === ASEO ===
  INSERT INTO public.closet_categories (user_id, name, sort_order)
  VALUES (p_user_id, 'Aseo', 2) RETURNING id INTO v_cat_id;

  INSERT INTO public.closet_subcategories (category_id, user_id, name, sort_order) VALUES
    (v_cat_id, p_user_id, 'Pies', 1),
    (v_cat_id, p_user_id, 'Boca', 2),
    (v_cat_id, p_user_id, 'Cuerpo', 3),
    (v_cat_id, p_user_id, 'Cabello', 4),
    (v_cat_id, p_user_id, 'Cara', 5);

  -- === CALZADO ===
  INSERT INTO public.closet_categories (user_id, name, sort_order)
  VALUES (p_user_id, 'Calzado', 3) RETURNING id INTO v_cat_id;

  INSERT INTO public.closet_subcategories (category_id, user_id, name, sort_order) VALUES
    (v_cat_id, p_user_id, 'Deportivos', 1),
    (v_cat_id, p_user_id, 'Formales', 2),
    (v_cat_id, p_user_id, 'Descanso', 3),
    (v_cat_id, p_user_id, 'Medias', 4);

  -- === ACCESORIOS ===
  INSERT INTO public.closet_categories (user_id, name, sort_order)
  VALUES (p_user_id, 'Accesorios', 4) RETURNING id INTO v_cat_id;

  INSERT INTO public.closet_subcategories (category_id, user_id, name, sort_order) VALUES
    (v_cat_id, p_user_id, 'Estilo personal', 1),
    (v_cat_id, p_user_id, 'Cabeza', 2),
    (v_cat_id, p_user_id, 'Ojo y cara', 3),
    (v_cat_id, p_user_id, 'Tecnología', 4),
    (v_cat_id, p_user_id, 'Bolsillo', 5),
    (v_cat_id, p_user_id, 'Funcionales', 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger: sembrar armario al crear perfil
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_default_closet(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();
