CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'visitor',
    'dealer',
    'editor',
    'admin'
);


--
-- Name: aspect_ratio_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.aspect_ratio_enum AS ENUM (
    '16:9',
    '9:16',
    '1:1',
    'other'
);


--
-- Name: brand_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.brand_enum AS ENUM (
    'PEUGEOT',
    'CITROËN',
    'ALFA ROMEO',
    'JEEP'
);


--
-- Name: language_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.language_enum AS ENUM (
    'zh-TW',
    'en',
    'ja',
    'fr'
);


--
-- Name: media_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.media_type_enum AS ENUM (
    '測試試駕',
    '形象廣告',
    '技術解說',
    '新車發表',
    '活動報導',
    '其他'
);


--
-- Name: region_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.region_enum AS ENUM (
    'TW',
    'EU',
    'JP',
    'OTHER'
);


--
-- Name: source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_enum AS ENUM (
    '官方頻道',
    '媒體頻道',
    '經銷產出'
);


--
-- Name: status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_enum AS ENUM (
    'draft',
    'published'
);


--
-- Name: visibility_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.visibility_enum AS ENUM (
    'internal-only',
    'dealer-visible'
);


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'visitor'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand public.brand_enum,
    model text,
    title_zh text,
    title_en text,
    youtube_url text,
    youtube_video_id text,
    channel_name text,
    publish_date date,
    media_type public.media_type_enum,
    tags text[] DEFAULT ARRAY[]::text[],
    language public.language_enum DEFAULT 'zh-TW'::public.language_enum,
    region public.region_enum DEFAULT 'TW'::public.region_enum,
    campaign text,
    rights_note text,
    dealer_visibility public.visibility_enum DEFAULT 'dealer-visible'::public.visibility_enum NOT NULL,
    hero boolean DEFAULT false,
    duration_sec integer,
    aspect_ratio public.aspect_ratio_enum DEFAULT '16:9'::public.aspect_ratio_enum,
    thumbnail_url text,
    captions boolean DEFAULT false,
    source public.source_enum,
    source_account text,
    source_url text,
    utm_template text,
    notes text,
    status public.status_enum DEFAULT 'published'::public.status_enum,
    views integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT videos_duration_sec_check CHECK ((duration_sec >= 0))
);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: videos videos_youtube_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_youtube_video_id_key UNIQUE (youtube_video_id);


--
-- Name: idx_videos_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_brand ON public.videos USING btree (brand);


--
-- Name: idx_videos_dealer_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_dealer_visibility ON public.videos USING btree (dealer_visibility);


--
-- Name: idx_videos_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_model ON public.videos USING btree (model);


--
-- Name: idx_videos_publish_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_publish_date ON public.videos USING btree (publish_date);


--
-- Name: idx_videos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_status ON public.videos USING btree (status);


--
-- Name: idx_videos_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_tags ON public.videos USING gin (tags);


--
-- Name: idx_videos_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_updated_at ON public.videos USING btree (updated_at);


--
-- Name: idx_videos_youtube_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_youtube_video_id ON public.videos USING btree (youtube_video_id);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: videos update_videos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: videos videos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: videos videos_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: videos Dealers can view dealer and internal videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dealers can view dealer and internal videos" ON public.videos FOR SELECT USING (((status = 'published'::public.status_enum) AND public.has_role(auth.uid(), 'dealer'::public.app_role)));


--
-- Name: videos Editors and admins can delete videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors and admins can delete videos" ON public.videos FOR DELETE USING ((public.has_role(auth.uid(), 'editor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: videos Editors and admins can insert videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors and admins can insert videos" ON public.videos FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'editor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: videos Editors and admins can update videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors and admins can update videos" ON public.videos FOR UPDATE USING ((public.has_role(auth.uid(), 'editor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: videos Editors and admins can view all videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors and admins can view all videos" ON public.videos FOR SELECT USING ((public.has_role(auth.uid(), 'editor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Profiles created only via trigger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles created only via trigger" ON public.profiles FOR INSERT WITH CHECK (false);


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: videos Visitors can view dealer-visible videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Visitors can view dealer-visible videos" ON public.videos FOR SELECT USING (((status = 'published'::public.status_enum) AND (dealer_visibility = 'dealer-visible'::public.visibility_enum) AND ((NOT (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'visitor'::public.app_role))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;