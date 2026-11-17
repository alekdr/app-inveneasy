-- =====================================================
-- InvenEasy - Migración 003: Wishlist (Lista de Deseos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  estimated_price NUMERIC(12, 2) DEFAULT 0,
  image_url TEXT,
  cloudinary_public_id TEXT,
  category TEXT DEFAULT 'General',
  link_url TEXT,
  is_purchased BOOLEAN DEFAULT false,
  purchased_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist items"
  ON public.wishlist_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_status ON public.wishlist_items(user_id, is_purchased);
