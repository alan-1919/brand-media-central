import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type Video = Database['public']['Tables']['videos']['Row'];
type SortField = 'updated_at' | 'brand' | 'model' | 'publish_date';

interface VideoTableProps {
  videos: Video[];
  loading: boolean;
  selectedVideos: string[];
  onSelectedVideosChange: (ids: string[]) => void;
  onEdit: (video: Video) => void;
  onDelete: (id: string) => void;
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}

const brandColors = {
  PEUGEOT: 'hsl(var(--brand-peugeot))',
  CITROËN: 'hsl(var(--brand-citroen))',
  'ALFA ROMEO': 'hsl(var(--brand-alfa))',
  JEEP: 'hsl(var(--brand-jeep))',
};

export function VideoTable({
  videos,
  loading,
  selectedVideos,
  onSelectedVideosChange,
  onEdit,
  onDelete,
  selectedBrand,
  onBrandChange,
  selectedStatus,
  onStatusChange,
  sortField,
  sortDirection,
  onSort,
}: VideoTableProps) {
  const toggleAll = () => {
    if (selectedVideos.length === videos.length) {
      onSelectedVideosChange([]);
    } else {
      onSelectedVideosChange(videos.map(v => v.id));
    }
  };

  const toggleVideo = (id: string) => {
    if (selectedVideos.includes(id)) {
      onSelectedVideosChange(selectedVideos.filter(vid => vid !== id));
    } else {
      onSelectedVideosChange([...selectedVideos, id]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={selectedBrand} onValueChange={onBrandChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="品牌" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部品牌</SelectItem>
            <SelectItem value="PEUGEOT">PEUGEOT</SelectItem>
            <SelectItem value="CITROËN">CITROËN</SelectItem>
            <SelectItem value="ALFA ROMEO">ALFA ROMEO</SelectItem>
            <SelectItem value="JEEP">JEEP</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="published">已發布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedVideos.length === videos.length && videos.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 px-2 hover:bg-muted"
                  onClick={() => onSort('brand')}
                >
                  品牌
                  {sortField === 'brand' ? (
                    sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 px-2 hover:bg-muted"
                  onClick={() => onSort('model')}
                >
                  車型
                  {sortField === 'model' ? (
                    sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                  )}
                </Button>
              </TableHead>
              <TableHead>標題</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 px-2 hover:bg-muted"
                  onClick={() => onSort('publish_date')}
                >
                  發布日期
                  {sortField === 'publish_date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                  )}
                </Button>
              </TableHead>
              <TableHead>可見度</TableHead>
              <TableHead>來源</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 px-2 hover:bg-muted"
                  onClick={() => onSort('updated_at')}
                >
                  更新時間
                  {sortField === 'updated_at' ? (
                    sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => toggleVideo(video.id)}
                  />
                </TableCell>
                <TableCell>
                  <Badge style={{ backgroundColor: brandColors[video.brand as keyof typeof brandColors], color: 'white' }}>
                    {video.brand}
                  </Badge>
                </TableCell>
                <TableCell>{video.model || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{video.title_zh}</TableCell>
                <TableCell>{video.media_type}</TableCell>
                <TableCell>{video.publish_date}</TableCell>
                <TableCell>
                  <Badge variant={video.dealer_visibility === 'dealer-visible' ? 'default' : 'secondary'}>
                    {video.dealer_visibility === 'dealer-visible' ? '經銷商可見' : '僅內部'}
                  </Badge>
                </TableCell>
                <TableCell>{video.source_account || '-'}</TableCell>
                <TableCell>{new Date(video.updated_at).toLocaleDateString('zh-TW')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(video)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確認刪除</AlertDialogTitle>
                          <AlertDialogDescription>
                            確定要刪除「{video.title_zh}」嗎？此操作無法復原。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(video.id)}>
                            刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
