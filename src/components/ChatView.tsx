import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, MessageSquare, Send, Mic, MicOff, Volume2, 
  VolumeX, HelpCircle, Loader2, BookOpen, AlertCircle, FileText
} from 'lucide-react';
import { ChatMessage, DocumentMetadata } from '../types';
import { getApiUrl } from '../utils';

interface ChatViewProps {
  document: DocumentMetadata;
  userEmail: string;
  onNavigateHome: () => void;
}

export default function ChatView({ document, userEmail, onNavigateHome }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Hello! I've fully parsed **${document.name}** and indexed its contents. Ask me anything, or try testing me on specific sections using the microphones or search box!`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState('');
  
  // Voice Input (Speech to Text) states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Audio Playback (Text to Speech) states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Check Speech Recognition capability
    const SpeechLib = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechLib) {
      const rec = new SpeechLib();
      rec.continuous = false;
      rec.lang = 'en-US';
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert("Voice Speech Recognition is not supported by your current browser profile.");
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      setErrorHeader('');
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start voice capture:", err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorHeader('');
    const userQuery = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/study/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail
        },
        body: JSON.stringify({
          documentId: document.id,
          message: userQuery,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "RAG Search process failed.");
      }

      const modelMsg: ChatMessage = {
        id: 'bot_' + Math.random().toString(36).slice(2, 9),
        role: 'model',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources || []
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorHeader(err.message || 'Failed to search details.');
    } finally {
      setLoading(false);
    }
  };

  // Convert text to speech via Server Gemini TTS
  const handleTTS = async (messageId: string, textToSpeak: string) => {
    // If already playing this message, stop it
    if (playingId === messageId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    // Stop currently playing if any
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setPlayingId(messageId);

    try {
      const response = await fetch(getApiUrl('/api/study/voice-tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "TTS failed");
      }

      const audioStr = `data:audio/wav;base64,${data.base64Audio}`;
      const audio = new Audio(audioStr);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        alert("Audio speech rendering failed in browser.");
        setPlayingId(null);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err: any) {
      console.error("Speech output failed:", err);
      alert(`Voice synthesization crashed: ${err.message}`);
      setPlayingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)] max-h-[850px]" id="chat-view-root">
      
      {/* Left sidebar: back link, document details panel */}
      <div className="lg:col-span-3 flex flex-col justify-between" id="chat-sidebar-left">
        <div className="space-y-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-slate-800 rounded-xl w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Loaded Resource</span>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-white text-sm leading-snug break-all line-clamp-3">
                {document.name}
              </h3>
              <p className="text-[10px] text-slate-400">
                OCR Parsing: {document.textLength ? `${document.textLength.toLocaleString()} characters` : '0 chars'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                RAG Context Chunking: Answers are retrieved directly from the document. Simply speak or search your prompt concepts!
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="bg-slate-800/15 border border-slate-700/40 rounded-2xl p-4 hidden lg:block space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suggested Questions</span>
          <button 
            onClick={() => setInput("What are the key takeaways from this material?")}
            className="w-full text-left text-xs bg-slate-900/60 hover:bg-slate-800 p-2 rounded-lg text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            "What are the key takeaways?"
          </button>
          <button 
            onClick={() => setInput("Can you list and define the most important terms introduced?")}
            className="w-full text-left text-xs bg-slate-900/60 hover:bg-slate-800 p-2 rounded-lg text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            "Define the most important terms?"
          </button>
        </div>
      </div>

      {/* Right column: Interactive RAG Chat Window */}
      <div className="lg:col-span-9 bg-slate-800/25 border border-slate-700/60 rounded-3xl flex flex-col overflow-hidden shadow-xl" id="chat-main-window">
        {/* Chat Header */}
        <div className="border-b border-slate-700/50 py-4 px-6 bg-slate-900/40 flex items-center justify-between" id="chat-header">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex items-center justify-center">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Ask AI Study Buddy</h2>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> RAG Engine Live
              </span>
            </div>
          </div>
          {recognition && (
            <span className="text-[10px] text-slate-400 hidden sm:inline-flex items-center gap-1 py-1 px-2.5 bg-slate-800 rounded-full border border-slate-700">
              🎤 Voice Input Enabled
            </span>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }} id="message-container">
          {errorHeader && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center space-x-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{errorHeader}</span>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
              id={`chat-bubble-${msg.id}`}
            >
              {/* Outer bubble style */}
              <div
                className={`p-4 rounded-2.5xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                }`}
              >
                {/* Paragraph Content */}
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  {msg.content.split('\n').map((para, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{para}</p>
                  ))}
                </div>

                {/* Speaker Voice button on AI replies */}
                {msg.role === 'model' && (
                  <div className="flex justify-end pt-2 border-t border-slate-700/50 mt-3 align-middle gap-1.5">
                    <button
                      onClick={() => handleTTS(msg.id, msg.content)}
                      className={`text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        playingId === msg.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {playingId === msg.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          <span>Speak Out Loud</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Timestamp / sources info */}
              <div className="flex items-center space-x-2 mt-1 px-1.5">
                <span className="text-[10px] text-slate-500">
                  {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sources && msg.sources.length > 0 && (
                  <details className="text-[10px] text-indigo-400 group cursor-pointer">
                    <summary className="hover:underline list-none flex items-center gap-1 select-none">
                      • <span>View sources ({msg.sources.length})</span>
                    </summary>
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl mt-1.5 space-y-2 text-slate-400 max-w-sm shrink break-normal shadow-2xl relative z-10 select-text">
                      {msg.sources.map((src, sIdx) => (
                        <p key={sIdx} className="border-b border-slate-800/50 pb-1.5 last:border-b-0">
                          {src}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 bg-slate-800/40 border border-slate-700/50 p-4 rounded-2.5xl mr-auto max-w-[85%] self-start text-slate-400 text-xs shadow-md" id="chat-loading-indicator">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Scanning PDF contextual segments and formulating helper reply...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSend} className="p-4 bg-slate-900/40 border-t border-slate-700/50" id="chat-form">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2" id="chat-input-wrapper">
            
            {/* Speech Recognition Micro toggle */}
            {recognition ? (
              <button
                type="button"
                onClick={toggleRecording}
                id="mic-recognition-btn"
                className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isRecording 
                    ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'
                }`}
                title={isRecording ? "Stop recording voice input" : "Activate Voice Speech question input"}
              >
                {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="p-2 bg-slate-850 rounded-xl text-slate-600 cursor-not-allowed shrink-0"
                title="Microphone input not available in this browser configuration"
              >
                <MicOff className="h-4.5 w-4.5" />
              </button>
            )}

            <input
              id="message-text-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening closely... Speak now!" : "Ask. e.g. Summarize the major formulas..."}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              disabled={loading}
              autoComplete="off"
            />

            <button
              id="send-message-btn"
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-indigo-600/10"
              title="Submit search query"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {isRecording && (
            <p className="text-[10px] text-rose-400 text-center animate-pulse pt-2 font-medium">
              🔴 Active Recording Stream: Start talking, text will show in input below...
            </p>
          )}
        </form>
      </div>

    </div>
  );
}
