
export const DEFAULT_CATEGORIES = [
  'Mẹo vặt',
  'Học thông minh',
  'Kỹ năng & Tư duy',
  'Truyền cảm hứng',
  'Công nghệ & Mẹo số'
];

export interface Post {
  id: string;
  author: string;
  authorAvatar: string;
  authorEmail?: string;
  authorUid: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  timestamp: string;
  imageUrl?: string;
  reportedBy?: string[];
  sharedBy?: string[];
  likedBy?: string[];
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  authorAvatar: string;
  authorUid: string;
  content: string;
  parentId?: string; // ID của bình luận cha nếu là phản hồi
  replyToName?: string; // Tên người được tag
  createdAt: any;
  timestamp?: string;
}

export interface AppNotification {
  id: string;
  toUid: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  type: 'like' | 'comment' | 'reply' | 'system';
  postId: string;
  read: boolean;
  content?: string;
  createdAt: any;
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  points: number;
}

export interface UserProfileData extends LeaderboardUser {
  email?: string;
  bio?: string;
  createdAt?: any;
}
