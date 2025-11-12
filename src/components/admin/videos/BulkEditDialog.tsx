import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedVideoIds: string[];
}

interface BulkEditFormData {
  dealer_visibility?: string;
  tags?: string;
  campaign?: string;
}

export function BulkEditDialog({ open, onClose, onSuccess, selectedVideoIds }: BulkEditDialogProps) {
  const { toast } = useToast();
  const form = useForm<BulkEditFormData>();

  const onSubmit = async (data: BulkEditFormData) => {
    try {
      const updates: any = {};

      if (data.dealer_visibility && data.dealer_visibility !== 'no-change') {
        updates.dealer_visibility = data.dealer_visibility;
      }

      if (data.tags) {
        updates.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      if (data.campaign) {
        updates.campaign = data.campaign;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: '未選擇任何更新',
          description: '請至少選擇一個欄位進行更新',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('videos')
        .update(updates)
        .in('id', selectedVideoIds);

      if (error) throw error;

      toast({
        title: '批量更新成功',
        description: `已更新 ${selectedVideoIds.length} 個影片`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: '批量更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量編輯（{selectedVideoIds.length} 個影片）</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dealer_visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>可見度</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="不變更" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no-change">不變更</SelectItem>
                      <SelectItem value="dealer-visible">經銷商可見</SelectItem>
                      <SelectItem value="internal-only">僅內部</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>標籤（以逗號分隔，將覆蓋現有標籤）</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="標籤1, 標籤2, 標籤3" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campaign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活動（將覆蓋現有活動）</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">批量更新</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
