import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { EditableSelect } from './EditableSelect';

type Video = Database['public']['Tables']['videos']['Row'];

const parseYoutubeUrl = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const videoSchema = z.object({
  brand: z.enum(['PEUGEOT', 'CITROËN', 'ALFA ROMEO', 'JEEP']).optional(),
  model: z.string().optional(),
  title_zh: z.string().min(1, '必填'),
  title_en: z.string().optional(),
  youtube_url: z.string().url('請輸入有效的 YouTube 連結'),
  publish_date: z.string().refine((date) => {
    const d = new Date(date);
    return d >= new Date('2005-01-01') && !isNaN(d.getTime());
  }, '發布日期必須在 2005-01-01 之後'),
  media_type: z.enum(['測試試駕', '形象廣告', '技術解說', '新車發表', '活動報導', '其他']).optional(),
  dealer_visibility: z.enum(['dealer-visible', 'internal-only']),
  status: z.enum(['published', 'draft']).default('published'),
  language: z.enum(['zh-TW', 'en', 'ja', 'fr']).optional(),
  region: z.enum(['TW', 'EU', 'JP', 'OTHER']).optional(),
  source: z.enum(['官方頻道', '媒體頻道', '經銷產出']).optional(),
  channel_name: z.string().optional(),
  source_account: z.string().optional(),
  source_url: z.string().url().optional().or(z.literal('')),
  duration_sec: z.number().int().min(0).optional().or(z.literal('')),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', 'other']).optional(),
  captions: z.boolean().default(false),
  hero: z.boolean().default(false),
  tags: z.string().optional(),
  campaign: z.string().optional(),
  utm_template: z.string().optional(),
  rights_note: z.string().optional(),
  notes: z.string().optional(),
});

type VideoFormData = z.infer<typeof videoSchema>;

interface VideoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  video?: Video | null;
}

export function VideoFormDialog({ open, onClose, onSuccess, video }: VideoFormDialogProps) {
  const [duplicateVideo, setDuplicateVideo] = useState<Video | null>(null);
  const [brandOptions, setBrandOptions] = useState<string[]>(['PEUGEOT', 'CITROËN', 'ALFA ROMEO', 'JEEP']);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const { toast } = useToast();

  // Load existing options from database
  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Fetch unique models
        const { data: models } = await supabase
          .from('videos')
          .select('model')
          .not('model', 'is', null)
          .order('model');
        
        if (models) {
          const uniqueModels = [...new Set(models.map(v => v.model).filter(Boolean) as string[])];
          setModelOptions(uniqueModels.sort());
        }

        // Fetch unique channel names
        const { data: channels } = await supabase
          .from('videos')
          .select('channel_name')
          .not('channel_name', 'is', null)
          .order('channel_name');
        
        if (channels) {
          const uniqueChannels = [...new Set(channels.map(v => v.channel_name).filter(Boolean) as string[])];
          setChannelOptions(uniqueChannels.sort());
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    if (open) {
      loadOptions();
    }
  }, [open]);

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      brand: 'PEUGEOT',
      dealer_visibility: 'dealer-visible',
      status: 'published',
      language: 'zh-TW',
      region: 'TW',
      source: '官方頻道',
      aspect_ratio: '16:9',
      captions: false,
      hero: false,
    },
  });

  useEffect(() => {
    if (video) {
      form.reset({
        ...video,
        tags: video.tags?.join(', ') || '',
        source_url: video.source_url || '',
        duration_sec: video.duration_sec || '' as any,
      } as any);
    } else {
      form.reset();
    }
  }, [video, form]);

  const onSubmit = async (data: VideoFormData) => {
    try {
      const youtubeVideoId = parseYoutubeUrl(data.youtube_url);
      
      if (!youtubeVideoId) {
        toast({
          title: '無效的 YouTube 連結',
          description: '請輸入有效的 YouTube 連結',
          variant: 'destructive',
        });
        return;
      }

      // Check for duplicate youtube_video_id (only if creating new or URL changed)
      if (!video || video.youtube_url !== data.youtube_url) {
        const { data: existing, error: checkError } = await supabase
          .from('videos')
          .select('*')
          .eq('youtube_video_id', youtubeVideoId)
          .single();

        if (existing && existing.id !== video?.id) {
          setDuplicateVideo(existing);
          toast({
            title: '此影片已存在',
            description: '資料庫中已有相同的 YouTube 影片',
            variant: 'destructive',
          });
          return;
        }
      }

      const videoData = {
        ...data,
        youtube_video_id: youtubeVideoId,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        duration_sec: data.duration_sec || null,
        source_url: data.source_url || null,
      };

      if (video) {
        const { error } = await supabase
          .from('videos')
          .update(videoData as any)
          .eq('id', video.id);
        
        if (error) throw error;
        toast({ title: '更新成功' });
      } else {
        const { error } = await supabase.from('videos').insert([videoData as any]);
        if (error) throw error;
        toast({ title: '新增成功' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: video ? '更新失敗' : '新增失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video ? '編輯影片' : '新增影片'}</DialogTitle>
        </DialogHeader>

        {duplicateVideo && (
          <div className="bg-destructive/10 border border-destructive rounded p-4 mb-4">
            <p className="font-semibold">此影片已存在</p>
            <p className="text-sm mt-1">
              <Link to={`/?video=${duplicateVideo.id}`} className="underline">
                前往查看：{duplicateVideo.title_zh}
              </Link>
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>品牌 *</FormLabel>
                    <FormControl>
                      <EditableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={brandOptions}
                        onOptionsChange={setBrandOptions}
                        placeholder="選擇品牌..."
                        emptyMessage="未找到品牌"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>車型</FormLabel>
                    <FormControl>
                      <EditableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={modelOptions}
                        onOptionsChange={setModelOptions}
                        placeholder="選擇或新增車型..."
                        emptyMessage="未找到車型"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title_zh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>中文標題 *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>英文標題</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="youtube_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube 連結 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://www.youtube.com/watch?v=..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publish_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>發布日期 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="media_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>類型 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="測試試駕">測試試駕</SelectItem>
                        <SelectItem value="形象廣告">形象廣告</SelectItem>
                        <SelectItem value="技術解說">技術解說</SelectItem>
                        <SelectItem value="新車發表">新車發表</SelectItem>
                        <SelectItem value="活動報導">活動報導</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dealer_visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>可見度 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dealer-visible">經銷商可見</SelectItem>
                        <SelectItem value="internal-only">僅內部</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>狀態 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="published">已發布</SelectItem>
                        <SelectItem value="draft">草稿</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>語言</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="zh-TW">繁體中文</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>地區</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TW">台灣</SelectItem>
                        <SelectItem value="EU">歐洲</SelectItem>
                        <SelectItem value="JP">日本</SelectItem>
                        <SelectItem value="OTHER">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>來源 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="官方頻道">官方頻道</SelectItem>
                        <SelectItem value="媒體頻道">媒體頻道</SelectItem>
                        <SelectItem value="經銷產出">經銷產出</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="channel_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>頻道名稱</FormLabel>
                    <FormControl>
                      <EditableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={channelOptions}
                        onOptionsChange={setChannelOptions}
                        placeholder="選擇或新增頻道..."
                        emptyMessage="未找到頻道"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>來源帳號</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>來源網址</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>片長（秒）</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aspect_ratio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>比例</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>標籤（以逗號分隔）</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="標籤1, 標籤2, 標籤3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="campaign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>活動</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utm_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UTM 範本</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="?utm_source=..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rights_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>版權說明</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備註</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="captions"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">字幕</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hero"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">精選</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">
                {video ? '更新' : '新增'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
