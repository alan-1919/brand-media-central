import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CSVImportDialog({ open, onClose, onSuccess }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      'brand', 'title_zh', 'title_en', 'youtube_url', 'publish_date', 
      'dealer_visibility', 'model', 'media_type', 'language', 'region',
      'tags', 'campaign', 'rights_note', 'source', 'source_account',
      'source_url', 'utm_template', 'notes', 'captions', 'aspect_ratio',
      'duration_sec', 'hero', 'status', 'channel_name'
    ];
    
    const exampleRow = [
      'PEUGEOT', '2024 全新 PEUGEOT 3008 試駕體驗', '2024 New PEUGEOT 3008 Test Drive',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2024-01-15',
      'dealer-visible', '3008', '測試試駕', 'zh-TW', 'TW',
      '試駕,SUV,PEUGEOT', '2024新春促銷', '版權所有', '官方頻道', 'PEUGEOT Taiwan',
      'https://www.youtube.com/c/PEUGEOTTaiwan', 'utm_source=website&utm_medium=video',
      '精彩試駕影片', 'true', '16:9', '180', 'false', 'published', 'PEUGEOT Taiwan'
    ];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'video_import_template.csv';
    link.click();
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    return rows.map((row, index) => {
      const values = row.split(',').map(v => v.trim());
      const obj: any = { _rowNumber: index + 2 };

      headers.forEach((header, i) => {
        const value = values[i] || '';
        
        if (header === 'tags') {
          obj[header] = value ? value.split(';').map(t => t.trim()) : [];
        } else if (header === 'captions' || header === 'hero') {
          obj[header] = value.toLowerCase() === 'true';
        } else if (header === 'duration_sec') {
          obj[header] = value ? parseInt(value) : null;
        } else {
          obj[header] = value || null;
        }
      });

      return obj;
    });
  };

  const validateRow = (row: any): string[] => {
    const errors: string[] = [];
    const rowNum = row._rowNumber;

    // 只驗證有提供值時的格式，不強制必填
    if (row.brand && !['PEUGEOT', 'CITROËN', 'ALFA ROMEO', 'JEEP'].includes(row.brand)) {
      errors.push(`第 ${rowNum} 列：品牌必須是 PEUGEOT、CITROËN、ALFA ROMEO 或 JEEP 其中之一`);
    }

    // 嘗試從 youtube_url 提取 video_id，但不強制格式
    if (row.youtube_url) {
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;
      const match = row.youtube_url.match(youtubeRegex);
      if (match) {
        row.youtube_video_id = match[1];
      }
    }

    // 只在有提供日期時驗證格式
    if (row.publish_date) {
      const date = new Date(row.publish_date);
      if (isNaN(date.getTime())) {
        errors.push(`第 ${rowNum} 列：發布日期格式不正確`);
      }
    }

    // 只在有提供值時驗證枚舉欄位
    if (row.dealer_visibility && !['internal-only', 'dealer-visible'].includes(row.dealer_visibility)) {
      errors.push(`第 ${rowNum} 列：經銷商可見性必須是 internal-only 或 dealer-visible`);
    }

    if (row.media_type && !['測試試駕', '形象廣告', '技術解說', '新車發表', '活動報導', '其他'].includes(row.media_type)) {
      errors.push(`第 ${rowNum} 列：媒體類型值不正確`);
    }

    if (row.source && !['官方頻道', '媒體頻道', '經銷產出'].includes(row.source)) {
      errors.push(`第 ${rowNum} 列：來源必須是官方頻道、媒體頻道或經銷產出`);
    }

    if (row.language && !['zh-TW', 'en', 'ja', 'fr'].includes(row.language)) {
      errors.push(`第 ${rowNum} 列：語言必須是 zh-TW、en、ja 或 fr`);
    }

    if (row.region && !['TW', 'EU', 'JP', 'OTHER'].includes(row.region)) {
      errors.push(`第 ${rowNum} 列：地區必須是 TW、EU、JP 或 OTHER`);
    }

    if (row.aspect_ratio && !['16:9', '9:16', '1:1', 'other'].includes(row.aspect_ratio)) {
      errors.push(`第 ${rowNum} 列：比例必須是 16:9、9:16、1:1 或 other`);
    }

    if (row.status && !['draft', 'published'].includes(row.status)) {
      errors.push(`第 ${rowNum} 列：狀態必須是 draft 或 published`);
    }

    return errors;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: '請選擇檔案',
        description: '請選擇要匯入的 CSV 檔案',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV 檔案為空或格式不正確');
      }

      // Validate all rows
      const allErrors: string[] = [];
      rows.forEach(row => {
        const rowErrors = validateRow(row);
        allErrors.push(...rowErrors);
      });

      if (allErrors.length > 0) {
        setErrors(allErrors);
        setImporting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare data for insertion
      const videosToInsert = rows.map(row => {
        const { _rowNumber, ...videoData } = row;
        return {
          ...videoData,
          created_by: user?.id,
          updated_by: user?.id,
          thumbnail_url: row.thumbnail_url || (row.youtube_video_id ? `https://img.youtube.com/vi/${row.youtube_video_id}/maxresdefault.jpg` : null),
          status: row.status || 'published',
          dealer_visibility: row.dealer_visibility || 'dealer-visible'
        };
      });

      // Insert videos
      const { data, error } = await supabase
        .from('videos')
        .insert(videosToInsert)
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error('部分影片的 YouTube ID 已存在，請檢查是否重複');
        }
        throw error;
      }

      toast({
        title: '匯入成功',
        description: `成功匯入 ${data?.length || 0} 筆影片資料`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: '匯入失敗',
        description: error.message,
        variant: 'destructive',
      });
      setErrors([error.message]);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV 批量匯入影片</DialogTitle>
          <DialogDescription>
            請下載 CSV 範本填寫資料後上傳。您可以只填寫需要的欄位，系統會自動處理缺失的資訊。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            下載 CSV 範本
          </Button>

          <div className="space-y-2">
            <label className="text-sm font-medium">上傳 CSV 檔案</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">發現以下錯誤：</div>
                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                  {errors.map((error, i) => (
                    <li key={i} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-md text-sm space-y-2">
            <div className="font-semibold">匯入說明：</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>品牌：PEUGEOT、CITROËN、ALFA ROMEO、JEEP</li>
              <li>YouTube 連結：支援 youtube.com 和 youtu.be 格式</li>
              <li>發布日期：YYYY-MM-DD 格式（例：2024-01-15）</li>
              <li>經銷商可見性：internal-only 或 dealer-visible</li>
              <li>標籤：多個標籤用分號(;)分隔</li>
              <li>布林值欄位（captions, hero）：填 true 或 false</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? '匯入中...' : '開始匯入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
