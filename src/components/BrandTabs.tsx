import { cn } from '@/lib/utils';

const BRANDS = [
  { name: 'ALL', label: '全部品牌', color: null },
  { name: 'PEUGEOT', label: 'PEUGEOT', color: 'peugeot' },
  { name: 'CITROËN', label: 'CITROËN', color: 'citroen' },
  { name: 'ALFA ROMEO', label: 'ALFA ROMEO', color: 'alfa' },
  { name: 'JEEP', label: 'JEEP', color: 'jeep' },
];

interface BrandTabsProps {
  selected: string;
  onSelect: (brand: string) => void;
}

export default function BrandTabs({ selected, onSelect }: BrandTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {BRANDS.map((brand) => (
        <button
          key={brand.name}
          onClick={() => onSelect(brand.name)}
          className={cn(
            'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap',
            'border-2',
            selected === brand.name
              ? brand.color
                ? `bg-${brand.color} text-${brand.color}-foreground border-${brand.color}`
                : 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-card-foreground border-border hover:bg-accent'
          )}
          style={
            selected === brand.name && brand.color
              ? {
                  backgroundColor: `hsl(var(--${brand.color}))`,
                  color: `hsl(var(--${brand.color}-foreground))`,
                  borderColor: `hsl(var(--${brand.color}))`,
                }
              : undefined
          }
        >
          {brand.label}
        </button>
      ))}
    </div>
  );
}
