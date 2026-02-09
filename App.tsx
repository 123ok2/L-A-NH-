
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  Home, 
  Sparkles,
  MessageCircle,
  ThumbsUp,
  X,
  LogOut,
  Trash2,
  Send,
  Trophy,
  Zap,
  Hash,
  Plus,
  Flame,
  Search,
  Wand2,
  Award,
  RefreshCw,
  CheckCircle2,
  Camera,
  Edit3,
  Check,
  User as UserIcon,
  ChevronRight,
  Bookmark,
  MoreHorizontal,
  Clock,
  TrendingUp,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { Post, Comment, DEFAULT_CATEGORIES, LeaderboardUser, UserProfileData } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  deletePost, 
  updateUserPoints, 
  toggleLikePost, 
  addComment,
  loginWithEmail,
  registerWithEmail,
  updateUserAvatar,
  updateDisplayName
} from './services/firebase';
import { generateAIPost, AIResult } from './services/geminiService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  where, 
  limit, 
  getDoc,
  getCountFromServer 
} from 'firebase/firestore';

const ADMIN_EMAIL = 'duyconghanh@luanho.vn';

const getLevelInfo = (points: number) => {
  if (points >= 1000) return { name: 'Hào Quang', color: 'from-purple-600 to-pink-500', icon: '👑' };
  if (points >= 500) return { name: 'Ngọn Lửa Xanh', color: 'from-blue-600 to-cyan-500', icon: '💎' };
  if (points >= 100) return { name: 'Ngọn Lửa Hồng', color: 'from-orange-500 to-red-500', icon: '🔥' };
  return { name: 'Đốm Lửa Nhỏ', color: 'from-slate-400 to-slate-500', icon: '🌱' };
};

