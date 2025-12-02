import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Upload, Link, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AdminLayout from '@/components/admin/AdminLayout';
import { VideoTable } from '@/components/admin/videos/VideoTable';
import { VideoFormDialog } from '@/components/admin/videos/VideoFormDialog';
import { BulkEditDialog } from '@/components/admin/videos/BulkEditDialog';
import { CSVImportDialog } from '@/components/admin/videos/CSVImportDialog';
import { URLImportDialog } from '@/components/admin/videos/URLImportDialog';
import { Database } from '@/integrations/supabase/types';

type Video = Database['public']['Tables']['videos']['Row'];

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isURLImportOpen, setIsURLImportOpen] = useState(false);
  const [isRefreshingViews, setIsRefreshingViews] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, [selectedBrand, selectedStatus, searchQuery]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('videos').select('*');

      if (selectedBrand !== 'all') {
        query = query.eq('brand', selectedBrand as any);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus as any);
      }

      if (searchQuery) {
        query = query.or(`title_zh.ilike.%${searchQuery}%,title_en.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,source_account.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      toast({
        title: '載入失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: '刪除成功',
        description: '影片已刪除',
      });
      fetchVideos();
    } catch (error: any) {
      toast({
        title: '刪除失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingVideo(null);
  };

  const handleFormSuccess = () => {
    fetchVideos();
    handleFormClose();
  };

  const handleBulkEdit = () => {
    if (selectedVideos.length === 0) {
      toast({
        title: '請選擇影片',
        description: '請至少選擇一個影片進行批量編輯',
        variant: 'destructive',
      });
      return;
    }
    setIsBulkEditOpen(true);
  };

  const handleRefreshViews = async () => {
    setIsRefreshingViews(true);
    try {
      // Get all videos with youtube_video_id
      const { data: videosToUpdate, error: fetchError } = await supabase
        .from('videos')
        .select('id, youtube_video_id')
        .not('youtube_video_id', 'is', null);

      if (fetchError) throw fetchError;

      if (!videosToUpdate || videosToUpdate.length === 0) {
        toast({
          title: '沒有影片需要更新',
          description: '沒有找到任何 YouTube 影片',
        });
        setIsRefreshingViews(false);
        return;
      }

      // Batch video IDs in groups of 50 (YouTube API limit)
      const batchSize = 50;
      let updatedCount = 0;

      for (let i = 0; i < videosToUpdate.length; i += batchSize) {
        const batch = videosToUpdate.slice(i, i + batchSize);
        const videoIds = batch.map(v => v.youtube_video_id).filter(Boolean) as string[];

        if (videoIds.length === 0) continue;

        const response = await supabase.functions.invoke('fetch-youtube-metadata', {
          body: { videoIds },
        });

        if (response.error) {
          console.error('Error fetching metadata:', response.error);
          continue;
        }

        const metadataList = response.data?.videos || [];

        // Update each video's view count
        for (const metadata of metadataList) {
          if (metadata.viewCount !== null) {
            const videoRecord = batch.find(v => v.youtube_video_id === metadata.videoId);
            if (videoRecord) {
              const { error: updateError } = await supabase
                .from('videos')
                .update({ views: metadata.viewCount })
                .eq('id', videoRecord.id);

              if (!updateError) updatedCount++;
            }
          }
        }
      }

      toast({
        title: '更新完成',
        description: `已更新 ${updatedCount} 個影片的觀看次數`,
      });
      fetchVideos();
    } catch (error: any) {
      toast({
        title: '更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingViews(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">影片管理</h1>
          <div className="flex gap-2">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增影片
            </Button>
            <Button variant="outline" onClick={handleBulkEdit}>
              批量編輯
            </Button>
            <Button variant="outline" onClick={handleRefreshViews} disabled={isRefreshingViews}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingViews ? 'animate-spin' : ''}`} />
              更新觀看次數
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  匯入影片
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsCSVImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  CSV 匯入
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsURLImportOpen(true)}>
                  <Link className="h-4 w-4 mr-2" />
                  URL 匯入
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋標題、車型、來源帳號..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="text-muted-foreground mb-4">
          {loading ? '載入中...' : `共 ${videos.length} 個影片`}
        </div>

        <VideoTable
          videos={videos}
          loading={loading}
          selectedVideos={selectedVideos}
          onSelectedVideosChange={setSelectedVideos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        <VideoFormDialog
          open={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          video={editingVideo}
        />

        <BulkEditDialog
          open={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          onSuccess={() => {
            setIsBulkEditOpen(false);
            setSelectedVideos([]);
            fetchVideos();
          }}
          selectedVideoIds={selectedVideos}
        />

        <CSVImportDialog
          open={isCSVImportOpen}
          onClose={() => setIsCSVImportOpen(false)}
          onSuccess={() => {
            setIsCSVImportOpen(false);
            fetchVideos();
          }}
        />

        <URLImportDialog
          open={isURLImportOpen}
          onClose={() => setIsURLImportOpen(false)}
          onSuccess={() => {
            setIsURLImportOpen(false);
            fetchVideos();
          }}
        />
      </div>
    </AdminLayout>
  );
}
