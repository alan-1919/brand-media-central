-- 將 videos 表的非核心欄位改為 nullable，保留核心必要欄位
ALTER TABLE public.videos 
  ALTER COLUMN brand DROP NOT NULL,
  ALTER COLUMN media_type DROP NOT NULL,
  ALTER COLUMN title_zh DROP NOT NULL,
  ALTER COLUMN publish_date DROP NOT NULL,
  ALTER COLUMN source DROP NOT NULL;

-- 設定合理的預設值
ALTER TABLE public.videos 
  ALTER COLUMN dealer_visibility SET DEFAULT 'dealer-visible'::visibility_enum,
  ALTER COLUMN status SET DEFAULT 'published'::status_enum;