// --- Component Avatar thông minh ---
const UserAvatar: React.FC<{ uid: string, name?: string, className?: string, onClick?: () => void }> = ({ uid, name, className, onClick }) => {
  const [userData, setUserData] = useState<{ photoURL: string, displayName: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    if (uid.startsWith('ai')) {
      setUserData({
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'AI')}&background=random`,
        displayName: name || 'AI Member'
      });
      return;
    }
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setUserData(snap.data() as any);
    });
  }, [uid, name]);

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || userData?.displayName || 'U')}&background=random`;
  
  return (
    <img 
      src={userData?.photoURL || fallback} 
      alt={name} 
      className={`${className} object-cover bg-slate-100 transition-all duration-300 ring-2 ring-transparent group-hover:ring-orange-200`} 
      onClick={onClick}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
    />
  );
};

// --- User Profile Modal ---
const UserProfileModal: React.FC<{ userId: string, onClose: () => void, currentUser: FirebaseUser }> = ({ userId, onClose, currentUser }) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rank, setRank] = useState<number | string>('...');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setnewName] = useState('');
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const unsubProfile = onSnapshot(doc(db, 'users', userId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfileData;
        setProfile({ uid: userId, ...data });
        setnewName(data.displayName);

        try {
          const qRank = query(collection(db, 'users'), where('points', '>', data.points));
          const snapshot = await getCountFromServer(qRank);
          setRank(snapshot.data().count + 1);
        } catch (e) {
          setRank('?');
        }
      } else if (userId.startsWith('ai')) {
        setProfile({ uid: userId, displayName: "AI Member", photoURL: "", points: 150 });
        setRank('AI');
      }
    });

    const qPosts = query(collection(db, 'posts'), where('authorUid', '==', userId), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map(d => {
        const data = d.data();
        const formattedDate = data.createdAt 
          ? new Date(data.createdAt.seconds * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ' -')
          : 'Vừa xong';
        return { id: d.id, ...data, timestamp: formattedDate } as Post;
      }));
    });

    const qComments = query(collection(db, 'comments'), where('authorUid', '==', userId), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      setLoading(false);
    });

    return () => { unsubProfile(); unsubPosts(); unsubComments(); };
  }, [userId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdating(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try { await updateUserAvatar(userId, base64String); } finally { setUpdating(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setUpdating(true);
    try { await updateDisplayName(userId, newName); setIsEditingName(false); } finally { setUpdating(false); }
  };

  if (loading && !profile) return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center">
        <RefreshCw className="animate-spin text-orange-500 mb-4" size={24} />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Đang tải...</p>
      </div>
    </div>
  );

  const level = getLevelInfo(profile?.points || 0);
  const isMe = userId === currentUser.uid;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8fafc] rounded-none sm:rounded-[2.5rem] w-full max-w-2xl h-full sm:max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500 border border-white/20">
        <div className={`h-28 sm:h-36 bg-gradient-to-br ${level.color} relative shrink-0`}>
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white z-10"><X size={14} /></button>
          <div className="absolute -bottom-10 sm:-bottom-12 left-6 sm:left-10">
            <div className="relative group">
              <UserAvatar uid={userId} name={profile?.displayName} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] border-[4px] sm:border-[6px] border-[#f8fafc] shadow-xl bg-white" />
              {isMe && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-2xl sm:rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white backdrop-blur-[1px]">
                  {updating ? <RefreshCw className="animate-spin" size={16}/> : <Camera size={18} />}
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-10 pt-12 sm:pt-16 pb-8 flex-1 overflow-y-auto scrollbar-hide">
          <div className="mb-6 flex items-end justify-between">
            <div className="space-y-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input value={newName} onChange={(e) => setnewName(e.target.value)} className="text-lg sm:text-2xl font-black text-slate-900 border-b-2 border-orange-500 outline-none w-full bg-orange-50/50 rounded-lg px-2 py-1" autoFocus />
                  <button onClick={handleSaveName} className="bg-green-500 text-white p-1.5 rounded-lg"><Check size={16}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">{profile?.displayName}</h2>
                  {isMe && <button onClick={() => setIsEditingName(true)} className="text-slate-300 hover:text-orange-500"><Edit3 size={14}/></button>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[6px] font-black text-white bg-gradient-to-r ${level.color} uppercase tracking-widest shadow-md`}>{level.name}</span>
                <span className="text-orange-600 font-black text-[8px] flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-md"><Zap size={9} fill="currentColor" /> {profile?.points || 0} pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
            <div className="bg-white p-3 sm:p-5 rounded-[1.25rem] shadow-sm border border-slate-50 flex flex-col items-center bento-card">
              <p className="text-[6px] sm:text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Bài đăng</p>
              <p className="text-sm sm:text-lg font-black text-slate-800">{posts.length}</p>
            </div>
            <div className="bg-white p-3 sm:p-5 rounded-[1.25rem] shadow-sm border border-slate-50 flex flex-col items-center bento-card">
              <p className="text-[6px] sm:text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Bình luận</p>
              <p className="text-sm sm:text-lg font-black text-slate-800">{comments.length}</p>
            </div>
            <div className="bg-white p-3 sm:p-5 rounded-[1.25rem] shadow-sm border border-slate-50 flex flex-col items-center bento-card ring-2 ring-orange-50/50">
              <p className="text-[6px] sm:text-[8px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Xếp hạng</p>
              <p className="text-sm sm:text-lg font-black text-slate-800">#{rank}</p>
            </div>
          </div>

          <div className="flex gap-6 border-b border-slate-50 mb-5 sticky top-0 bg-[#f8fafc]/95 backdrop-blur z-10 py-2">
            <button onClick={() => setActiveTab('posts')} className={`pb-2.5 text-[8px] font-black uppercase tracking-widest relative ${activeTab === 'posts' ? 'text-orange-600' : 'text-slate-400'}`}>
              Bài viết
              {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
            <button onClick={() => setActiveTab('comments')} className={`pb-2.5 text-[8px] font-black uppercase tracking-widest relative ${activeTab === 'comments' ? 'text-orange-600' : 'text-slate-400'}`}>
              Tương tác
              {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
          </div>

          <div className="space-y-2.5">
            {activeTab === 'posts' ? (
              posts.map(p => (
                <div key={p.id} className="bg-white border border-slate-50 p-3.5 rounded-xl border-l-[4px] border-l-orange-400 shadow-sm">
                  <h4 className="font-black text-slate-800 text-[12px] mb-0.5 leading-tight">{p.title}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed">{p.content}</p>
                  <p className="text-[8px] text-slate-300 font-bold mt-2 uppercase tracking-widest">{p.timestamp}</p>
                </div>
              ))
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-white p-3 rounded-lg border border-slate-50 shadow-sm flex gap-2.5">
                  <div className="bg-orange-50 text-orange-500 p-1 rounded-md h-fit"><MessageCircle size={11}/></div>
                  <p className="text-[10px] text-slate-600 font-bold italic leading-relaxed">"{c.content}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (u) {
        onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) setUserProfile(snap.data());
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (sortBy === 'latest') {
      q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'posts'), orderBy('likes', 'desc'), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(doc => {
        const data = doc.data();
        const formattedDate = data.createdAt 
          ? new Date(data.createdAt.seconds * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ' -')
          : 'Vừa xong';
        return { 
          id: doc.id, ...data, 
          timestamp: formattedDate
        } as Post;
      }));
    });
  }, [user, sortBy]);

  // Logic lấy tất cả các chủ đề hiện có trong DB (Duy nhất)
  const allCategories = useMemo(() => {
    const postCats = posts.map(p => p.category);
    const uniqueCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...postCats]));
    return uniqueCats.filter(c => c !== 'ADMIN_AI');
  }, [posts]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
      setLeaderboardUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as LeaderboardUser)));
    });
  }, []);

  const filteredPosts = useMemo(() => {
    let result = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.content.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, activeCategory, searchQuery]);

  if (authLoading) return (
    <div className="h-screen flex items-center justify-center bg-white flex-col gap-5">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Đang thắp lửa tri thức...</p>
    </div>
  );
  
  if (!user) return <AuthScreen />;

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 pb-20 xl:pb-0">
        {/* Desktop Sidebar */}
        <aside className="hidden xl:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-100 bg-white/80 backdrop-blur-2xl p-8">
          <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => {setActiveCategory('All'); setSearchQuery('');}}>
            <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-orange-100"><Sparkles size={20}/></div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">Lửa Nhỏ</h1>
          </div>
          
          <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide pr-2">
            <button onClick={() => {setActiveCategory('All'); setSearchQuery('');}} className={`flex items-center gap-4 w-full px-5 py-3 rounded-xl font-black text-[12px] transition-all ${activeCategory === 'All' && !searchQuery ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Home size={18}/> <span>Dòng thời gian</span>
            </button>
            <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl font-black text-[12px] text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all">
              <Trophy size={18}/> <span>Bảng vàng</span>
            </button>

            <div className="pt-8 pb-3 px-5 text-[9px] font-black text-slate-300 uppercase tracking-widest">Khám phá chủ đề</div>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => {setActiveCategory(cat); setSearchQuery('');}} className={`flex items-center gap-4 w-full px-5 py-3 rounded-xl text-[11px] font-bold transition-all ${activeCategory === cat ? 'bg-orange-50 text-orange-600 border-r-[4px] border-orange-500' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}>
                <Hash size={16} className={activeCategory === cat ? 'text-orange-500' : 'text-slate-100'}/> <span className="truncate">{cat}</span>
              </button>
            ))}

            {isAdmin && (
              <div className="pt-8">
                 <button onClick={() => setActiveCategory('ADMIN_AI')} className={`flex items-center gap-4 w-full px-5 py-3 rounded-xl font-black text-[11px] transition-all ${activeCategory === 'ADMIN_AI' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                    <Wand2 size={18}/> <span>AI Lab Hub</span>
                 </button>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-5 border-t border-slate-50">
             <div onClick={() => setSelectedProfileId(user.uid)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100 shadow-sm">
                <UserAvatar uid={user.uid} className="w-9 h-9 rounded-lg shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{userProfile?.displayName || user.displayName}</p>
                  <p className="text-[8px] font-black text-orange-500 uppercase flex items-center gap-1"><Zap size={10} fill="currentColor"/> {userProfile?.points || 0} pts</p>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          {/* Header Block */}
          <div className="sticky top-0 z-[60] bg-white border-b border-slate-50">
            <header className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex xl:hidden items-center gap-2" onClick={() => {setActiveCategory('All'); setSearchQuery('');}}>
                <div className="bg-orange-500 p-1.5 rounded-lg text-white shadow-md shadow-orange-100"><Sparkles size={14}/></div>
                <h1 className="text-[15px] font-black tracking-tighter leading-none">Lửa Nhỏ</h1>
              </div>

              <div className="hidden md:flex items-center bg-slate-50 border border-slate-100/30 rounded-xl px-5 py-2 w-full max-sm:max-w-none max-w-sm gap-3 shadow-inner">
                <Search size={16} className={searchQuery ? 'text-orange-500' : 'text-slate-300'}/>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm nội dung..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[12px] font-bold outline-none w-full text-slate-600" 
                />
              </div>

              <div className="flex items-center gap-2.5">
                 <button onClick={logout} className="text-slate-200 hover:text-red-500 p-2 rounded-lg transition-all"><LogOut size={16}/></button>
                 <button onClick={() => setSelectedProfileId(user.uid)} className="xl:hidden">
                    <UserAvatar uid={user.uid} className="w-7 h-7 rounded-lg border border-white shadow-sm" />
                 </button>
              </div>
            </header>

            {/* Category Mobile Bar - Tự động cập nhật */}
            <div className="xl:hidden bg-white py-2 overflow-x-auto scrollbar-hide px-4 flex gap-2 border-t border-slate-50/50">
              <button onClick={() => {setActiveCategory('All'); setSearchQuery('');}} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeCategory === 'All' && !searchQuery ? 'bg-[#0f172a] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>Tất cả</button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => {setActiveCategory(cat); setSearchQuery('');}} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{cat}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
            <div className="p-3 sm:p-10 max-w-3xl mx-auto w-full">
              {activeCategory === 'ADMIN_AI' ? <AdminAILab user={user} /> : (
                <>
                  <div className="hidden sm:block">
                     <CreatePostBox user={user} />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-5 px-1 sm:px-2">
                    <div className="flex items-center gap-2">
                       <h2 className="text-[14px] sm:text-[18px] font-black tracking-tight text-slate-800 leading-none capitalize">
                         {searchQuery ? `Kết quả: "${searchQuery}"` : (activeCategory === 'All' ? 'Xu hướng' : activeCategory)}
                       </h2>
                       <div className="h-0.5 w-4 sm:w-8 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-8">
                    {filteredPosts.map(p => <PostCard key={p.id} post={p} currentUser={user} onOpenProfile={setSelectedProfileId} />)}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-3 flex justify-between items-center z-[70] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button onClick={() => { setActiveCategory('All'); setSearchQuery(''); window.scrollTo({top:0, behavior:'smooth'}); }} className={`flex flex-col items-center gap-1 ${activeCategory === 'All' && !searchQuery ? 'text-orange-600' : 'text-slate-300'}`}>
            <Home size={22}/>
            <span className="text-[7px] font-black uppercase">Home</span>
          </button>
          <button onClick={() => setShowLeaderboard(true)} className={`flex flex-col items-center gap-1 ${showLeaderboard ? 'text-orange-600' : 'text-slate-300'}`}>
            <Trophy size={22}/>
            <span className="text-[7px] font-black uppercase">Top</span>
          </button>
          <button onClick={() => setIsPostingModalOpen(true)} className="bg-orange-500 text-white w-14 h-14 rounded-2xl shadow-xl shadow-orange-200 flex items-center justify-center -mt-10 border-[6px] border-[#f8fafc] active:scale-90 transition-all">
            <Plus size={28} strokeWidth={3}/>
          </button>
          <button onClick={() => {setActiveCategory('All');}} className={`flex flex-col items-center gap-1 ${activeCategory !== 'All' ? 'text-orange-600' : 'text-slate-300'}`}>
            <LayoutGrid size={22}/>
            <span className="text-[7px] font-black uppercase">Chủ đề</span>
          </button>
          <button onClick={() => setSelectedProfileId(user.uid)} className={`flex flex-col items-center gap-1 ${selectedProfileId === user.uid ? 'text-orange-600' : 'text-slate-300'}`}>
            <UserIcon size={22}/>
            <span className="text-[7px] font-black uppercase">Tôi</span>
          </button>
        </nav>

        {isPostingModalOpen && (
          <div className="fixed inset-0 bg-white z-[100] p-5 flex flex-col animate-in slide-in-from-bottom-full duration-500">
             <div className="flex justify-between items-center mb-6 pt-2">
                <div className="flex items-center gap-2.5">
                   <div className="bg-orange-500 p-1.5 rounded-lg text-white"><Flame size={14}/></div>
                   <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Thắp lửa tri thức</h3>
                </div>
                <button onClick={() => setIsPostingModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={16}/></button>
             </div>
             <CreatePostBox user={user} onComplete={() => setIsPostingModalOpen(false)} />
          </div>
        )}

        {showLeaderboard && <LeaderboardModal users={leaderboardUsers} onClose={() => setShowLeaderboard(false)} onOpenProfile={setSelectedProfileId} />}
        {selectedProfileId && <UserProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} currentUser={user} />}
      </div>
    </HashRouter>
  );
}

// --- Card Component ---
const PostCard: React.FC<{ post: Post, currentUser: FirebaseUser, onOpenProfile: (id: string) => void }> = ({ post, currentUser, onOpenProfile }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const isLiked = post.likedBy?.includes(currentUser.uid);
  const isAdmin = currentUser.email === ADMIN_EMAIL;

  const CHARACTER_LIMIT = 250;
  const isLongContent = post.content.length > CHARACTER_LIMIT;
  const displayContent = (!isExpanded && isLongContent) 
    ? post.content.substring(0, CHARACTER_LIMIT).trim() + "..." 
    : post.content;

  useEffect(() => {
    if (showComments) {
      const q = query(collection(db, 'comments'), where('postId', '==', post.id), orderBy('createdAt', 'asc'));
      return onSnapshot(q, (snap) => setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment))));
    }
  }, [showComments, post.id]);

  return (
    <article className="bg-white border border-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden hover:shadow-sm transition-all group relative">
      <div className="p-4 sm:p-7 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <UserAvatar uid={post.authorUid} name={post.author} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-sm cursor-pointer" onClick={() => onOpenProfile(post.authorUid)} />
          <div>
            <h4 onClick={() => onOpenProfile(post.authorUid)} className="font-black text-slate-800 text-[13px] sm:text-[14px] cursor-pointer hover:text-orange-600 leading-none mb-1">{post.author}</h4>
            <div className="flex items-center gap-2">
               <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">{post.timestamp}</span>
               <div className="w-0.5 h-0.5 rounded-full bg-slate-100"></div>
               <span className="text-orange-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{post.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {isAdmin && <button onClick={() => deletePost(post.id)} className="p-1.5 text-slate-100 hover:text-red-400 transition-all"><Trash2 size={13}/></button>}
        </div>
      </div>

      <div className="px-5 sm:px-11 pb-5 sm:pb-7">
        <h3 className="text-[14px] sm:text-[18px] font-black text-slate-900 mb-2 sm:mb-3 tracking-tight">{post.title}</h3>
        <p className="text-slate-500 text-[12px] sm:text-[14px] leading-relaxed whitespace-pre-wrap font-medium">
          {displayContent}
          {isLongContent && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 inline-flex items-center gap-1 text-orange-500 font-black hover:text-orange-600 transition-colors">
              {isExpanded ? <><span className="text-[9px] uppercase">Thu gọn</span><ChevronUp size={14}/></> : <><span className="text-[9px] uppercase">Đọc tiếp</span><ChevronDown size={14}/></>}
            </button>
          )}
        </p>
      </div>

      <div className="px-5 sm:px-10 py-3.5 sm:py-4 border-t border-slate-50/50 flex items-center gap-5 sm:gap-7 bg-slate-50/20">
        <button onClick={() => toggleLikePost(post.id, currentUser.uid, post.authorUid, !isLiked, currentUser.displayName || '', currentUser.photoURL || '')} className={`flex items-center gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-widest ${isLiked ? 'text-orange-600' : 'text-slate-300'}`}>
          <div className={`p-2 rounded-lg ${isLiked ? 'bg-orange-100' : 'bg-white border border-slate-50'}`}><ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"}/></div>
          {post.likes}
        </button>
        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-widest ${showComments ? 'text-blue-600' : 'text-slate-300'}`}>
          <div className={`p-2 rounded-lg ${showComments ? 'bg-blue-100' : 'bg-white border border-slate-50'}`}><MessageCircle size={14}/></div>
          {post.comments}
        </button>
      </div>

      {showComments && (
        <div className="bg-[#fcfdfe] p-5 sm:p-9 border-t border-slate-50 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <CommentInput postId={post.id} authorUid={post.authorUid} user={currentUser} />
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <UserAvatar uid={c.authorUid} name={c.author} className="w-8 h-8 rounded-lg shadow-sm h-fit" onClick={() => onOpenProfile(c.authorUid)} />
                <div className="bg-white p-3 rounded-xl border border-slate-50 flex-1 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <span onClick={() => onOpenProfile(c.authorUid)} className="font-black text-[9px] text-slate-800 cursor-pointer uppercase block mb-0.5">{c.author}</span>
                  <p className="text-[11px] text-slate-600 font-medium">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

const CommentInput: React.FC<{ postId: string, authorUid: string, user: FirebaseUser }> = ({ postId, authorUid, user }) => {
  const [text, setText] = useState('');
  const handleSend = async () => {
    if (!text.trim()) return;
    await addComment(postId, authorUid, user.uid, user.displayName || 'Bạn', user.photoURL || '', text);
    setText('');
  };
  return (
    <div className="flex gap-2.5 items-center">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Chia sẻ tử tế..." className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-medium outline-none focus:border-orange-200 transition-all" />
      <button onClick={handleSend} className="bg-[#0f172a] text-white p-3 rounded-xl shadow-md"><Send size={15}/></button>
    </div>
  );
};

// --- Create Post Box với Chủ đề Động ---
const CreatePostBox: React.FC<{ user: FirebaseUser, onComplete?: () => void }> = ({ user, onComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    const finalCategory = showNewCategoryInput ? (newCategory.trim() || "Chung") : category;
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        title, content, category: finalCategory, author: user.displayName, authorAvatar: user.photoURL, authorUid: user.uid,
        likes: 0, comments: 0, likedBy: [], createdAt: serverTimestamp()
      });
      setTitle(''); setContent(''); setExpanded(false); setNewCategory(''); setShowNewCategoryInput(false);
      await updateUserPoints(user.uid, 10);
      if (onComplete) onComplete();
    } finally { setLoading(false); }
  };

  const isMobileView = !!onComplete;

  return (
    <div className={`${!isMobileView ? `bg-white border border-slate-50 rounded-[2rem] shadow-sm mb-10 overflow-hidden ${expanded ? 'p-8' : 'p-5 cursor-pointer hover:border-orange-100'}` : 'flex-1 flex flex-col'}`}>
      {(!expanded && !isMobileView) ? (
        <div onClick={() => setExpanded(true)} className="flex items-center gap-5">
          <UserAvatar uid={user.uid} className="w-10 h-10 rounded-xl shadow-md border border-white" />
          <span className="font-black text-slate-300 text-[15px] tracking-tight">Thắp một ngọn lửa tri thức mới?</span>
          <div className="ml-auto bg-orange-50 text-orange-600 p-2 rounded-lg"><Plus size={20}/></div>
        </div>
      ) : (
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="space-y-3 flex-1">
             <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề bài viết..." className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-[13px] font-black outline-none focus:bg-white focus:border-orange-200 transition-all" />
             <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Chia sẻ tâm huyết của bạn..." className={`w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:bg-white focus:border-orange-200 transition-all resize-none ${isMobileView ? 'flex-1 min-h-[200px]' : 'h-32'}`} />
          </div>

          <div className="space-y-2.5">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest pl-1">Chọn chủ đề</p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => {setCategory(cat); setShowNewCategoryInput(false);}} className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all border ${!showNewCategoryInput && category === cat ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-300'}`}>{cat}</button>
              ))}
              <button onClick={() => setShowNewCategoryInput(true)} className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all border flex items-center gap-1.5 ${showNewCategoryInput ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                <Tag size={10}/> {showNewCategoryInput ? 'Đang tạo mới...' : 'Chủ đề khác +'}
              </button>
            </div>
            {showNewCategoryInput && (
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nhập chủ đề mới (VD: Nghệ thuật, Nấu ăn...)" className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2 text-[11px] font-bold outline-none focus:bg-white animate-in slide-in-from-top-2" autoFocus />
            )}
          </div>

          <div className={`pt-4 ${isMobileView ? 'pb-8' : ''}`}>
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#0f172a] text-white py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[10px]">
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} 
              Lan toả ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LeaderboardModal: React.FC<{ users: LeaderboardUser[], onClose: () => void, onOpenProfile: (id: string) => void }> = ({ users, onClose, onOpenProfile }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4">
    <div className="bg-white rounded-none sm:rounded-[2rem] w-full max-w-md h-full sm:h-auto sm:max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white text-center relative">
        <button onClick={onClose} className="absolute top-5 right-5 bg-white/10 p-2 rounded-full text-white"><X size={16}/></button>
        <Award size={32} className="mx-auto mb-2 text-orange-400"/>
        <h2 className="text-xl font-black uppercase tracking-widest">Bảng Vàng</h2>
      </div>
      <div className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-hide bg-[#f8fafc]">
        {users.map((u, i) => (
          <div key={u.uid} onClick={() => { onOpenProfile(u.uid); onClose(); }} className="flex items-center gap-3 p-3 rounded-xl border bg-white cursor-pointer hover:shadow-md transition-all">
            <span className="w-6 text-center font-black text-sm">{i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</span>
            <UserAvatar uid={u.uid} name={u.displayName} className="w-8 h-8 rounded-lg" />
            <div className="flex-1 min-w-0"><h4 className="font-black text-slate-800 text-[11px] truncate leading-tight">{u.displayName}</h4></div>
            <div className="font-black text-orange-600 flex items-center gap-0.5 bg-orange-50 px-2 py-0.5 rounded-md text-[8px]"><Zap size={9} fill="currentColor"/> {u.points}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminAILab: React.FC<{ user: FirebaseUser }> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setAiResult(null);
    try {
      const res = await generateAIPost(topic);
      setAiResult(res);
    } finally { setLoading(false); }
  };

  const handlePublish = async () => {
    if (!aiResult || posting) return;
    setPosting(true);
    try {
      const postRef = await addDoc(collection(db, 'posts'), {
        title: aiResult.title,
        content: aiResult.content,
        category: "AI Insight",
        author: aiResult.authorName,
        authorAvatar: "",
        authorUid: `ai-${Date.now()}`,
        likes: Math.floor(Math.random() * 60) + 20,
        comments: aiResult.fakeComments.length,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      setAiResult(null); setTopic('');
    } finally { setPosting(false); }
  };

  return (
    <div className="bg-white border border-indigo-50 rounded-[2.5rem] p-10 shadow-xl">
      <div className="flex items-center gap-3 mb-6"><Wand2 className="text-indigo-600" size={24}/><h2 className="text-xl font-black">AI Hub</h2></div>
      <div className="flex gap-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Chủ đề AI triển khai..." className="flex-1 bg-slate-50 border rounded-lg px-4 py-3" />
        <button onClick={handleGenerate} className="bg-indigo-600 text-white px-6 rounded-lg font-black">{loading ? '...' : 'Tạo'}</button>
      </div>
      {aiResult && (
        <div className="mt-6 p-6 bg-indigo-50 rounded-xl border border-dashed border-indigo-200">
          <h3 className="font-black mb-2">{aiResult.title}</h3>
          <p className="text-sm italic">"{aiResult.content}"</p>
          <button onClick={handlePublish} className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-black">Đăng AI Insight</button>
        </div>
      )}
    </div>
  );
};

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isLogin) await loginWithEmail(email, password);
      else await registerWithEmail(email, password, name);
    } catch (err) { alert("Lỗi đăng nhập!"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="bg-white border rounded-[3rem] p-10 shadow-xl max-w-sm w-full text-center">
        <div className="bg-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><Sparkles size={32}/></div>
        <h1 className="text-2xl font-black mb-6">Lửa Nhỏ</h1>
        <div className="flex mb-6 bg-slate-50 p-1 rounded-xl">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${isLogin ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-300'}`}>Đăng nhập</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${!isLogin ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-300'}`}>Tham gia</button>
        </div>
        <form onSubmit={handleAuth} className="space-y-3">
          {!isLogin && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên..." className="w-full bg-slate-50 border rounded-xl py-3 px-5 text-sm" required />}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email..." className="w-full bg-slate-50 border rounded-xl py-3 px-5 text-sm" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu..." className="w-full bg-slate-50 border rounded-xl py-3 px-5 text-sm" required />
          <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black mt-2">{loading ? '...' : (isLogin ? 'Vào cộng đồng' : 'Bắt đầu thắp lửa')}</button>
          <button type="button" onClick={loginWithGoogle} className="w-full bg-white border py-3 rounded-xl font-black flex items-center justify-center gap-2 text-xs mt-2"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-4 h-4" /> Google Account</button>
        </form>
      </div>
    </div>
  );
};

export default App;
