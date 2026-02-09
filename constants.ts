
import { Post } from './types';

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    author: 'Minh Anh',
    authorAvatar: 'https://picsum.photos/id/64/100/100',
    // Added missing authorUid property to satisfy Post interface
    authorUid: 'initial-user-1',
    title: 'Cách học 50 từ vựng mỗi ngày không áp lực',
    content: 'Thay vì cố nhồi nhét, mình chia nhỏ ra 5 khung giờ trong ngày. Mỗi lần 10 từ, gắn liền với các đồ vật trong nhà. Thử đi, hiệu quả cực!',
    category: 'Học thông minh',
    likes: 124,
    comments: 12,
    timestamp: '2 giờ trước',
    imageUrl: 'https://picsum.photos/id/24/800/400',
    // Added missing createdAt property to satisfy Post interface
    createdAt: { seconds: 1710000000 }
  },
  {
    id: '2',
    author: 'Thầy Giáo Vui Tính',
    authorAvatar: 'https://picsum.photos/id/91/100/100',
    // Added missing authorUid property to satisfy Post interface
    authorUid: 'initial-user-2',
    title: 'Đừng sợ thất bại, hãy sợ đứng yên một chỗ',
    content: 'Hôm nay điểm kém không có nghĩa là bạn dốt. Nó chỉ có nghĩa là cách học hiện tại chưa phù hợp. Đổi chiến thuật thôi!',
    category: 'Kỹ năng & Tư duy',
    likes: 567,
    comments: 45,
    timestamp: '5 giờ trước',
    // Added missing createdAt property to satisfy Post interface
    createdAt: { seconds: 1710000000 }
  },
  {
    id: '3',
    author: 'Lan Vy',
    authorAvatar: 'https://picsum.photos/id/43/100/100',
    // Added missing authorUid property to satisfy Post interface
    authorUid: 'initial-user-3',
    title: 'Mẹo giữ bàn học luôn gọn gàng trong 5 phút',
    content: 'Quy tắc 2 phút: Nếu việc gì mất dưới 2 phút để dọn (như cất bút, gấp sách), hãy làm ngay lập tức. Đừng đợi đến cuối tuần.',
    category: 'Mẹo vặt',
    likes: 89,
    comments: 5,
    timestamp: '8 giờ trước',
    imageUrl: 'https://picsum.photos/id/48/800/400',
    // Added missing createdAt property to satisfy Post interface
    createdAt: { seconds: 1710000000 }
  },
  {
    id: '4',
    author: 'Tech Gen Z',
    authorAvatar: 'https://picsum.photos/id/101/100/100',
    // Added missing authorUid property to satisfy Post interface
    authorUid: 'initial-user-4',
    title: 'Dùng Notion để quản lý deadline hiệu quả',
    content: 'Nhiều bạn cứ dùng sổ tay, nhưng Notion cho phép set reminder cực hay. Đây là template mình tự thiết kế cho kỳ thi THPT nè.',
    category: 'Công nghệ & Mẹo số',
    likes: 231,
    comments: 28,
    timestamp: '1 ngày trước',
    // Added missing createdAt property to satisfy Post interface
    createdAt: { seconds: 1710000000 }
  }
];
