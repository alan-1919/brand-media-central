import { Video } from '@/pages/Index';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface VideoGridProps {
  videos: Video[];
  loading: boolean;
  sortBy: string;
  onSortChange: (sort: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onVideoClick: (video: Video) => void;
}

const getBrandColor = (brand: string) => {
  const colors: Record<string, string> = {
    'PEUGEOT': 'bg-peugeot text-peugeot-foreground',
    'CITROËN': 'bg-citroen text-citroen-foreground',
    'ALFA ROMEO': 'bg-alfa text-alfa-foreground',
    'JEEP': 'bg-jeep text-jeep-foreground',
  };
  return colors[brand] || 'bg-primary text-primary-foreground';
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoGrid({
  videos,
  loading,
  sortBy,
  onSortChange,
  page,
  pageSize,
  onPageChange,
  onVideoClick,
}: VideoGridProps) {
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = Math.ceil(videos.length / pageSize);
  const hasMore = videos.length === pageSize;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          顯示 {videos.length} 個結果
        </p>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at-desc">最新上架</SelectItem>
            <SelectItem value="publish_date-desc">發布日期新到舊</SelectItem>
            <SelectItem value="publish_date-asc">發布日期舊到新</SelectItem>
            <SelectItem value="views-desc">熱門</SelectItem>
            <SelectItem value="duration_sec-asc">片長短到長</SelectItem>
            <SelectItem value="duration_sec-desc">片長長到短</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">沒有找到符合條件的影片</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onVideoClick(video)}
                onMouseEnter={() => setHoveredVideoId(video.id)}
                onMouseLeave={() => setHoveredVideoId(null)}
              >
                <div className="relative aspect-video bg-muted">
                  {hoveredVideoId === video.id && video.youtube_video_id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&mute=1&controls=0&modestbranding=1`}
                      title={video.title_zh}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      loading="lazy"
                    />
                  ) : (
                    <img
                      src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_video_id}/maxresdefault.jpg`}
                      alt={video.title_zh}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {video.duration_sec && hoveredVideoId !== video.id && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                      {formatDuration(video.duration_sec)}
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge className={cn('shrink-0', getBrandColor(video.brand))}>
                      {video.brand}
                    </Badge>
                    {video.model && (
                      <span className="text-xs text-muted-foreground truncate">{video.model}</span>
                    )}
                  </div>
                  <h3 className="font-medium line-clamp-2 text-sm">{video.title_zh}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(video.publish_date).toLocaleDateString('zh-TW')}
                    </div>
                    {video.captions && (
                      <Badge variant="outline" className="text-xs">CC</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{video.source}</span>
                    {video.dealer_visibility === 'internal-only' && (
                      <Badge variant="outline" className="text-xs">內部</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              第 {page} 頁
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
