import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  FileCode, 
  Terminal, 
  CheckCircle2, 
  Loader2,
  TestTube,
  AlertCircle,
  Code2,
  Menu
} from "lucide-react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-json";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [showFilesSidebar, setShowFilesSidebar] = useState(false);
  const [showLogsSidebar, setShowLogsSidebar] = useState(true);
  const logsEndRef = useRef(null);

  useEffect(() => {
    loadProject();
    loadFiles();
    loadLogs();
    
    const socketConnection = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    
    socketConnection.on('connect', () => {
      console.log('WebSocket connected');
      socketConnection.emit('join_project', { project_id: id });
    });
    
    socketConnection.on('status', (data) => {
      setProject(prev => prev ? {
        ...prev,
        status: {
          status: data.status,
          progress: data.progress,
          message: data.message,
          current_step: data.current_step || prev.status.current_step
        }
      } : null);
    });
    
    socketConnection.on('log', (data) => {
      setLogs(prev => [{
        agent: data.agent,
        level: data.level,
        message: data.message,
        details: data.details,
        created_at: data.timestamp
      }, ...prev]);
    });
    
    socketConnection.on('file_created', (data) => {
      loadFiles();
      toast.success(`Создан файл: ${data.path}`);
    });
    
    setSocket(socketConnection);
    
    return () => {
      socketConnection.disconnect();
    };
  }, [id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

  const handleFileClick = (file) => {
    setSelectedFile(file);
    if (window.innerWidth < 1024) {
      setShowFilesSidebar(false);
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

  const getLanguageClass = (language) => {
    const langMap = {
      'python': 'language-python',
      'javascript': 'language-javascript',
      'typescript': 'language-typescript',
      'jsx': 'language-jsx',
      'json': 'language-json',
      'markdown': 'language-markdown',
      'text': 'language-text'
    };
    return langMap[language] || 'language-text';
  };

  const getLogIcon = (level) => {
    if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (level === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      creating: 'text-blue-400',
      testing: 'text-yellow-400',
      ready: 'text-green-400',
      failed: 'text-red-400',
      deployed: 'text-purple-400'
    };
    return colors[status] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Проект не найден</h2>
          <Button onClick={() => navigate('/dashboard')}>Вернуться к проектам</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Mobile Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-bold truncate max-w-[200px] sm:max-w-none">{project.name}</h1>
              <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-none">{project.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilesSidebar(!showFilesSidebar)}
              size="icon"
              variant="ghost"
              className="lg:hidden text-gray-400 hover:text-white h-9 w-9"
            >
              <FileCode className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setShowLogsSidebar(!showLogsSidebar)}
              size="icon"
              variant="ghost"
              className="lg:hidden text-gray-400 hover:text-white h-9 w-9"
            >
              <Terminal className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleTest}
              size="sm"
              variant="outline"
              className="hidden sm:flex border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400 text-xs"
            >
              <TestTube className="w-4 h-4 mr-1" />
              Тест
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {(project.status.status === 'creating' || project.status.status === 'testing') && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <span className={`font-medium ${getStatusColor(project.status.status)} truncate max-w-[60%]`}>
                {project.status.current_step || project.status.message}
              </span>
              <span className="text-gray-400">{project.status.progress}%</span>
            </div>
            <div className="h-1.5 sm:h-2 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                style={{ width: `${project.status.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Files Sidebar - Mobile Overlay */}
        {showFilesSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFilesSidebar(false)}
          />
        )}
        
        {/* Files Sidebar */}
        <div className={`
          ${showFilesSidebar ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          z-50 lg:z-0
          w-72 sm:w-80
          border-r border-white/10 bg-[#0a0a0f]
          transition-transform duration-300
          h-full
        `}>
          <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Файлы ({files.length})
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setShowFilesSidebar(false)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-2">
              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">Файлы генерируются...</p>
                </div>
              ) : (
                files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm transition-all mb-1 ${
                      selectedFile?.id === file.id
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {file.language} • {(file.content?.length || 0)} символов
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20">
                <h3 className="font-medium text-sm sm:text-base truncate">{selectedFile.path}</h3>
                <p className="text-xs text-gray-500">{selectedFile.language}</p>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 sm:p-6 text-xs sm:text-sm" style={{ margin: 0 }}>
                  <code 
                    className={getLanguageClass(selectedFile.language)}
                    dangerouslySetInnerHTML={{
                      __html: Prism.highlight(
                        selectedFile.content || '',
                        Prism.languages[selectedFile.language] || Prism.languages.text,
                        selectedFile.language
                      )
                    }}
                  />
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center px-4">
                <FileCode className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-30" />
                <p className="text-sm sm:text-base">Выберите файл для просмотра</p>
                <Button
                  onClick={() => setShowFilesSidebar(true)}
                  className="mt-4 lg:hidden"
                  size="sm"
                >
                  Открыть файлы
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Logs Sidebar - Mobile Overlay */}
        {showLogsSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowLogsSidebar(false)}
          />
        )}

        {/* Logs Sidebar */}
        <div className={`
          ${showLogsSidebar ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          right-0
          z-50 lg:z-0
          w-80 sm:w-96
          border-l border-white/10 bg-[#0a0a0f]
          transition-transform duration-300
          h-full
        `}>
          <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Логи агентов
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setShowLogsSidebar(false)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">Логи появятся здесь</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={`${log.created_at}-${idx}`}
                    className="p-3 rounded-lg bg-black/30 border border-white/5"
                  >
                    <div className="flex items-start gap-2">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-400">
                            {log.agent}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 break-words">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}