import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Sparkles, 
  Menu, 
  Coins, 
  Gift, 
  Twitter,
  PiggyBank,
  CalendarCheck,
  Paperclip,
  Settings,
  Mic,
  ArrowRight
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (customPrompt) => {
    const finalPrompt = customPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error("Введите описание проекта");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/projects`, { prompt: finalPrompt });
      toast.success("Проект создан! Генерация начата...");
      navigate(`/project/${response.data.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка создания проекта");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      icon: <Twitter className="w-5 h-5" />,
      label: "Clone X",
      prompt: "Создай клон социальной сети X (Twitter) с постами, лайками и подписками"
    },
    { 
      icon: <PiggyBank className="w-5 h-5 text-green-400" />,
      label: "Budget Planner",
      prompt: "Создай приложение для управления личным бюджетом с категориями расходов и статистикой"
    },
    { 
      icon: <CalendarCheck className="w-5 h-5 text-orange-400" />,
      label: "Consult Plus",
      prompt: "Создай систему онлайн-консультаций с записью на приём и видеозвонками"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Top Bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-white/10"
          onClick={() => navigate('/dashboard')}
          data-testid="menu-btn"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">98.92</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/settings')}
            data-testid="settings-btn"
          >
            <Gift className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12 max-w-4xl mx-auto">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <div 
            className="text-xl mb-4 tracking-[0.3em] font-medium"
            style={{
              color: '#00ff88',
              textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
              fontFamily: 'monospace',
              letterSpacing: '0.3em'
            }}
          >
            WELCOME, USER
          </div>
          <h1 
            className="text-5xl sm:text-6xl font-bold mb-8"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            data-testid="main-heading"
          >
            What will you build today?
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              data-testid={`quick-action-${idx}`}
              onClick={() => handleCreate(action.prompt)}
              disabled={loading}
              className="group relative px-4 py-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 4px 24px rgba(0, 212, 255, 0.05)'
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{
                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)'
                  }}
                >
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  {action.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Input Area */}
        <div className="relative mb-6">
          <Textarea
            data-testid="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Build me a dashboard for..."
            disabled={loading}
            className="min-h-[160px] bg-black/40 border-2 border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 text-white placeholder:text-gray-500 resize-none text-lg p-6 rounded-3xl backdrop-blur-sm transition-all disabled:opacity-50"
            style={{
              boxShadow: '0 8px 32px rgba(0, 212, 255, 0.08)'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCreate(null);
              }
            }}
          />
        </div>

        {/* Input Controls */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
              data-testid="attach-btn"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm font-medium text-cyan-400">E-1</span>
              <span className="text-gray-500">▼</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
              data-testid="settings-input-btn"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
              data-testid="voice-btn"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </div>
          
          <Button
            onClick={() => handleCreate(null)}
            disabled={loading || !prompt.trim()}
            size="icon"
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow: '0 4px 24px rgba(0, 212, 255, 0.4)'
            }}
            data-testid="submit-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Helper Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Нажмите <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs">Cmd/Ctrl + Enter</kbd> для быстрой отправки
          </p>
        </div>
      </main>

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}