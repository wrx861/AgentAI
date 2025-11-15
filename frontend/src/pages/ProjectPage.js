import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, FileCode, History, Terminal, Settings, TestTube, Github, Save, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [deployDialog, setDeployDialog] = useState(false);
  const [repoName, setRepoName] = useState("");

  useEffect(() => {
    loadProject();
    loadFiles();
    loadLogs();
    loadVersions();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadProject();
      loadLogs();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка загрузки проекта");
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadVersions = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}/versions`);
      setVersions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setEditedContent(file.content);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;

    try {
      await axios.put(`${API}/files/${selectedFile.id}`, {
        content: editedContent
      });
      toast.success("Файл сохранен");
      loadFiles();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка сохранения файла");
    }
  };

  const handleTest = async () => {
    try {
      await axios.post(`${API}/projects/${id}/test`);
      toast.success("Тестирование запущено");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка запуска тестов");
    }
  };

  const handleDeploy = async () => {
    if (!repoName.trim()) {
      toast.error("Введите имя репозитория");
      return;
    }

    try {
      await axios.post(`${API}/projects/${id}/deploy?repo_name=${repoName}`);
      toast.success("Деплой запущен");
      setDeployDialog(false);
      setRepoName("");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Ошибка деплоя");
    }
  };

  const getLogIcon = (level) => {
    const icons = {
      info: <span className="text-blue-400">ℹ️</span>,
      warning: <span className="text-yellow-400">⚠️</span>,
      error: <span className="text-red-400">❌</span>,
    };
    return icons[level] || icons.info;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Проект не найден</h2>
          <Button onClick={() => navigate('/dashboard')}>Вернуться к проектам</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="project-name">{project.name}</h1>
              <p className="text-sm text-gray-400" data-testid="project-description">{project.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="test-project-btn"
              onClick={handleTest}
              variant="outline"
              className="border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Тест
            </Button>
            <Button
              data-testid="deploy-project-btn"
              onClick={() => setDeployDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Github className="w-4 h-4 mr-2" />
              Деплой
            </Button>
          </div>
        </div>

        {/* Status card */}
        <Card className="glass-effect border-white/10 p-4 mb-6" data-testid="project-status-card">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-400">Статус:</span>
              <span className="ml-2 font-medium" data-testid="project-status-text">{project.status.message}</span>
            </div>
            {(project.status.status === 'creating' || project.status.status === 'testing') && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400" data-testid="project-progress-text">{project.status.progress}%</span>
                <div className="w-48 h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    data-testid="project-progress-bar"
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${project.status.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Files sidebar */}
          <Card className="glass-effect border-white/10 p-4 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Файлы ({files.length})
            </h2>
            <ScrollArea className="h-[600px]">
              {files.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8" data-testid="no-files-message">
                  Файлы еще генерируются...
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      data-testid={`file-item-${file.id}`}
                      onClick={() => handleFileSelect(file)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedFile?.id === file.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-xs text-gray-500">{file.language}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Editor and tabs */}
          <Card className="glass-effect border-white/10 p-4 lg:col-span-2">
            <Tabs defaultValue="editor" className="h-full">
              <TabsList className="glass-effect border-white/10 mb-4">
                <TabsTrigger value="editor" data-testid="editor-tab">Редактор</TabsTrigger>
                <TabsTrigger value="logs" data-testid="logs-tab">Логи</TabsTrigger>
                <TabsTrigger value="versions" data-testid="versions-tab">Версии</TabsTrigger>
              </TabsList>

              {/* Editor tab */}
              <TabsContent value="editor" className="h-[600px]">
                {selectedFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium" data-testid="selected-file-name">{selectedFile.path}</h3>
                      <Button
                        data-testid="save-file-btn"
                        onClick={handleSaveFile}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                    </div>
                    <Textarea
                      data-testid="file-editor"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="flex-1 font-mono text-sm bg-black/30 border-white/10 resize-none"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400" data-testid="no-file-selected-message">
                    <div className="text-center">
                      <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Выберите файл для редактирования</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Logs tab */}
              <TabsContent value="logs">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8" data-testid="no-logs-message">Логов пока нет</p>
                    ) : (
                      logs.map((log) => (
                        <div
                          key={log.id}
                          data-testid={`log-entry-${log.id}`}
                          className="p-3 rounded-lg bg-black/30 border border-white/10"
                        >
                          <div className="flex items-start gap-2">
                            {getLogIcon(log.level)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-400">{log.agent}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(log.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">{log.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Versions tab */}
              <TabsContent value="versions">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {versions.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8" data-testid="no-versions-message">Версий пока нет</p>
                    ) : (
                      versions.map((version) => (
                        <div
                          key={version.id}
                          data-testid={`version-entry-${version.id}`}
                          className="p-4 rounded-lg bg-black/30 border border-white/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{version.message}</h4>
                            <span className="text-xs text-gray-500">
                              {new Date(version.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Автор: {version.created_by}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Deploy dialog */}
      <Dialog open={deployDialog} onOpenChange={setDeployDialog}>
        <DialogContent className="glass-effect border-white/20">
          <DialogHeader>
            <DialogTitle>Деплой в GitHub</DialogTitle>
            <DialogDescription className="text-gray-400">
              Введите имя репозитория для деплоя проекта
            </DialogDescription>
          </DialogHeader>
          <Input
            data-testid="repo-name-input"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="my-awesome-project"
            className="bg-black/30 border-white/10"
          />
          <DialogFooter>
            <Button
              data-testid="cancel-deploy-btn"
              variant="outline"
              onClick={() => setDeployDialog(false)}
              className="border-white/20 hover:bg-white/10"
            >
              Отмена
            </Button>
            <Button
              data-testid="confirm-deploy-btn"
              onClick={handleDeploy}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              Деплой
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}