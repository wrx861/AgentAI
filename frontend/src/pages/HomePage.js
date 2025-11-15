import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Code2, TestTube, FileCode, Github, Settings } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!prompt.trim()) {
      toast.error("Введите описание проекта");
      return;
    }

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="app-title">Emergent Clone</h1>
          </div>
          <div className="flex gap-4">
            <Button
              data-testid="dashboard-nav-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              Проекты
            </Button>
            <Button
              data-testid="settings-nav-btn"
              onClick={() => navigate('/settings')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-16 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Автоматическая генерация проектов с AI</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Создавайте проекты<br />за секунды
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Опишите свою идею, и AI-агенты сгенерируют, протестируют и задеплоят ваш проект автоматически
            </p>
          </div>

          {/* Prompt input section */}
          <div className="mb-16 fade-in" style={{animationDelay: '0.2s'}}>
            <div className="glass-effect rounded-2xl p-8 shadow-2xl">
              <label className="block text-sm font-medium mb-3 text-gray-300">
                Опишите свой проект
              </label>
              <Textarea
                data-testid="project-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Например: Создай веб-приложение для управления задачами с авторизацией и базой данных..."
                className="min-h-[150px] bg-black/30 border-white/10 text-white placeholder:text-gray-500 resize-none text-base"
              />
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-400">
                  <span className="text-blue-400 font-medium">{prompt.length}</span> символов
                </p>
                <Button
                  data-testid="create-project-btn"
                  onClick={handleCreate}
                  disabled={loading || !prompt.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-6 text-lg font-medium rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Создание...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Создать проект
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 fade-in" style={{animationDelay: '0.4s'}}>
            <div className="glass-effect rounded-xl p-6 hover:bg-white/10 transition-all duration-300" data-testid="feature-generation">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Генерация кода</h3>
              <p className="text-sm text-gray-400">
AI-агент автоматически генерирует код и структуру проекта
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 hover:bg-white/10 transition-all duration-300" data-testid="feature-testing">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
                <TestTube className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Автотестирование</h3>
              <p className="text-sm text-gray-400">
Проверка кода на ошибки в sandbox-среде перед сохранением
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 hover:bg-white/10 transition-all duration-300" data-testid="feature-deploy">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Деплой в GitHub</h3>
              <p className="text-sm text-gray-400">
Автоматический push в репозиторий после успешных тестов
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}