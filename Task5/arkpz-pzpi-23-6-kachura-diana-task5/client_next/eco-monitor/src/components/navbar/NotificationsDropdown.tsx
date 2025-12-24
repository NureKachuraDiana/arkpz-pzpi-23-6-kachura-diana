"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface Notification {
  id: string
  type: "post" | "comment" | "campaign_request" | "file_attachment"
  sender: string
  senderAvatar?: string
  message: string
  time: Date
  read: boolean
  category: "inbox" | "general"
  fileUrl?: string
  fileName?: string
  campaignId?: string
}

interface NotificationsDropdownProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onAcceptRequest?: (id: string) => void
  onDeclineRequest?: (id: string) => void
  className?: string
}

export function NotificationsDropdown({
  notifications,
  onMarkAsRead,
  onAcceptRequest,
  onDeclineRequest,
  className,
}: NotificationsDropdownProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  const inboxNotifications = notifications.filter(
    (n) => n.category === "inbox"
  )
  const generalNotifications = notifications.filter(
    (n) => n.category === "general"
  )

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
  }

  const renderNotification = (notification: Notification) => {
    const timeAgo = formatDistanceToNow(notification.time, { addSuffix: true })

    return (
      <div
        key={notification.id}
        className={cn(
          "cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent",
          !notification.read && "bg-accent/50"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.senderAvatar} />
            <AvatarFallback>
              {notification.sender
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{notification.sender}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
            <p className="text-sm text-foreground">{notification.message}</p>

            {notification.type === "campaign_request" && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeclineRequest?.(notification.id)
                  }}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-7 bg-green-600 text-xs hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAcceptRequest?.(notification.id)
                  }}
                >
                  Accept
                </Button>
              </div>
            )}

            {notification.type === "file_attachment" && notification.fileUrl && (
              <a
                href={notification.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-xs text-green-600 hover:underline dark:text-green-400"
                onClick={(e) => e.stopPropagation()}
              >
                {notification.fileName || notification.fileUrl}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "w-80 rounded-lg border bg-popover shadow-lg dark:bg-zinc-900",
        className
      )}
    >
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} New
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent">
          <TabsTrigger
            value="inbox"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Inbox
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="m-0">
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {inboxNotifications.length > 0 ? (
                inboxNotifications.map(renderNotification)
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications in inbox
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="general" className="m-0">
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {generalNotifications.length > 0 ? (
                generalNotifications.map(renderNotification)
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No general notifications
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

