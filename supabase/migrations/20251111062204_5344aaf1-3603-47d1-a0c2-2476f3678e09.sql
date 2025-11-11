-- Create enum types
CREATE TYPE public.app_role AS ENUM ('visitor', 'dealer', 'editor', 'admin');
CREATE TYPE public.brand_enum AS ENUM ('PEUGEOT', 'CITROËN', 'ALFA ROMEO', 'JEEP');
CREATE TYPE public.media_type_enum AS ENUM ('測試試駕', '形象廣告', '技術解說', '新車發表', '活動報導', '其他');
CREATE TYPE public.language_enum AS ENUM ('zh-TW', 'en', 'ja', 'fr');
CREATE TYPE public.region_enum AS ENUM ('TW', 'EU', 'JP', 'OTHER');
CREATE TYPE public.visibility_enum AS ENUM ('internal-only', 'dealer-visible');
CREATE TYPE public.source_enum AS ENUM ('官方頻道', '媒體頻道', '經銷產出');
CREATE TYPE public.status_enum AS ENUM ('draft', 'published');
CREATE TYPE public.aspect_ratio_enum AS ENUM ('16:9', '9:16', '1:1', 'other');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'visitor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role (returns highest privilege)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'dealer' THEN 3
      WHEN 'visitor' THEN 4
    END
  LIMIT 1
$$;

-- RLS policies for user_roles (users can see their own roles, admins can manage all)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand brand_enum NOT NULL,
  model TEXT,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT UNIQUE NOT NULL,
  channel_name TEXT,
  publish_date DATE NOT NULL,
  media_type media_type_enum NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  language language_enum DEFAULT 'zh-TW',
  region region_enum DEFAULT 'TW',
  campaign TEXT,
  rights_note TEXT,
  dealer_visibility visibility_enum NOT NULL DEFAULT 'dealer-visible',
  hero BOOLEAN DEFAULT false,
  duration_sec INTEGER CHECK (duration_sec >= 0),
  aspect_ratio aspect_ratio_enum DEFAULT '16:9',
  thumbnail_url TEXT,
  captions BOOLEAN DEFAULT false,
  source source_enum NOT NULL,
  source_account TEXT,
  source_url TEXT,
  utm_template TEXT,
  notes TEXT,
  status status_enum DEFAULT 'published',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_videos_brand ON public.videos(brand);
CREATE INDEX idx_videos_model ON public.videos(model);
CREATE INDEX idx_videos_publish_date ON public.videos(publish_date);
CREATE INDEX idx_videos_updated_at ON public.videos(updated_at);
CREATE INDEX idx_videos_youtube_video_id ON public.videos(youtube_video_id);
CREATE INDEX idx_videos_tags ON public.videos USING GIN(tags);
CREATE INDEX idx_videos_dealer_visibility ON public.videos(dealer_visibility);
CREATE INDEX idx_videos_status ON public.videos(status);

-- RLS policies for videos
-- Visitors can only see dealer-visible published videos
CREATE POLICY "Visitors can view dealer-visible videos"
  ON public.videos FOR SELECT
  USING (
    status = 'published' AND
    dealer_visibility = 'dealer-visible' AND
    (
      NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) OR
      public.has_role(auth.uid(), 'visitor')
    )
  );

-- Dealers can see dealer-visible and internal-only published videos
CREATE POLICY "Dealers can view dealer and internal videos"
  ON public.videos FOR SELECT
  USING (
    status = 'published' AND
    public.has_role(auth.uid(), 'dealer')
  );

-- Editors and admins can see all videos
CREATE POLICY "Editors and admins can view all videos"
  ON public.videos FOR SELECT
  USING (
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Only editors and admins can create videos
CREATE POLICY "Editors and admins can insert videos"
  ON public.videos FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Only editors and admins can update videos
CREATE POLICY "Editors and admins can update videos"
  ON public.videos FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Only editors and admins can delete videos
CREATE POLICY "Editors and admins can delete videos"
  ON public.videos FOR DELETE
  USING (
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Assign visitor role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'visitor');
  
  RETURN new;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data (4 sample videos, one per brand)
INSERT INTO public.videos (
  brand, model, title_zh, title_en, youtube_url, youtube_video_id,
  channel_name, publish_date, media_type, tags, language, region,
  source, source_account, dealer_visibility, duration_sec, aspect_ratio,
  thumbnail_url, captions, status
) VALUES
(
  'PEUGEOT', '3008', '全新 PEUGEOT 3008 動態駕駛體驗', 'All-New PEUGEOT 3008 Dynamic Driving Experience',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ',
  'PEUGEOT Taiwan', '2024-03-15', '測試試駕', 
  ARRAY['SUV', '新車', '駕駛體驗'], 'zh-TW', 'TW',
  '官方頻道', 'PEUGEOT Official', 'dealer-visible', 245, '16:9',
  'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', true, 'published'
),
(
  'CITROËN', 'C5 Aircross', 'CITROËN C5 Aircross 科技配備解說', 'CITROËN C5 Aircross Technology Features',
  'https://www.youtube.com/watch?v=9bZkp7q19f0', '9bZkp7q19f0',
  'CITROËN Taiwan', '2024-02-20', '技術解說',
  ARRAY['科技', 'SUV', 'C5'], 'zh-TW', 'TW',
  '官方頻道', 'CITROËN Official', 'dealer-visible', 180, '16:9',
  'https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg', true, 'published'
),
(
  'ALFA ROMEO', 'Tonale', 'Alfa Romeo Tonale 義式激情駕馭', 'Alfa Romeo Tonale Italian Passion',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw', 'jNQXAC9IVRw',
  'Alfa Romeo Taiwan', '2024-01-10', '形象廣告',
  ARRAY['性能', 'Tonale', '義大利'], 'zh-TW', 'TW',
  '官方頻道', 'Alfa Romeo Official', 'internal-only', 120, '16:9',
  'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg', false, 'published'
),
(
  'JEEP', 'Wrangler', 'JEEP Wrangler 越野極限挑戰', 'JEEP Wrangler Off-Road Challenge',
  'https://www.youtube.com/watch?v=y6120QOlsfU', 'y6120QOlsfU',
  'JEEP Taiwan', '2023-12-05', '活動報導',
  ARRAY['越野', 'Wrangler', '4x4'], 'zh-TW', 'TW',
  '媒體頻道', 'JEEP Media', 'dealer-visible', 300, '16:9',
  'https://i.ytimg.com/vi/y6120QOlsfU/maxresdefault.jpg', true, 'published'
);