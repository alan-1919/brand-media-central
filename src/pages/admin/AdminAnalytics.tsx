import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">影片分析</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              分析報表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">影片分析功能開發中...</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
