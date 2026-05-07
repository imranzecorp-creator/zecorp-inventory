import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Image as ImageIcon,
  Send,
  X,
  User as UserIcon,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Post, Comment } from '../types';
import { formatDate, cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SocialFeedProps {
  user: UserProfile;
}

export default function SocialFeed({ user }: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'posts'));
    return () => unsub();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !imageUrl.trim()) return;

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        content: newPost,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: []
      });
      setNewPost('');
      setImageUrl('');
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8"
    >
      <div className="flex items-center justify-between px-4 md:px-0">
        <h1 className="text-2xl font-bold text-white tracking-tight">Community Feed</h1>
        {(user.isApproved || user.role === 'admin') && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowForm(!showForm)}
            className="fixed bottom-24 right-6 z-40 md:static p-4 md:p-2 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 md:shadow-primary/20 transition-all border border-white/10"
          >
            <motion.div
              initial={false}
              animate={{ rotate: showForm ? 90 : 0 }}
            >
              {showForm ? <X className="w-6 h-6 md:w-5 md:h-5" /> : <Plus className="w-6 h-6 md:w-5 md:h-5" />}
            </motion.div>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-morphism p-5 rounded-3xl border border-white/5 shadow-xl"
          >
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea 
                placeholder={`What's on your mind, ${user.displayName?.split(' ')[0]}?`}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 group">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Paste image URL..." 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-white/5 bg-white/5 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newPost.trim() && !imageUrl.trim()}
                  className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  Post
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={user} />
        ))}
      </div>
    </motion.div>
  );
}

const PostCard = React.memo(({ post, currentUser }: { post: Post, currentUser: UserProfile }) => {
  const [likes, setLikes] = useState(post.likes || []);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const isLiked = likes.includes(currentUser.uid);

  useEffect(() => {
    if (showComments) {
      const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/comments`));
      return () => unsub();
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
        setLikes(prev => prev.filter(id => id !== currentUser.uid));
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        setLikes(prev => [...prev, currentUser.uid]);
      }
    } catch (error) { 
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postId: post.id,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorPhoto: currentUser.photoURL,
        content: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) { 
      handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}/comments`);
    }
  };

  return (
    <motion.div 
      layout
      className="glass-morphism rounded-3xl border border-white/5 shadow-sm overflow-hidden"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{post.authorName}</h4>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{formatDate(post.createdAt)}</p>
          </div>
        </div>
        <button className="text-slate-500 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pb-4">
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.imageUrl && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/5 cursor-zoom-in">
            <img src={post.imageUrl} alt="Post asset" className="w-full max-h-96 object-cover hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-white/5 flex items-center space-x-6 bg-white/[0.01]">
        {(currentUser.isApproved || currentUser.role === 'admin') && (
          <motion.button 
            whileTap={{ scale: 1.4 }}
            onClick={handleLike}
            className={cn(
              "flex items-center space-x-2 transition-colors",
              isLiked ? "text-red-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <motion.div
              animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
            </motion.div>
            <span className="text-xs font-bold">{likes.length}</span>
          </motion.button>
        )}
        <motion.button 
          whileHover={{ scale: 1.1, x: 2 }}
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-slate-500 hover:text-primary transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-bold">{comments.length || ''}</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 15 }}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-400 transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </motion.button>
      </div>

          {showComments && (
        <div className="bg-[#1e293b]/20 p-4 space-y-4 border-t border-white/5">
          <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {comment.authorPhoto ? (
                    <img src={comment.authorPhoto} alt={comment.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 bg-white/[0.03] p-3 rounded-2xl shadow-sm border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">{comment.authorName}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      {formatDistanceToNow(
                        typeof comment.createdAt?.toDate === 'function' 
                          ? comment.createdAt.toDate() 
                          : comment.createdAt || Date.now()
                      )} ago
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{comment.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-xs text-slate-600 py-4 italic">No comments yet</p>
            )}
          </div>

          {(currentUser.isApproved || currentUser.role === 'admin') && (
            <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-2">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-4 py-2 border border-white/10 bg-white/5 rounded-full text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <motion.button 
                whileHover={{ x: [0, 5, 0], y: [0, -5, 0] }}
                whileTap={{ scale: 0.9, x: 10, y: -10, opacity: 0 }}
                type="submit"
                disabled={!newComment.trim()}
                className="p-2 bg-primary text-white rounded-full transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </form>
          )}
        </div>
      )}
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';
