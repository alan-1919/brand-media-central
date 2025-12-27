import { Video } from '@/pages/Index';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VideoDetailModalProps {
  video: Video;
  open: boolean;
  onClose: () => void;
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
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoDetailModal({ video, open, onClose }: VideoDetailModalProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '已複製',
      description: `${label} 已複製到剪貼簿`,
    });
  };

  const getUtmUrl = () => {
    // UTM template is internal metadata, not exposed to public
    return video.youtube_url;
  };

  const getIframeCode = () => {
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${video.youtube_video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={cn(getBrandColor(video.brand))}>
              {video.brand}
            </Badge>
            {video.title_zh}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* YouTube Embed */}
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${video.youtube_video_id}`}
              title={video.title_zh}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(video.youtube_url, 'YouTube 連結')}
            >
              <Copy className="h-4 w-4 mr-2" />
              複製連結
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getUtmUrl(), 'UTM 連結')}
            >
              <Copy className="h-4 w-4 mr-2" />
              複製 UTM
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getIframeCode(), 'iframe 程式碼')}
            >
              <Code className="h-4 w-4 mr-2" />
              複製 iframe
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_video_id}/maxresdefault.jpg`}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                下載縮圖
              </a>
            </Button>
          </div>

          {/* Metadata Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">品牌：</span>
              <span className="ml-2">{video.brand}</span>
            </div>
            {video.model && (
              <div>
                <span className="font-medium text-muted-foreground">車型：</span>
                <span className="ml-2">{video.model}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-muted-foreground">類型：</span>
              <span className="ml-2">{video.media_type}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">發布日期：</span>
              <span className="ml-2">{new Date(video.publish_date).toLocaleDateString('zh-TW')}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">片長：</span>
              <span className="ml-2">{formatDuration(video.duration_sec)}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">語言：</span>
              <span className="ml-2">{video.language}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">來源：</span>
              <span className="ml-2">{video.source}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">比例：</span>
              <span className="ml-2">{video.aspect_ratio}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">字幕：</span>
              <span className="ml-2">{video.captions ? '有' : '無'}</span>
            </div>
          </div>

          {/* Tags */}
          {video.tags.length > 0 && (
            <div>
              <p className="font-medium text-sm mb-2">標籤</p>
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
