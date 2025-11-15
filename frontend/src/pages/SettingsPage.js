import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Key, Github } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    github_token: "",
    llm_api_key: "",
    use_emergent_key: true,
    default_model: "gpt-4o"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings({
        github_token: response.data.github_token || "",
        llm_api_key: response.data.llm_api_key || "",
        use_emergent_key: response.data.use_emergent_key ?? true,
        default_model: response.data.default_model || "gpt-4o"
      });
    } catch (error) {
      console.error(error);
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Настройки сохранены");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold">Настройки</h1>
          </div>
        </div>

        {/* Settings cards */}
        <div className="space-y-6">
          {/* LLM Settings */}
          <Card className="glass-effect border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">LLM API</h2>
                <p className="text-sm text-gray-400">Настройки AI-моделей</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-black/30">
                <div>
                  <Label className="text-base font-medium">Использовать Emergent LLM Key</Label>
                  <p className="text-sm text-gray-400 mt-1">
                    Универсальный ключ для OpenAI, Anthropic и Google
                  </p>
                </div>
                <Switch
                  data-testid="use-emergent-key-switch"
                  checked={settings.use_emergent_key}
                  onCheckedChange={(checked) => setSettings({...settings, use_emergent_key: checked})}
                />
              </div>

              {!settings.use_emergent_key && (
                <div>
                  <Label htmlFor="llm-key">Собственный LLM API Key</Label>
                  <Input
                    id="llm-key"
                    data-testid="llm-api-key-input"
                    type="password"
                    value={settings.llm_api_key}
                    onChange={(e) => setSettings({...settings, llm_api_key: e.target.value})}
                    placeholder="sk-..."
                    className="mt-2 bg-black/30 border-white/10"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="model">Модель по умолчанию</Label>
                <Input
                  id="model"
                  data-testid="default-model-input"
                  value={settings.default_model}
                  onChange={(e) => setSettings({...settings, default_model: e.target.value})}
                  placeholder="gpt-4o"
                  className="mt-2 bg-black/30 border-white/10"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Доступны: gpt-4o, gpt-4o-mini, claude-3-7-sonnet-20250219, gemini-2.5-pro
                </p>
              </div>
            </div>
          </Card>

          {/* GitHub Settings */}
          <Card className="glass-effect border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Github className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">GitHub</h2>
                <p className="text-sm text-gray-400">Интеграция с GitHub</p>
              </div>
            </div>

            <div>
              <Label htmlFor="github-token">Personal Access Token</Label>
              <Input
                id="github-token"
                data-testid="github-token-input"
                type="password"
                value={settings.github_token}
                onChange={(e) => setSettings({...settings, github_token: e.target.value})}
                placeholder="ghp_..."
                className="mt-2 bg-black/30 border-white/10"
              />
              <p className="text-xs text-gray-500 mt-2">
                Создайте токен в{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  настройках GitHub
                </a>
              </p>
            </div>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              data-testid="save-settings-btn"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}