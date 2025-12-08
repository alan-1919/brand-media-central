import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const brandColors: Record<string, string> = {
  'PEUGEOT': 'bg-[#1C2D5A]',
  'CITROËN': 'bg-[#E3000B]',
  'ALFA ROMEO': 'bg-[#0B4D3A]',
  'JEEP': 'bg-[#3D3A2F]',
};

export default function AdminAnalytics() {
  const { data: topVideos, isLoading } = useQuery({
    queryKey: ['top-videos-by-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title_zh, title_en, brand, model, views, channel_name, publish_date')
        .order('views', { ascending: false, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">影片分析</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              觀看次數排行榜 (Top 10)
            </CardTitle>
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
