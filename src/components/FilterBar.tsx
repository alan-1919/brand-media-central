import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FilterBarProps {
  filters: {
    mediaType: string;
    year: string;
    language: string;
    source: string;
    captions: string;
    aspectRatio: string;
  };
  onChange: (filters: FilterBarProps['filters']) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2004 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">影片類型</Label>
        <Select value={filters.mediaType} onValueChange={(v) => updateFilter('mediaType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="測試試駕">測試試駕</SelectItem>
            <SelectItem value="形象廣告">形象廣告</SelectItem>
            <SelectItem value="技術解說">技術解說</SelectItem>
            <SelectItem value="新車發表">新車發表</SelectItem>
            <SelectItem value="活動報導">活動報導</SelectItem>
            <SelectItem value="其他">其他</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">年份</Label>
        <Select value={filters.year} onValueChange={(v) => updateFilter('year', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">語言</Label>
        <Select value={filters.language} onValueChange={(v) => updateFilter('language', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="zh-TW">繁體中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">來源</Label>
        <Select value={filters.source} onValueChange={(v) => updateFilter('source', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="官方頻道">官方頻道</SelectItem>
            <SelectItem value="媒體頻道">媒體頻道</SelectItem>
            <SelectItem value="經銷產出">經銷產出</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">字幕</Label>
        <Select value={filters.captions} onValueChange={(v) => updateFilter('captions', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="yes">有字幕</SelectItem>
            <SelectItem value="no">無字幕</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">比例</Label>
        <Select value={filters.aspectRatio} onValueChange={(v) => updateFilter('aspectRatio', v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
