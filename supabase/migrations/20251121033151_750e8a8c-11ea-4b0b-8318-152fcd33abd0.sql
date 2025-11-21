-- Allow youtube_url and youtube_video_id to be nullable for flexible CSV imports
ALTER TABLE public.videos 
ALTER COLUMN youtube_url DROP NOT NULL,
ALTER COLUMN youtube_video_id DROP NOT NULL;