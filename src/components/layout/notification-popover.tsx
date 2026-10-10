"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Check,
  RotateCcw,
  AlertCircle,
  Inbox,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatThaiDateTime } from "@/lib/date-utils";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type NotificationItem,
} from "@/actions/notification.actions";
import { toast } from "sonner";

export function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = React.useState<boolean>(false);
  const [markingReadId, setMarkingReadId] = React.useState<string | null>(null);

  const loadNotifications = React.useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const res = await getNotificationsAction(20);
      if (res.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
        setError(null);
      } else {
        setError(res.error || "ไม่สามารถโหลดการแจ้งเตือนได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function fetchInitial() {
      try {
        const res = await getNotificationsAction(20);
        if (!ignore) {
          if (res.success) {
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
            setError(null);
          } else {
            setError(res.error || "ไม่สามารถโหลดการแจ้งเตือนได้");
          }
        }
      } catch {
        if (!ignore) {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Refresh notifications when panel opens
      loadNotifications(true);
    }
  };

  const handleMarkAsRead = async (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (item.isRead || markingReadId === item.id) return;

    setMarkingReadId(item.id);
    try {
      const res = await markNotificationAsReadAction(item.id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: res.data?.readAt ?? new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        toast.error("ไม่สามารถอัปเดตสถานะการแจ้งเตือน", {
          description: res.error,
        });
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkAsRead(item);
    }

    if (item.destinationHref) {
      setOpen(false);
      router.push(item.destinationHref);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt ?? new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
        toast.success("ทำเครื่องหมายว่าอ่านแล้วทั้งหมดเรียบร้อย");
      } else {
        toast.error("ไม่สามารถดำเนินการได้", { description: res.error });
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "SETTLEMENT":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </div>
        );
      case "PAYMENT_DUE":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Calendar className="h-3.5 w-3.5" />
          </div>
        );
      case "PAYMENT_OVERDUE":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        );
      case "SYSTEM":
      default:
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Info className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={
            unreadCount > 0
              ? `การแจ้งเตือน มีข้อความที่ยังไม่ได้อ่าน ${unreadCount} รายการ`
              : "การแจ้งเตือน ไม่มีข้อความใหม่"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              data-testid="unread-badge"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] p-0 shadow-xl border-border bg-popover rounded-2xl overflow-hidden"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">การแจ้งเตือน</span>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-medium">
                ใหม่ {unreadCount}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                disabled={markingAllRead}
                onClick={handleMarkAllAsRead}
                className="h-7 text-xs text-muted-foreground hover:text-primary gap-1 px-2 cursor-pointer"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                {markingAllRead ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                <span>อ่านทั้งหมด</span>
              </Button>
            )}
          </div>
        </div>

        {/* Panel Body */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">กำลังโหลดการแจ้งเตือน...</p>
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadNotifications()}
                className="mt-1 h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>ลองใหม่อีกครั้ง</span>
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">ไม่มีการแจ้งเตือนในขณะนี้</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                เมื่อมีรายการผ่อนร่วมใหม่หรือมีการเคลียร์ยอด ระบบจะแสดงการแจ้งเตือนที่นี่
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left relative group ${
                  item.isRead
                    ? "bg-transparent hover:bg-muted/40 opacity-75"
                    : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                {/* Unread indicator dot */}
                {!item.isRead && (
                  <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-primary" />
                )}

                {/* Type Icon */}
                <div className="pl-1.5">{getTypeIcon(item.type)}</div>

                {/* Notification Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4
                      className={`text-xs truncate ${
                        item.isRead ? "font-medium text-foreground" : "font-bold text-foreground"
                      }`}
                    >
                      {item.title}
                    </h4>
                    {item.destinationHref && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-muted-foreground/80 font-medium">
                      {formatThaiDateTime(item.createdAt)}
                    </span>

                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={markingReadId === item.id}
                        onClick={(e) => handleMarkAsRead(item, e)}
                        className="h-5 w-5 text-muted-foreground hover:text-primary rounded-full"
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                      >
                        {markingReadId === item.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>แตะรายการเพื่อดูรายละเอียด</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadNotifications()}
              className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>รีเฟรช</span>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
