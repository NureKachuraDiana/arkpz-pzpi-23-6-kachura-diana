import type { Notification } from "./NotificationsDropdown"

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "campaign_request",
    sender: "Anna",
    message: "Anna has applied to create an ad for your campaign",
    time: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
    read: false,
    category: "inbox",
    campaignId: "campaign-123",
  },
  {
    id: "2",
    type: "file_attachment",
    sender: "Jason",
    message: "Jason attached the file",
    time: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    read: false,
    category: "inbox",
    fileUrl: "work-examples.com",
    fileName: "work-examples.com",
  },
  {
    id: "3",
    type: "post",
    sender: "Sarah Johnson",
    message: "New post",
    time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
    category: "inbox",
  },
  {
    id: "4",
    type: "comment",
    sender: "Mike Chen",
    message: "New comment",
    time: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
    category: "general",
  },
  {
    id: "5",
    type: "campaign_request",
    sender: "Emma Wilson",
    message: "Emma has applied to create an ad for your campaign",
    time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    category: "general",
    campaignId: "campaign-456",
  },
  {
    id: "6",
    type: "post",
    sender: "David Brown",
    message: "New post",
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    category: "inbox",
  },
]

