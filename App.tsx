
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
  Camera,
  Edit3,
  Check,
  User as UserIcon,
  LayoutGrid,
  Lightbulb,
  Sparkle,
  Layers,
  Settings2,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Post, Comment, DEFAULT_CATEGORIES, LeaderboardUser, UserProfileData } from './types';
import { 
  auth, 
  db, 
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
import { generateAIPost, suggestAITitle, refineAIContent, AIResult } from './services/geminiService';
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
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Đang tải...</p>
      </div>
    </div>
  );

  const level = getLevelInfo(profile?.points || 0);
  const isMe = userId === currentUser.uid;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8fafc] rounded-none sm:rounded-[2rem] w-full max-w-2xl h-full sm:max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500">
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
                  <input value={newName} onChange={(e) => setnewName(e.target.value)} className="text-xl font-bold text-slate-900 border-b-2 border-orange-500 outline-none w-full bg-orange-50/50 rounded-lg px-2" autoFocus />
                  <button onClick={handleSaveName} className="bg-green-500 text-white p-1 rounded-lg"><Check size={16}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{profile?.displayName}</h2>
                  {isMe && <button onClick={() => setIsEditingName(true)} className="text-slate-300 hover:text-orange-500"><Edit3 size={14}/></button>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold text-white bg-gradient-to-r ${level.color} uppercase tracking-widest`}>{level.name}</span>
                <span className="text-orange-600 font-bold text-[10px] flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-md"><Zap size={11} fill="currentColor" /> {profile?.points || 0} pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
            <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-50 flex flex-col items-center">
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest">Bài đăng</p>
              <p className="text-sm sm:text-lg font-bold text-slate-800">{posts.length}</p>
            </div>
            <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-50 flex flex-col items-center">
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest">Bình luận</p>
              <p className="text-sm sm:text-lg font-bold text-slate-800">{comments.length}</p>
            </div>
            <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-50 flex flex-col items-center ring-2 ring-orange-50/50">
              <p className="text-[8px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-widest">Hạng</p>
              <p className="text-sm sm:text-lg font-bold text-slate-800">#{rank}</p>
            </div>
          </div>

          <div className="flex gap-6 border-b border-slate-50 mb-5 sticky top-0 bg-[#f8fafc]/95 backdrop-blur z-10 py-2">
            <button onClick={() => setActiveTab('posts')} className={`pb-2.5 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'posts' ? 'text-orange-600' : 'text-slate-400'}`}>
              Bài viết
              {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
            <button onClick={() => setActiveTab('comments')} className={`pb-2.5 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'comments' ? 'text-orange-600' : 'text-slate-400'}`}>
              Tương tác
              {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"></div>}
            </button>
          </div>

          <div className="space-y-3">
            {activeTab === 'posts' ? (
              posts.map(p => (
                <div key={p.id} className="bg-white border border-slate-50 p-4 rounded-xl border-l-4 border-l-orange-400 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-[14px] mb-1 leading-tight">{p.title}</h4>
                  <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed">{p.content}</p>
                  <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase tracking-widest">{p.timestamp}</p>
                </div>
              ))
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-50 shadow-sm flex gap-3">
                  <div className="bg-orange-50 text-orange-500 p-1.5 rounded-lg h-fit"><MessageCircle size={14}/></div>
                  <p className="text-[12px] text-slate-600 italic leading-relaxed">"{c.content}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
          ? new Date(data.createdAt.seconds * 1000).toLocaleString('vi-VN')
          : 'Vừa xong';
        return { 
          id: doc.id, ...data, 
          timestamp: formattedDate
        } as Post;
      }));
    });
  }, [user, sortBy]);

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
    <div className="h-screen flex items-center justify-center bg-white flex-col gap-4">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Đang tải dữ liệu...</p>
    </div>
  );
  
  if (!user) return <AuthScreen />;

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 pb-20 xl:pb-0">
        <aside className="hidden xl:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-100 bg-white/80 backdrop-blur-xl p-8">
          <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => {setActiveCategory('All'); setSearchQuery('');}}>
            <div className="bg-orange-500 p-2 rounded-lg text-white shadow-lg"><Sparkles size={20}/></div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">Lửa Nhỏ</h1>
          </div>
          
          <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide">
            <button onClick={() => {setActiveCategory('All'); setSearchQuery('');}} className={`flex items-center gap-4 w-full px-5 py-3 rounded-xl font-bold text-[13px] transition-all ${activeCategory === 'All' && !searchQuery ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Home size={18}/> <span>Trang chủ</span>
            </button>
            <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl font-bold text-[13px] text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all">
              <Trophy size={18}/> <span>Bảng vàng</span>
            </button>

            <div className="pt-8 pb-3 px-5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Chủ đề</div>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => {setActiveCategory(cat); setSearchQuery('');}} className={`flex items-center gap-4 w-full px-5 py-2.5 rounded-xl text-[12px] font-medium transition-all ${activeCategory === cat ? 'bg-orange-50 text-orange-600 border-r-[3px] border-orange-500' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Hash size={16} className={activeCategory === cat ? 'text-orange-500' : 'text-slate-200'}/> <span className="truncate">{cat}</span>
              </button>
            ))}

            {isAdmin && (
              <div className="mt-8 pt-4 border-t border-slate-50">
                 <button onClick={() => setActiveCategory('ADMIN_AI')} className={`flex items-center gap-4 w-full px-5 py-3 rounded-xl font-bold text-[12px] transition-all ${activeCategory === 'ADMIN_AI' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                    <Wand2 size={18}/> <span>Admin AI Lab</span>
                 </button>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-5 border-t border-slate-50">
             <div onClick={() => setSelectedProfileId(user.uid)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                <UserAvatar uid={user.uid} className="w-9 h-9 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 truncate mb-1">{userProfile?.displayName || user.displayName}</p>
                  <p className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1"><Zap size={10} fill="currentColor"/> {userProfile?.points || 0} pts</p>
                </div>
             </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          <div className="sticky top-0 z-[60] bg-white border-b border-slate-50">
            <header className="px-4 py-3 flex items-center justify-between">
              <div className="flex xl:hidden items-center gap-2" onClick={() => {setActiveCategory('All'); setSearchQuery('');}}>
                <div className="bg-orange-500 p-1.5 rounded-lg text-white shadow-md"><Sparkles size={16}/></div>
                <h1 className="text-lg font-black tracking-tighter leading-none">Lửa Nhỏ</h1>
              </div>

              <div className="hidden md:flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 w-full max-sm:max-w-none max-w-sm gap-3">
                <Search size={16} className={searchQuery ? 'text-orange-500' : 'text-slate-300'}/>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm tri thức..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[13px] font-medium outline-none w-full text-slate-600" 
                />
              </div>

              <div className="flex items-center gap-3">
                 <button onClick={logout} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-all"><LogOut size={18}/></button>
                 <button onClick={() => setSelectedProfileId(user.uid)} className="xl:hidden">
                    <UserAvatar uid={user.uid} className="w-8 h-8 rounded-lg border border-white shadow-sm" />
                 </button>
              </div>
            </header>

            <div className="xl:hidden bg-white py-2 overflow-x-auto scrollbar-hide px-4 flex gap-2 border-t border-slate-50">
              <button onClick={() => {setActiveCategory('All'); setSearchQuery('');}} className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === 'All' && !searchQuery ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Tất cả</button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => {setActiveCategory(cat); setSearchQuery('');}} className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>{cat}</button>
              ))}
              {isAdmin && (
                <button onClick={() => setActiveCategory('ADMIN_AI')} className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === 'ADMIN_AI' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-400 border border-indigo-100'}`}>AI Lab</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
            <div className="p-4 sm:p-10 max-w-3xl mx-auto w-full">
              {activeCategory === 'ADMIN_AI' && isAdmin ? <AdminAILab user={user} /> : (
                <>
                  <div className="hidden sm:block">
                     <CreatePostBox user={user} isAdmin={isAdmin} />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-8 px-2">
                    <div className="flex items-center gap-3">
                       <h2 className="text-xl font-bold tracking-tight text-slate-900">
                         {searchQuery ? `Kết quả: "${searchQuery}"` : (activeCategory === 'All' ? 'Đang lan tỏa' : activeCategory)}
                       </h2>
                       <div className="h-0.5 w-8 bg-orange-500 rounded-full"></div>
                    </div>

                    {!searchQuery && (
                      <div className="segmented-control flex items-center p-1 bg-slate-100 rounded-2xl">
                         <button 
                            onClick={() => setSortBy('latest')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'latest' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            <Clock size={14}/> Mới nhất
                         </button>
                         <button 
                            onClick={() => setSortBy('trending')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'trending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            <TrendingUp size={14}/> Thịnh hành
                         </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {filteredPosts.map(p => <PostCard key={p.id} post={p} currentUser={user} onOpenProfile={setSelectedProfileId} />)}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-3 flex justify-between items-center z-[70] shadow-xl">
          <button onClick={() => { setActiveCategory('All'); setSearchQuery(''); window.scrollTo({top:0, behavior:'smooth'}); }} className={`flex flex-col items-center gap-1 ${activeCategory === 'All' && !searchQuery ? 'text-orange-600' : 'text-slate-300'}`}>
            <Home size={24}/>
            <span className="text-[8px] font-bold uppercase">Home</span>
          </button>
          <button onClick={() => setShowLeaderboard(true)} className={`flex flex-col items-center gap-1 ${showLeaderboard ? 'text-orange-600' : 'text-slate-300'}`}>
            <Trophy size={24}/>
            <span className="text-[8px] font-bold uppercase">Bảng vàng</span>
          </button>
          <button onClick={() => setIsPostingModalOpen(true)} className="bg-orange-500 text-white w-12 h-12 rounded-xl shadow-lg flex items-center justify-center -mt-8 border-4 border-white active:scale-90 transition-all">
            <Plus size={24} strokeWidth={3}/>
          </button>
          <button onClick={() => {setActiveCategory('All');}} className={`flex flex-col items-center gap-1 ${activeCategory !== 'All' ? 'text-orange-600' : 'text-slate-300'}`}>
            <LayoutGrid size={24}/>
            <span className="text-[8px] font-bold uppercase">Khám phá</span>
          </button>
          <button onClick={() => setSelectedProfileId(user.uid)} className={`flex flex-col items-center gap-1 ${selectedProfileId === user.uid ? 'text-orange-600' : 'text-slate-300'}`}>
            <UserIcon size={24}/>
            <span className="text-[8px] font-bold uppercase">Tôi</span>
          </button>
        </nav>

        {isPostingModalOpen && (
          <div className="fixed inset-0 bg-white z-[100] p-6 flex flex-col animate-in slide-in-from-bottom-full duration-500">
             <div className="flex justify-between items-center mb-8 pt-4">
                <div className="flex items-center gap-3">
                   <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg"><Plus size={20}/></div>
                   <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Đăng bài mới</h3>
                </div>
                <button onClick={() => setIsPostingModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
             </div>
             <CreatePostBox user={user} isAdmin={isAdmin} onComplete={() => setIsPostingModalOpen(false)} />
          </div>
        )}

        {showLeaderboard && <LeaderboardModal users={leaderboardUsers} onClose={() => setShowLeaderboard(false)} onOpenProfile={setSelectedProfileId} />}
        {selectedProfileId && <UserProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} currentUser={user} />}
      </div>
    </HashRouter>
  );
}

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
    <article className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group shadow-sm">
      <div className="p-5 sm:p-7 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar uid={post.authorUid} name={post.author} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-md border-2 border-white cursor-pointer" onClick={() => onOpenProfile(post.authorUid)} />
          <div>
            <h4 onClick={() => onOpenProfile(post.authorUid)} className="font-bold text-slate-900 text-[14px] sm:text-[16px] cursor-pointer hover:text-orange-600 transition-colors leading-none mb-1">{post.author}</h4>
            <div className="flex items-center gap-2">
               <span className="text-[10px] sm:text-[12px] font-bold text-slate-300 uppercase tracking-widest italic">{post.timestamp}</span>
               <div className="w-1 h-1 rounded-full bg-slate-100"></div>
               <span className="text-orange-500 text-[10px] sm:text-[12px] font-bold uppercase tracking-widest">{post.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {isAdmin && <button onClick={() => deletePost(post.id)} className="p-2 text-slate-100 hover:text-red-500 transition-all"><Trash2 size={16}/></button>}
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-6 sm:pb-8">
        <h3 className="text-[18px] sm:text-[22px] font-bold text-slate-900 mb-3 tracking-tight">{post.title}</h3>
        <p className="text-slate-600 text-[14px] sm:text-[16px] leading-relaxed whitespace-pre-wrap font-medium">
          {displayContent}
          {isLongContent && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 text-orange-500 font-bold hover:text-orange-600 transition-all text-[12px] uppercase tracking-widest mt-2">
              {isExpanded ? 'Thu gọn' : 'Đọc tiếp...'}
            </button>
          )}
        </p>
      </div>

      <div className="px-6 sm:px-10 py-4 border-t border-slate-50 flex items-center gap-8 bg-slate-50/20">
        <button onClick={() => toggleLikePost(post.id, currentUser.uid, post.authorUid, !isLiked, currentUser.displayName || '', currentUser.photoURL || '')} className={`flex items-center gap-2 font-bold text-[12px] transition-all ${isLiked ? 'text-orange-600' : 'text-slate-300'}`}>
          <div className={`p-2.5 rounded-xl transition-all ${isLiked ? 'bg-orange-100' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <ThumbsUp size={18} fill={isLiked ? "currentColor" : "none"}/>
          </div>
          {post.likes}
        </button>
        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 font-bold text-[12px] transition-all ${showComments ? 'text-blue-600' : 'text-slate-300'}`}>
          <div className={`p-2.5 rounded-xl transition-all ${showComments ? 'bg-blue-100' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <MessageCircle size={18}/>
          </div>
          {post.comments}
        </button>
      </div>

      {showComments && (
        <div className="bg-[#fcfdfe] p-6 sm:p-10 border-t border-slate-100 space-y-8 animate-in slide-in-from-top-4 duration-300">
          <CommentInput postId={post.id} authorUid={post.authorUid} user={currentUser} />
          <div className="space-y-6">
            {comments.map(c => (
              <div key={c.id} className="flex gap-4">
                <UserAvatar uid={c.authorUid} name={c.author} className="w-10 h-10 rounded-xl shadow-sm h-fit" onClick={() => onOpenProfile(c.authorUid)} />
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex-1 shadow-sm">
                  <span onClick={() => onOpenProfile(c.authorUid)} className="font-bold text-[11px] text-slate-800 cursor-pointer uppercase tracking-widest block mb-1">{c.author}</span>
                  <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">"{c.content}"</p>
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
    <div className="flex gap-3 items-center">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Chia sẻ ý kiến của bạn..." className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-[13px] font-medium outline-none focus:border-orange-300 transition-all shadow-sm" />
      <button onClick={handleSend} className="bg-slate-900 text-white p-3.5 rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all"><Send size={20}/></button>
    </div>
  );
};

const CreatePostBox: React.FC<{ user: FirebaseUser, isAdmin?: boolean, onComplete?: () => void }> = ({ user, isAdmin, onComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSuggestingTitle, setAiSuggestingTitle] = useState(false);
  const [aiRefining, setAiRefining] = useState(false);

  const handleAISuggestTitle = async () => {
    setAiSuggestingTitle(true);
    try {
      const suggested = await suggestAITitle(category);
      setTitle(suggested);
    } catch (e) {
      alert("AI đang bận một chút!");
    } finally {
      setAiSuggestingTitle(false);
    }
  };

  const handleAIRefine = async () => {
    if (!content.trim()) return;
    setAiRefining(true);
    try {
      const refined = await refineAIContent(content);
      setContent(refined);
    } catch (e) {
      alert("AI đang bận!");
    } finally {
      setAiRefining(false);
    }
  };

  const handleAIDraft = async () => {
    if (!title.trim()) {
      alert("Hãy nhập tiêu đề trước để AI có gợi ý nhé!");
      return;
    }
    setAiDrafting(true);
    try {
      const res = await generateAIPost(title, category);
      setContent(res.content);
    } catch (e) {
      alert("AI đang bận một chút, hãy thử lại sau!");
    } finally {
      setAiDrafting(false);
    }
  };

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
    <div className={`${!isMobileView ? `bg-white border border-slate-100 rounded-3xl shadow-sm mb-10 overflow-hidden ${expanded ? 'p-8' : 'p-5 cursor-pointer hover:border-orange-200'}` : 'flex-1 flex flex-col'}`}>
      {(!expanded && !isMobileView) ? (
        <div onClick={() => setExpanded(true)} className="flex items-center gap-5">
          <UserAvatar uid={user.uid} className="w-12 h-12 rounded-xl shadow-md border-2 border-white" />
          <span className="font-bold text-slate-300 text-[16px] tracking-tight">Thắp một ngọn lửa tri thức mới?</span>
          <div className="ml-auto bg-orange-50 text-orange-600 p-2.5 rounded-xl shadow-sm"><Plus size={24}/></div>
        </div>
      ) : (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="space-y-4 flex-1">
             <div className="relative group">
               <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề gợi mở..." className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-6 py-4 pr-24 text-[16px] font-bold outline-none focus:bg-white focus:border-orange-300 transition-all shadow-sm" />
               {isAdmin && (
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {!title && (
                      <button 
                        onClick={handleAISuggestTitle} 
                        disabled={aiSuggestingTitle}
                        className="text-orange-400 hover:text-orange-600 transition-all p-2 hover:bg-orange-50 rounded-lg"
                        title="Gợi ý tiêu đề bằng AI"
                      >
                        {aiSuggestingTitle ? <RefreshCw className="animate-spin" size={18}/> : <Lightbulb size={18}/>}
                      </button>
                    )}
                    <button 
                      onClick={handleAIDraft} 
                      disabled={aiDrafting}
                      className="text-indigo-400 hover:text-indigo-600 transition-all p-2 hover:bg-indigo-50 rounded-lg"
                      title="AI viết nháp dựa trên tiêu đề"
                    >
                      {aiDrafting ? <RefreshCw className="animate-spin" size={18}/> : <Wand2 size={18}/>}
                    </button>
                 </div>
               )}
             </div>
             <div className="relative">
               <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Chia sẻ tâm huyết của bạn..." className={`w-full bg-slate-50/50 border border-slate-100 rounded-xl px-6 py-4 text-[14px] font-medium outline-none focus:bg-white focus:border-orange-300 transition-all resize-none shadow-sm ${isMobileView ? 'flex-1 min-h-[300px]' : 'h-48'}`} />
               {isAdmin && content.length > 10 && (
                 <button 
                  onClick={handleAIRefine} 
                  disabled={aiRefining}
                  className="absolute bottom-4 right-4 bg-indigo-50 text-indigo-600 p-2 rounded-lg flex items-center gap-2 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                  title="Tinh chỉnh văn phong bằng AI"
                 >
                   {aiRefining ? <RefreshCw className="animate-spin" size={14}/> : <Sparkle size={14}/>}
                   TỐI ƯU AI
                 </button>
               )}
             </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Chọn chủ đề</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => {setCategory(cat); setShowNewCategoryInput(false);}} className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${!showNewCategoryInput && category === cat ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-400 hover:text-orange-500'}`}>{cat}</button>
              ))}
              <button onClick={() => setShowNewCategoryInput(true)} className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border flex items-center gap-2 ${showNewCategoryInput ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>
                <Plus size={14}/> {showNewCategoryInput ? 'Mới...' : 'Khác'}
              </button>
            </div>
            {showNewCategoryInput && (
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Tên chủ đề mới..." className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 text-[13px] font-bold outline-none focus:bg-white animate-in slide-in-from-top-4" autoFocus />
            )}
          </div>

          <div className={`pt-4 ${isMobileView ? 'pb-10' : ''}`}>
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-5 rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[13px]">
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />} 
              Lan toả ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LeaderboardModal: React.FC<{ users: LeaderboardUser[], onClose: () => void, onOpenProfile: (id: string) => void }> = ({ users, onClose, onOpenProfile }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
    <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-lg h-full sm:h-auto sm:max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10 text-white text-center relative shrink-0">
        <button onClick={onClose} className="absolute top-6 right-6 bg-white/10 p-2.5 rounded-full text-white hover:bg-white/20 transition-all"><X size={20}/></button>
        <Award size={48} className="mx-auto mb-4 text-orange-400"/>
        <h2 className="text-3xl font-bold uppercase tracking-widest">Bảng Vàng</h2>
      </div>
      <div className="p-6 sm:p-10 space-y-3 flex-1 overflow-y-auto scrollbar-hide bg-[#f8fafc]">
        {users.map((u, i) => (
          <div key={u.uid} onClick={() => { onOpenProfile(u.uid); onClose(); }} className={`flex items-center gap-5 p-4 rounded-2xl border bg-white cursor-pointer hover:shadow-lg transition-all duration-300 ${i < 3 ? 'border-orange-200' : 'border-slate-100 shadow-sm'}`}>
            <span className={`w-8 text-center font-bold text-xl ${i === 0 ? 'text-yellow-500 text-2xl' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-200'}`}>{i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</span>
            <UserAvatar uid={u.uid} name={u.displayName} className="w-12 h-12 rounded-xl shadow-md border-2 border-white" />
            <div className="flex-1 min-w-0">
               <h4 className="font-bold text-slate-900 text-[16px] truncate leading-tight">{u.displayName}</h4>
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{getLevelInfo(u.points).name}</span>
            </div>
            <div className="font-bold text-orange-600 flex items-center gap-1.5 bg-orange-50 px-4 py-1.5 rounded-xl border border-orange-100 text-[13px] shadow-sm"><Zap size={14} fill="currentColor"/> {u.points}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminAILab: React.FC<{ user: FirebaseUser }> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [labCategories, setLabCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newCatInput, setNewCatInput] = useState('');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    const cat = newCatInput.trim();
    if (!labCategories.includes(cat)) {
      setLabCategories([...labCategories, cat]);
    }
    setSelectedCategory(cat);
    setNewCatInput('');
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setAiResult(null);
    try {
      const res = await generateAIPost(topic, selectedCategory);
      setAiResult(res);
    } catch (e) {
      alert("Lỗi khi gọi AI: " + (e as Error).message);
    } finally { 
      setLoading(false); 
    }
  };

  const handlePublish = async () => {
    if (!aiResult || posting) return;
    setPosting(true);
    try {
      const postRef = await addDoc(collection(db, 'posts'), {
        title: aiResult.title,
        content: aiResult.content,
        category: selectedCategory,
        author: aiResult.authorName,
        authorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(aiResult.authorName)}&background=random`,
        authorUid: `ai-${Date.now()}`,
        likes: Math.floor(Math.random() * 60) + 10,
        comments: aiResult.fakeComments.length,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      for (const comment of aiResult.fakeComments) {
        await addDoc(collection(db, 'comments'), {
          postId: postRef.id,
          authorUid: `ai-commenter-${Math.random().toString(36).substr(2, 9)}`,
          author: comment.authorName,
          authorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName)}&background=random`,
          content: comment.content,
          createdAt: serverTimestamp()
        });
      }

      setAiResult(null); 
      setTopic('');
      alert("Đã đăng bài viết và bình luận seeding thành công!");
    } catch (e) {
      alert("Lỗi khi đăng bài: " + (e as Error).message);
    } finally { 
      setPosting(false); 
    }
  };

  return (
    <div className="bg-white border border-indigo-100 rounded-[2.5rem] p-6 sm:p-10 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
          <Wand2 size={24}/>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">AI Insight Generator</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Phòng thí nghiệm nội dung Admin</p>
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Layers size={14}/>
              BƯỚC 1: CHỦ ĐỀ ĐỊNH HƯỚNG
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {labCategories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all border ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-2">
            <input 
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
              placeholder="Thêm chủ đề mới cho Lab..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold outline-none focus:border-indigo-400 transition-all"
            />
            <button 
              onClick={handleAddNewCategory}
              className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            >
              <Plus size={20}/>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Edit3 size={14}/>
            BƯỚC 2: Ý TƯỞNG CỐT LÕI
          </div>
          <div className="flex gap-2">
            <input 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              placeholder={`VD: Mẹo cho chủ đề ${selectedCategory}...`} 
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all" 
            />
            <button 
              onClick={handleGenerate} 
              disabled={loading}
              className="bg-indigo-600 text-white px-8 rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={20}/> : <Sparkles size={18}/>}
              TẠO
            </button>
          </div>
        </div>

        {aiResult && (
          <div className="mt-4 p-6 sm:p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 border-dashed animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-100">
               <UserAvatar uid="ai-preview" name={aiResult.authorName} className="w-10 h-10 rounded-xl" />
               <div className="flex-1">
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Preview: Bài viết định hướng</p>
                 <h4 className="font-black text-slate-800 leading-none">{aiResult.authorName}</h4>
               </div>
               <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-bold uppercase">{selectedCategory}</span>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 mb-4">{aiResult.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed italic mb-8">"{aiResult.content}"</p>
            
            <div className="space-y-4 mb-8">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seeding ({aiResult.fakeComments.length})</p>
              {aiResult.fakeComments.map((c, i) => (
                <div key={i} className="flex gap-3 bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                   <UserAvatar uid={`seed-${i}`} name={c.authorName} className="w-8 h-8 rounded-lg shrink-0" />
                   <div>
                     <p className="text-[10px] font-black text-slate-800">{c.authorName}</p>
                     <p className="text-[11px] text-slate-500 italic">"{c.content}"</p>
                   </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handlePublish} 
              disabled={posting}
              className="w-full bg-[#0f172a] text-white py-5 rounded-xl font-black shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-[12px] hover:bg-black transition-all"
            >
              {posting ? <RefreshCw className="animate-spin" size={20}/> : <Send size={20}/>}
              DUYỆT & ĐĂNG NGAY
            </button>
          </div>
        )}
      </div>
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
    } catch (err) { alert("Thông tin chưa chính xác!"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="bg-white border border-slate-100 rounded-[3rem] p-10 sm:p-16 shadow-2xl max-w-md w-full text-center animate-in zoom-in-95 duration-500">
        <div className="bg-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-orange-100"><Flame size={32} fill="currentColor" /></div>
        <h1 className="text-2xl font-black mb-1 tracking-tighter text-slate-900 leading-none">Lửa Nhỏ</h1>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] mb-10">Lan tỏa tri thức Việt</p>
        
        <div className="flex mb-8 bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${isLogin ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Đăng nhập</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${!isLogin ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Đăng ký</button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-[14px] font-bold outline-none focus:bg-white focus:border-orange-300 transition-all shadow-sm" required />}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-[14px] font-bold outline-none focus:bg-white focus:border-orange-300 transition-all shadow-sm" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-[14px] font-bold outline-none focus:bg-white focus:border-orange-300 transition-all shadow-sm" required />
          <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-6 uppercase tracking-[0.2em] text-[15px]">
            {loading ? <RefreshCw className="animate-spin inline mr-3" size={20} /> : null}
            {isLogin ? 'Vào cộng đồng' : 'Bắt đầu thắp lửa'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
