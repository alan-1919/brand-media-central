import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const brandColors: Record<string, string> = {
  'PEUGEOT': 'bg-[#1C2D5A]',
  'CITROËN': 'bg-[#E3000B]',
  'ALFA ROMEO': 'bg-[#0B4D3A]',
  'JEEP': 'bg-[#3D3A2F]',
};

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: topVideos, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['top-videos-by-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title_zh, title_en, brand, model, views, channel_name, publish_date, youtube_video_id')
        .order('views', { ascending: false, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      setLastUpdated(new Date());
      return data;
    },
    refetchInterval: 3600000, // Auto-refresh every hour (3600000ms)
  });

  const handleRefreshViews = async () => {
    if (!topVideos || topVideos.length === 0) return;
    
    setIsRefreshing(true);
    try {
      const videoIds = topVideos
        .filter(v => v.youtube_video_id)
        .map(v => v.youtube_video_id);

      if (videoIds.length === 0) {
        toast.error('沒有可更新的影片');
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-youtube-metadata', {
        body: { videoIds },
      });

      if (error) throw error;

      const metadata = data?.metadata || [];
      let updatedCount = 0;

      for (const video of metadata) {
        if (video.viewCount !== null) {
          const { error: updateError } = await supabase
            .from('videos')
            .update({ views: video.viewCount })
            .eq('youtube_video_id', video.videoId);

          if (!updateError) updatedCount++;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['top-videos-by-views'] });
      toast.success(`已更新 ${updatedCount} 部影片的觀看次數`);
    } catch (error) {
      console.error('Error refreshing views:', error);
      toast.error('更新觀看次數失敗');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">影片分析</h1>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  觀看次數排行榜 (Top 10)
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {lastUpdated 
                    ? `最後更新：${format(lastUpdated, 'yyyy/MM/dd HH:mm:ss')}（每小時自動更新）`
                    : '載入中...'}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshViews}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '更新中...' : '更新觀看次數'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">載入中...</p>
            ) : topVideos && topVideos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>品牌</TableHead>
                    <TableHead>車型</TableHead>
                    <TableHead>影片標題</TableHead>
                    <TableHead>頻道</TableHead>
                    <TableHead className="text-right">觀看次數</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVideos.map((video, index) => (
                    <TableRow key={video.id}>
                      <TableCell className="font-bold text-lg">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {video.brand && (
                          <Badge className={`${brandColors[video.brand] || 'bg-muted'} text-white`}>
                            {video.brand}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {video.model || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {video.title_zh || video.title_en || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {video.channel_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {video.views?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">暫無影片資料</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
