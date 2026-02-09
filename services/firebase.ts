
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  setDoc, 
  getDoc, 
  increment,
  serverTimestamp,
  where,
  limit,
  getDocs
} from "firebase/firestore";
import { Post, Comment } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAxnc3NirdQo60iJe7UXe6vtB8OByqL7XE",
  authDomain: "henho-2ad45.firebaseapp.com",
  projectId: "henho-2ad45",
  storageBucket: "henho-2ad45.firebasestorage.app",
  messagingSenderId: "342359306262",
  appId: "1:342359306262:web:01eac5954071e48a318537",
  measurementId: "G-9RYJ739JGF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      points: 0,
      email: user.email,
      createdAt: serverTimestamp()
    });
  }
  return user;
};

export const loginWithEmail = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  await updateProfile(userCredential.user, {
    displayName: name,
    photoURL: photoURL
  });
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    displayName: name,
    photoURL: photoURL,
    points: 0,
    email: email,
    createdAt: serverTimestamp()
  });
  return userCredential.user;
};

export const logout = () => signOut(auth);

// Cập nhật Avatar
export const updateUserAvatar = async (userId: string, base64Image: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { photoURL: base64Image });
  if (auth.currentUser && auth.currentUser.uid === userId) {
    await updateProfile(auth.currentUser, { photoURL: base64Image });
  }
};

// Cập nhật Tên
export const updateDisplayName = async (userId: string, newName: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { displayName: newName });
  if (auth.currentUser && auth.currentUser.uid === userId) {
    await updateProfile(auth.currentUser, { displayName: newName });
  }
};

// --- Hệ thống Thông báo ---
export const createNotification = async (notif: any) => {
  if (notif.toUid === notif.fromUid) return; 
  await addDoc(collection(db, 'notifications'), {
    ...notif,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const markNotificationRead = (id: string) => 
  updateDoc(doc(db, 'notifications', id), { read: true });

// --- Tương tác ---
export const updateUserPoints = async (userId: string, pointsToAdd: number) => {
  if (userId.startsWith('ai-')) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { points: increment(pointsToAdd) });
};

export const toggleLikePost = async (postId: string, userId: string, postAuthorId: string, isLiking: boolean, userName: string, userAvatar: string) => {
  const postRef = doc(db, 'posts', postId);
  if (isLiking) {
    await updateDoc(postRef, {
      likedBy: arrayUnion(userId),
      likes: increment(1)
    });
    await updateUserPoints(userId, 1);
    await createNotification({
      toUid: postAuthorId,
      fromUid: userId,
      fromName: userName,
      fromAvatar: userAvatar,
      type: 'like',
      postId
    });
  } else {
    await updateDoc(postRef, {
      likedBy: arrayRemove(userId),
      likes: increment(-1)
    });
  }
};

export const addComment = async (
  postId: string, 
  postAuthorId: string,
  userId: string, 
  author: string, 
  avatar: string, 
  content: string,
  parentId?: string,
  replyToUid?: string,
  replyToName?: string
) => {
  const commentsRef = collection(db, 'comments');
  await addDoc(commentsRef, {
    postId,
    authorUid: userId,
    author,
    authorAvatar: avatar,
    content,
    parentId: parentId || null,
    replyToName: replyToName || null,
    createdAt: serverTimestamp()
  });
  
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    comments: increment(1)
  });
  
  await updateUserPoints(userId, 2);

  if (parentId && replyToUid) {
    await createNotification({
      toUid: replyToUid,
      fromUid: userId,
      fromName: author,
      fromAvatar: avatar,
      type: 'reply',
      postId,
      content: content.substring(0, 50) + '...'
    });
  } else if (postAuthorId !== userId) {
    await createNotification({
      toUid: postAuthorId,
      fromUid: userId,
      fromName: author,
      fromAvatar: avatar,
      type: 'comment',
      postId,
      content: content.substring(0, 50) + '...'
    });
  }
};

export const getUserPosts = async (userId: string) => {
  const q = query(collection(db, 'posts'), where('authorUid', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
};

export const getUserComments = async (userId: string) => {
  const q = query(collection(db, 'comments'), where('authorUid', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
};

export const deletePost = (postId: string) => deleteDoc(doc(db, 'posts', postId));
