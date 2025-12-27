import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BrandTabs from '@/components/BrandTabs';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import VideoGrid from '@/components/VideoGrid';
import VideoDetailModal from '@/components/VideoDetailModal';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Public-safe video fields (excludes sensitive internal metadata)
const PUBLIC_VIDEO_COLUMNS = 'id, brand, model, title_zh, title_en, youtube_url, youtube_video_id, channel_name, publish_date, media_type, tags, language, region, thumbnail_url, duration_sec, aspect_ratio, captions, source, views, updated_at, dealer_visibility, status';

export type Video = {
  id: string;
  brand: string;
  model: string | null;
  title_zh: string;
  title_en: string | null;
  youtube_url: string;
  youtube_video_id: string;
  channel_name: string | null;
  publish_date: string;
  media_type: string;
  tags: string[];
  language: string;
  region: string;
  dealer_visibility: string;
  duration_sec: number | null;
  aspect_ratio: string;
  thumbnail_url: string | null;
  captions: boolean;
  source: string;
  views: number;
  updated_at: string;
  status?: string;
};

export default function Index() {
  const { role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    mediaType: searchParams.get('mediaType') || 'all',
    year: searchParams.get('year') || 'all',
    source: searchParams.get('source') || 'all',
    captions: searchParams.get('captions') || 'all',
    aspectRatio: searchParams.get('aspectRatio') || 'all',
    channel: searchParams.get('channel') || 'all',
  });
  
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'updated_at');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const pageSize = 24;

  useEffect(() => {
    if (!authLoading) {
      fetchVideos();
      fetchChannels();
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchVideos();
    }
  }, [selectedBrand, searchQuery, filters, sortBy, page, role]);

  useEffect(() => {
    // Update URL params
    const params: Record<string, string> = {};
    if (selectedBrand !== 'ALL') params.brand = selectedBrand;
    if (searchQuery) params.search = searchQuery;
    if (filters.mediaType && filters.mediaType !== 'all') params.mediaType = filters.mediaType;
    if (filters.year && filters.year !== 'all') params.year = filters.year;
    if (filters.source && filters.source !== 'all') params.source = filters.source;
    if (filters.captions && filters.captions !== 'all') params.captions = filters.captions;
    if (filters.aspectRatio && filters.aspectRatio !== 'all') params.aspectRatio = filters.aspectRatio;
    if (filters.channel && filters.channel !== 'all') params.channel = filters.channel;
    if (sortBy !== 'updated_at') params.sort = sortBy;
    if (page !== 1) params.page = page.toString();
    
    setSearchParams(params);
  }, [selectedBrand, searchQuery, filters, sortBy, page]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('channel_name')
        .not('channel_name', 'is', null);

      if (error) throw error;

      const uniqueChannels = [...new Set(data?.map(v => v.channel_name).filter(Boolean) as string[])].sort();
      setChannels(uniqueChannels);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('videos')
        .select(PUBLIC_VIDEO_COLUMNS, { count: 'exact' });

      // Apply brand filter
      if (selectedBrand !== 'ALL') {
        query = query.eq('brand', selectedBrand as any);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`title_zh.ilike.%${searchQuery}%,title_en.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,tags.cs.{${searchQuery}},source_account.ilike.%${searchQuery}%,campaign.ilike.%${searchQuery}%`);
      }

      // Apply filters
      if (filters.mediaType && filters.mediaType !== 'all') {
        query = query.eq('media_type', filters.mediaType as any);
      }
      if (filters.year && filters.year !== 'all') {
        query = query.gte('publish_date', `${filters.year}-01-01`).lte('publish_date', `${filters.year}-12-31`);
      }
      if (filters.source && filters.source !== 'all') {
        query = query.eq('source', filters.source as any);
      }
      if (filters.captions && filters.captions !== 'all') {
        query = query.eq('captions', filters.captions === 'yes');
      }
      if (filters.aspectRatio && filters.aspectRatio !== 'all') {
        query = query.eq('aspect_ratio', filters.aspectRatio as any);
      }
      if (filters.channel && filters.channel !== 'all') {
        query = query.eq('channel_name', filters.channel);
      }

      // Apply sorting
      const [sortField, sortOrder] = sortBy.split('-');
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: '載入失敗',
        description: '無法載入影片資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BrandTabs selected={selectedBrand} onSelect={setSelectedBrand} />
        
        <div className="space-y-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <FilterBar filters={filters} channels={channels} onChange={setFilters} />
        </div>

        <VideoGrid
          videos={videos}
          loading={loading}
          sortBy={sortBy}
          onSortChange={setSortBy}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onVideoClick={setSelectedVideo}
        />
      </main>

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          open={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
