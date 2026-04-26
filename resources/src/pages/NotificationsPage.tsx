import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell,
  Calendar,
  Stethoscope,
  AlertCircle,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PaginatedResponse } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

const NOTIFICATION_ICONS = {
  appointment: Calendar,
  reminder: Bell,
  system: AlertCircle,
  medical: Stethoscope,
} as const;

function normalizeNotification(notification: Notification): Notification {
  return {
    ...notification,
    read: notification.read ?? notification.isRead ?? false,
  };
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api.getNotifications();
      const list = Array.isArray(data) ? data : (data as PaginatedResponse<Notification>).data;
      setNotifications(list.map(normalizeNotification));
    } catch (error) {
       console.error('Failed to load notifications:', error);
    } finally {
       setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadNotifications();
    }
  }, [user, loadNotifications]);

  const handleMarkAsRead = async (id: string | number) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((current) =>
        current.map((n) => (n.id.toString() === id.toString() ? { ...n, read: true, isRead: true } : n))
      );
    } catch (error) {
       console.error('Mark as read failed:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((current) => current.map((n) => ({ ...n, read: true, isRead: true })));
    } catch (error) {
       console.error('Mark all as read failed:', error);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((current) => current.filter((n) => n.id.toString() !== id.toString()));
    } catch (error) {
       console.error('Delete notification failed:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(notifications, 10);

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Loading Notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-tour="notifications-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              You're all caught up! New notifications will appear here and be stored in MySQL.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedData.map((notification) => {
            const type = notification.type as keyof typeof NOTIFICATION_ICONS;
            const Icon = NOTIFICATION_ICONS[type] || Bell;
            const createdAt = notification.createdAt;
            const date = createdAt ? parseISO(createdAt) : new Date();

            return (
              <Card 
                key={notification.id}
                className={cn(
                  'transition-colors',
                  !notification.read && 'border-primary/50 bg-primary/5'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      notification.type === 'appointment' && 'bg-blue-100 text-blue-600',
                      notification.type === 'reminder' && 'bg-yellow-100 text-yellow-600',
                      notification.type === 'system' && 'bg-purple-100 text-purple-600',
                      notification.type === 'medical' && 'bg-green-100 text-green-600',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Just now'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {notifications.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onNext={nextPage}
              onPrev={prevPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
