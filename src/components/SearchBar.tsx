import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="搜尋標題、車型、標籤、來源帳號、活動..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-12 text-base"
      />
    </div>
  );
}
