import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Menu, 
  Coins, 
  Gift, 
  Twitter,
  PiggyBank,
  CalendarCheck,
  Paperclip,
  Settings,
  Mic,
  ArrowRight,
  X,
  CheckCircle2,
  Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState("input"); // input, clarifying, confirmed
  const [clarifications, setClarifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInitialSubmit = async (customPrompt) => {
    const finalPrompt = customPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error("Введите описание проекта");
      return;
    }

    setLoading(true);
    setStep("clarifying");
    
    try {
      // Генерируем уточняющие вопросы
      const mockClarifications = [
        {
          question: "Какой стек технологий предпочитаете?",
          options: ["React + FastAPI + MongoDB", "Next.js + Node.js + PostgreSQL", "Vue + Django + MySQL"]
        },
        {
          question: "Нужна ли аутентификация пользователей?",
          options: ["Да, с JWT токенами", "Да, через OAuth (Google/GitHub)", "Нет, не требуется"]
        },
        {
          question: "Какой дизайн предпочитаете?",
          options: ["Минималистичный", "Современный с анимациями", "Классический"]
        },
        {
          question: "Нужны ли дополнительные функции?",
          options: ["Поиск и фильтры", "Экспорт данных", "Уведомления", "Ничего дополнительно"]
        }
      ];
      
      setClarifications(mockClarifications);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка обработки запроса");
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndCreate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/projects`, { prompt });
      toast.success("Проект создан! Генерация начата...");
      navigate(`/project/${response.data.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка создания проекта");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep("input");
    setClarifications([]);
  };

  const quickActions = [
    { 
      icon: <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: "Clone X",
      prompt: "Создай клон социальной сети X (Twitter) с постами, лайками и подписками"
    },
    { 
      icon: <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />,
      label: "Budget Planner",
      prompt: "Создай приложение для управления личным бюджетом с категориями расходов и статистикой"
    },
    { 
      icon: <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />,
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
      <header className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
          onClick={() => navigate('/dashboard')}
          data-testid="menu-btn"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm font-medium text-yellow-400">98.92</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => navigate('/settings')}
            data-testid="settings-btn"
          >
            <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 sm:px-6 py-6 sm:py-12 max-w-4xl mx-auto">
        {step === "input" && (
          <>
            {/* Welcome Message */}
            <div className="text-center mb-8 sm:mb-12">
              <div 
                className="text-sm sm:text-xl mb-3 sm:mb-4 tracking-[0.2em] sm:tracking-[0.3em] font-medium"
                style={{
                  color: '#00ff88',
                  textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
                  fontFamily: 'monospace',
                }}
              >
                WELCOME, USER
              </div>
              <h1 
                className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-8 px-4"
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  data-testid={`quick-action-${idx}`}
                  onClick={() => {
                    setPrompt(action.prompt);
                    handleInitialSubmit(action.prompt);
                  }}
                  disabled={loading}
                  className="group relative px-2 sm:px-4 py-4 sm:py-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: '0 4px 24px rgba(0, 212, 255, 0.05)'
                  }}
                >
                  <div className="flex flex-col items-center gap-2 sm:gap-3">
                    <div 
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{
                        boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)'
                      }}
                    >
                      {action.icon}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition-colors text-center">
                      {action.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Main Input Area */}
            <div className="relative mb-4 sm:mb-6">
              <Textarea
                data-testid="prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Build me a dashboard for..."
                disabled={loading}
                className="min-h-[120px] sm:min-h-[160px] bg-black/40 border-2 border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 text-white placeholder:text-gray-500 resize-none text-base sm:text-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-sm transition-all disabled:opacity-50"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 212, 255, 0.08)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleInitialSubmit(null);
                  }
                }}
              />
            </div>

            {/* Input Controls */}
            <div className="flex items-center justify-between px-2 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 sm:h-10 sm:w-10"
                  data-testid="attach-btn"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm font-medium text-cyan-400">E-1</span>
                  <span className="text-gray-500">▼</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 sm:h-10 sm:w-10"
                  data-testid="settings-input-btn"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 sm:h-10 sm:w-10"
                  data-testid="voice-btn"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
              
              <Button
                onClick={() => handleInitialSubmit(null)}
                disabled={loading || !prompt.trim()}
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  boxShadow: '0 4px 24px rgba(0, 212, 255, 0.4)'
                }}
                data-testid="submit-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Helper Text */}
            <div className="text-center mt-6 sm:mt-8">
              <p className="text-xs sm:text-sm text-gray-500">
                Нажмите <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs">Cmd/Ctrl + Enter</kbd> для быстрой отправки
              </p>
            </div>
          </>
        )}

        {step === "clarifying" && (
          <div className="fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Уточнение деталей</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Original Prompt */}
            <Card className="glass-effect border-white/10 p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Ваш запрос:</p>
              <p className="text-white">{prompt}</p>
            </Card>

            {/* Clarification Questions */}
            <div className="space-y-4 mb-6">
              {clarifications.map((item, idx) => (
                <Card key={idx} className="glass-effect border-white/10 p-4">
                  <p className="text-white font-medium mb-3">{item.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.options.map((option, optIdx) => (
                      <button
                        key={optIdx}
                        className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 text-left text-sm text-gray-300 hover:text-white transition-all"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                Отмена
              </Button>
              <Button
                onClick={handleConfirmAndCreate}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Подтвердить и создать
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}