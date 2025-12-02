import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface URLImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface YouTubeMetadata {
  videoId: string;
  title: string | null;
  publishDate: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
}

export function URLImportDialog({ open, onClose, onSuccess }: URLImportDialogProps) {
  const [urls, setUrls] = useState('');
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchYouTubeMetadata = async (videoIds: string[]): Promise<YouTubeMetadata[]> => {
    try {
      const response = await supabase.functions.invoke('fetch-youtube-metadata', {
        body: { videoIds },
      });

      if (response.error) {
        console.error('Error fetching YouTube metadata:', response.error);
        return videoIds.map(videoId => ({
          videoId,
          title: null,
          publishDate: null,
          channelName: null,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: null,
        }));
      }

      return response.data?.videos || [];
    } catch (error) {
      console.error('Error calling fetch-youtube-metadata:', error);
      return videoIds.map(videoId => ({
        videoId,
        title: null,
        publishDate: null,
        channelName: null,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: null,
      }));
    }
  };

  const handleImport = async () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      toast({
        title: '請輸入 URL',
        description: '請至少輸入一個 YouTube 連結',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setErrors([]);
    const newErrors: string[] = [];
    let successCount = 0;

    // Extract all video IDs and validate URLs
    const validVideos: { url: string; videoId: string }[] = [];
    for (const url of urlList) {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        newErrors.push(`無效的 YouTube 連結: ${url}`);
      } else {
        validVideos.push({ url, videoId });
      }
    }

    if (validVideos.length === 0) {
      setImporting(false);
      setErrors(newErrors);
      toast({
        title: '匯入失敗',
        description: '沒有有效的 YouTube 連結',
        variant: 'destructive',
      });
      return;
    }

    // Check for existing videos
    const videoIdsToCheck = validVideos.map(v => v.videoId);
    const { data: existingVideos } = await supabase
      .from('videos')
      .select('youtube_video_id')
      .in('youtube_video_id', videoIdsToCheck);

    const existingIds = new Set(existingVideos?.map(v => v.youtube_video_id) || []);
    const newVideos = validVideos.filter(v => !existingIds.has(v.videoId));

    // Report existing videos
    for (const video of validVideos) {
      if (existingIds.has(video.videoId)) {
        newErrors.push(`影片已存在: ${video.url}`);
      }
    }

    if (newVideos.length === 0) {
      setImporting(false);
      setErrors(newErrors);
      toast({
        title: '匯入失敗',
        description: '所有影片都已存在',
        variant: 'destructive',
      });
      return;
    }

    // Fetch metadata for new videos
    const videoIds = newVideos.map(v => v.videoId);
    const metadataList = await fetchYouTubeMetadata(videoIds);

    // Create a map for quick lookup
    const metadataMap = new Map<string, YouTubeMetadata>();
    for (const metadata of metadataList) {
      metadataMap.set(metadata.videoId, metadata);
    }

    // Insert videos with metadata
    for (const video of newVideos) {
      try {
        const metadata = metadataMap.get(video.videoId);

        const { error } = await supabase.from('videos').insert({
          youtube_url: video.url,
          youtube_video_id: video.videoId,
          title_zh: metadata?.title || null,
          publish_date: metadata?.publishDate || null,
          channel_name: metadata?.channelName || null,
          thumbnail_url: metadata?.thumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
          duration_sec: metadata?.duration || null,
          status: 'draft',
        });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        newErrors.push(`匯入失敗 (${video.url}): ${error.message}`);
      }
    }

    setImporting(false);
    setErrors(newErrors);

    if (successCount > 0) {
      toast({
        title: '匯入成功',
        description: `成功匯入 ${successCount} 個影片，已自動獲取影片資訊`,
      });
      
      if (newErrors.length === 0) {
        handleClose();
        onSuccess();
      }
    } else {
      toast({
        title: '匯入失敗',
        description: '沒有成功匯入任何影片',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setUrls('');
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>URL 匯入</DialogTitle>
          <DialogDescription>
            輸入 YouTube 影片連結，每行一個連結。系統將自動獲取影片標題、發佈日期、頻道名稱等資訊。影片將以草稿狀態匯入。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              YouTube 連結 (每行一個)
            </label>
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              rows={10}
              disabled={importing}
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">匯入時發生錯誤：</div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            匯入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
