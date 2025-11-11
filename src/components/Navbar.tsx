import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, role, signOut } = useAuth();

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground">
          Brand Media Hub
        </Link>
        
        <div className="flex items-center gap-4">
          {user && (role === 'admin' || role === 'editor') && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Link>
            </Button>
          )}
          
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">登入</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
