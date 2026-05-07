import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles,
  Search,
  ChevronRight,
  MoreVertical,
  Minus,
  MessageSquare,
  Mic,
  MicOff,
  Square,
  Trash2,
  Volume2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  where,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile, ChatMessage } from '../types';
import { cn, formatDate } from '../lib/utils';
import { getAiResponse } from '../services/geminiService';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface ChatViewProps {
  user: UserProfile;
}

export default function ChatView({ user }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAiMode, setIsAiMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'team' | 'ai'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, currentLang, setCurrentLang } = useVoiceSearch((transcript) => {
    setNewMessage(prev => prev + (prev ? ' ' : '') + transcript);
  });

  const { isRecording, recordingDuration, startRecording, stopRecording, uploadAudio } = useVoiceRecorder();

  const handleSendVoice = async () => {
    const blob = await stopRecording();
    if (!blob || loading) return;

    setLoading(true);
    try {
      const chatId = isAiMode 
        ? `${user.uid}_ai` 
        : [user.uid, selectedRecipient!.uid].sort().join('_');
      
      const fileName = `voice/${chatId}/${Date.now()}.webm`;
      const audioUrl = await uploadAudio(blob, fileName);

      const userMsg = {
        senderId: user.uid,
        senderName: user.displayName,
        content: '[Voice Message]',
        audioUrl: audioUrl,
        isAi: false,
        createdAt: Date.now()
      };

      try {
        await addDoc(collection(db, `chats/${chatId}/messages`), userMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRecording = () => {
    stopRecording(); // Just to clear state
  };

  const userSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const searchLow = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    users.forEach(u => {
      if (u.displayName.toLowerCase().includes(searchLow)) matches.add(u.displayName);
      if (u.role && u.role.toLowerCase().includes(searchLow)) matches.add(u.role);
    });
    
    if (activeFilter === 'all' || activeFilter === 'ai') {
      if ('ai assistant'.includes(searchLow)) matches.add('AI Assistant');
    }
    
    return Array.from(matches).slice(0, 8);
  }, [searchTerm, users, activeFilter]);

  // Filter users based on search term and active filter
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeFilter === 'ai') return false;
    return matchesSearch;
  });

  const showAiAssistant = (activeFilter === 'all' || activeFilter === 'ai') && 
    ('ai assistant'.includes(searchTerm.toLowerCase()) || 'masterai'.includes(searchTerm.toLowerCase()));

  // Sync users for chat
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
    getDocs(q).then(snapshot => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile).filter(u => u.uid !== user.uid));
    }).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });
  }, [user.uid]);

  // Sync messages
  useEffect(() => {
    let q;
    if (isAiMode) {
      q = query(
        collection(db, `chats/${user.uid}_ai/messages`), 
        orderBy('createdAt', 'asc'), 
        limit(100)
      );
    } else if (selectedRecipient) {
      const chatId = [user.uid, selectedRecipient.uid].sort().join('_');
      q = query(
        collection(db, `chats/${chatId}/messages`), 
        orderBy('createdAt', 'asc'), 
        limit(100)
      );
    }

    if (q) {
      const unsub = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      }, (err) => {
        const chatId = isAiMode 
          ? `${user.uid}_ai` 
          : [user.uid, selectedRecipient!.uid].sort().join('_');
        handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
      });
      return () => unsub();
    } else {
      setMessages([]);
    }
  }, [user.uid, isAiMode, selectedRecipient]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const content = newMessage;
    setNewMessage('');
    setLoading(true);

    try {
      const chatId = isAiMode 
        ? `${user.uid}_ai` 
        : [user.uid, selectedRecipient!.uid].sort().join('_');
        
      const userMsg = {
        senderId: user.uid,
        senderName: user.displayName,
        content: content,
        isAi: false,
        createdAt: Date.now()
      };

      try {
        await addDoc(collection(db, `chats/${chatId}/messages`), userMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
      }

      if (isAiMode) {
        const aiResponse = await getAiResponse(content);
        try {
          await addDoc(collection(db, `chats/${chatId}/messages`), {
            senderId: 'ai',
            senderName: 'MasterAI',
            content: aiResponse,
            isAi: true,
            createdAt: Date.now()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden glass-morphism rounded-3xl border border-white/5 shadow-sm relative">
      {/* Sidebar - Contacts */}
      <div className={cn(
        "w-full md:w-80 border-r border-white/5 flex flex-col bg-white/[0.02] transition-transform md:translate-x-0 absolute md:relative z-20 inset-0 md:inset-auto h-full",
        showMobileList ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Messages</h2>
          <div className="mt-4 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search team or AI..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            <AnimatePresence>
              {showSearchSuggestions && userSuggestions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchSuggestions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 space-y-1">
                      {userSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchTerm(suggestion);
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                        >
                          <Search className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center rounded-full bg-white/10 text-[10px]">✕</div>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4">
            {(['all', 'team', 'ai'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                  activeFilter === f 
                    ? "bg-primary/20 border-primary/30 text-primary" 
                    : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
          {/* AI Chat Selector */}
          {showAiAssistant && (
            <button 
              onClick={() => { 
                  setIsAiMode(true); 
                  setSelectedRecipient(null); 
                  setShowMobileList(false);
              }}
              className={cn(
                "w-full flex items-center p-3 rounded-2xl transition-all duration-300 mb-2",
                isAiMode ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "bg-white/5 text-slate-400 hover:bg-white/10"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-inner", isAiMode ? "bg-white/20" : "bg-primary/20")}>
                <Bot className={cn("w-6 h-6", isAiMode ? "text-white" : "text-primary")} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold">AI Assistant</p>
                <p className={cn("text-[10px] font-medium", isAiMode ? "text-blue-100" : "text-slate-500")}>Always online to help</p>
              </div>
              <Sparkles className={cn("w-4 h-4 transition-all", isAiMode ? "text-yellow-200 animate-pulse scale-110" : "text-slate-600")} />
            </button>
          )}

          {filteredUsers.length > 0 && (
            <div className="pt-6 pb-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Team Members</p>
            </div>
          )}

          {filteredUsers.map((u) => (
            <button 
              key={u.uid}
              onClick={() => { 
                  setIsAiMode(false); 
                  setSelectedRecipient(u); 
                  setShowMobileList(false);
              }}
              className={cn(
                "w-full flex items-center p-3 rounded-2xl border transition-all duration-300 group text-left",
                selectedRecipient?.uid === u.uid 
                  ? "bg-white/10 border-primary text-white shadow-inner" 
                  : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/5 overflow-hidden mr-3">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-500" /></div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate transition-colors decoration-primary underline-offset-4 group-hover:underline-none">{u.displayName}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tight">{u.role}</p>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-all transform", selectedRecipient?.uid === u.uid ? "text-primary rotate-90 scale-125" : "text-slate-700 group-hover:text-slate-400 group-hover:translate-x-1")} />
            </button>
          ))}

          {filteredUsers.length === 0 && !showAiAssistant && (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 px-6">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                <Search className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">No matches found</p>
                <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">Try a different name or role</p>
              </div>
              <button 
                onClick={() => setSearchTerm('')}
                className="text-xs font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
          "flex-1 flex flex-col bg-transparent relative z-10 transition-opacity",
          showMobileList ? "opacity-0 md:opacity-100" : "opacity-100"
      )}>
        <div className="h-16 md:h-20 px-4 md:px-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center space-x-3 md:space-x-4">
            <button 
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-2 text-slate-500 hover:text-white"
            >
                <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-lg",
              isAiMode ? "bg-primary/20 border-primary/20 shadow-primary/10" : "bg-white/10"
            )}>
              {isAiMode ? (
                <Bot className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              ) : selectedRecipient?.photoURL ? (
                <img src={selectedRecipient.photoURL} alt={selectedRecipient.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
              ) : (
                <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight text-sm md:text-base leading-tight">
                  {isAiMode ? 'AI Assistant' : selectedRecipient?.displayName}
              </h3>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></span>
                <span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black tracking-widest truncate max-w-[100px] md:max-w-none">Live Connection</span>
              </div>
            </div>
          </div>
          <button className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="relative mb-6">
                {isAiMode ? (
                  <div className="bg-primary/10 p-6 rounded-[40px] shadow-2xl shadow-primary/20">
                    <Bot className="w-20 h-20 text-primary" />
                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="bg-white/5 p-6 rounded-[40px] shadow-2xl">
                    <MessageSquare className="w-20 h-20 text-slate-600" />
                  </div>
                )}
              </div>
              <h4 className="text-xl font-bold text-white">{isAiMode ? 'How can I assist you?' : 'Start the conversation'}</h4>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed font-medium">
                {isAiMode 
                  ? "Ask me about stock levels, recent transactions, or how to use the admin tools. I'm here 24/7." 
                  : "Send a secure message to start collaborating with your teammate in real-time."}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[85%] space-y-2",
                msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg",
                msg.senderId === user.uid 
                  ? "bg-primary text-white rounded-tr-none shadow-primary/10 font-medium" 
                  : msg.isAi 
                    ? "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none"
                    : "bg-white/5 text-slate-200 rounded-tl-none border border-white/5"
              )}>
                {msg.audioUrl ? (
                  <div className="flex flex-col space-y-2 py-1 min-w-[200px]">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-3 h-3 text-white/60" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Voice Message</span>
                    </div>
                    <audio 
                      src={msg.audioUrl} 
                      controls 
                      className="h-8 w-full max-w-[240px] [&::-webkit-media-controls-enclosure]:bg-white/10 [&::-webkit-media-controls-panel]:bg-transparent" 
                    />
                  </div>
                ) : msg.content}
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter px-2">{formatDate(msg.createdAt)}</span>
            </div>
          ))}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-3 text-primary bg-primary/10 px-5 py-3 rounded-2xl w-fit shadow-lg shadow-primary/5"
            >
              <div className="flex space-x-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase">MasterAI Thinking</span>
            </motion.div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center space-x-4 bg-red-500/10 p-3 rounded-3xl border border-red-500/20 shadow-xl"
              >
                <div className="flex items-center space-x-3 flex-1 px-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-500 font-mono">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-red-500/60 uppercase font-black tracking-widest">Recording Voice Message...</span>
                </div>
                <button 
                  onClick={cancelRecording}
                  className="p-3 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSendVoice}
                  className="p-3 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
                >
                  <Square className="w-5 h-5 fill-current" />
                </button>
              </motion.div>
            ) : (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleSendMessage} 
                className="flex items-center space-x-3 bg-white/5 p-2 rounded-3xl border border-white/10 shadow-xl focus-within:ring-2 focus-within:ring-primary/30 transition-all"
              >
                <input 
                  type="text" 
                  placeholder={isAiMode ? "Ask Assistant anything... (e.g., Show me low stock items)" : `Type a message to ${selectedRecipient?.displayName?.split(' ')[0]}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!isAiMode && !selectedRecipient}
            className="flex-1 px-4 py-2 border-none bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
                />
                <VoiceLanguageSelector 
                  currentLang={currentLang} 
                  onLangChange={setCurrentLang} 
                />
                <button
                  type="button"
                  onClick={startListening}
                  disabled={!isAiMode && !selectedRecipient}
                  title="Speech to Text"
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-slate-500 hover:bg-white/10"
                  )}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading || (!isAiMode && !selectedRecipient)}
                  title="Voice Message"
                  className="p-2 text-slate-500 hover:bg-white/10 rounded-xl transition-all"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || loading || (!isAiMode && !selectedRecipient)}
                  className="p-3 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
