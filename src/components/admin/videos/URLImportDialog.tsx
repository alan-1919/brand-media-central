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
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
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

    for (const url of urlList) {
      try {
        const videoId = extractYouTubeVideoId(url);
        
        if (!videoId) {
          newErrors.push(`無效的 YouTube 連結: ${url}`);
          continue;
        }

        // Check if video already exists
        const { data: existing } = await supabase
          .from('videos')
          .select('id')
          .eq('youtube_video_id', videoId)
          .single();

        if (existing) {
          newErrors.push(`影片已存在: ${url}`);
          continue;
        }

        // Insert video with minimal data
        const { error } = await supabase.from('videos').insert({
          youtube_url: url,
          youtube_video_id: videoId,
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          status: 'draft',
        });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        newErrors.push(`匯入失敗 (${url}): ${error.message}`);
      }
    }

    setImporting(false);
    setErrors(newErrors);

    if (successCount > 0) {
      toast({
        title: '匯入成功',
        description: `成功匯入 ${successCount} 個影片`,
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
            輸入 YouTube 影片連結，每行一個連結。影片將以草稿狀態匯入，請之後補充完整資訊。
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
