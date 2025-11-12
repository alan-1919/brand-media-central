import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Upload } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { VideoTable } from '@/components/admin/videos/VideoTable';
import { VideoFormDialog } from '@/components/admin/videos/VideoFormDialog';
import { BulkEditDialog } from '@/components/admin/videos/BulkEditDialog';
import { CSVImportDialog } from '@/components/admin/videos/CSVImportDialog';
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
            <Button variant="outline" onClick={() => setIsCSVImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              CSV 匯入
            </Button>
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
      </div>
    </AdminLayout>
  );
}
