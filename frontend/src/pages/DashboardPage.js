import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Trash2, RotateCw, Clock, Folder } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка загрузки проектов");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`${API}/projects/${deleteId}`);
      toast.success("Проект удален");
      setProjects(projects.filter(p => p.id !== deleteId));
    } catch (error) {
      console.error(error);
      toast.error("Ошибка удаления проекта");
    } finally {
      setDeleteId(null);
    }
  };

  const handleRegenerate = async (projectId) => {
    try {
      await axios.post(`${API}/projects/${projectId}/regenerate`);
      toast.success("Перегенерация начата");
      loadProjects();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка перегенерации");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      creating: { label: "Создание", class: "status-creating" },
      testing: { label: "Тестирование", class: "status-testing" },
      ready: { label: "Готов", class: "status-ready" },
      deployed: { label: "Задеплоен", class: "status-deployed" },
      failed: { label: "Ошибка", class: "status-failed" },
    };

    const statusInfo = statusMap[status] || statusMap.ready;
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-to-home-btn"
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold">Мои проекты</h1>
          </div>
          <Button
            data-testid="refresh-projects-btn"
            onClick={loadProjects}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>

        {/* Projects grid */}
        {projects.length === 0 ? (
          <Card className="glass-effect border-white/10 p-12 text-center" data-testid="no-projects-message">
            <Folder className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-300">Нет проектов</h2>
            <p className="text-gray-400 mb-6">Создайте свой первый проект!</p>
            <Button
              data-testid="create-first-project-btn"
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Создать проект
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                data-testid={`project-card-${project.id}`}
                className="glass-effect border-white/10 p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1" data-testid={`project-name-${project.id}`}>
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2" data-testid={`project-description-${project.id}`}>
                      {project.description}
                    </p>
                  </div>
                  {getStatusBadge(project.status.status)}
                </div>

                {/* Progress bar */}
                {project.status.status === 'creating' || project.status.status === 'testing' ? (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>{project.status.message}</span>
                      <span>{project.status.progress}%</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${project.status.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">{project.status.message}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      <span data-testid={`project-files-count-${project.id}`}>{project.files_count} файлов</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      data-testid={`regenerate-project-btn-${project.id}`}
                      onClick={() => handleRegenerate(project.id)}
                      size="sm"
                      variant="ghost"
                      className="hover:bg-white/10"
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                    <Button
                      data-testid={`delete-project-btn-${project.id}`}
                      onClick={() => setDeleteId(project.id)}
                      size="sm"
                      variant="ghost"
                      className="hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-effect border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Это действие нельзя отменить. Все файлы и история будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 hover:bg-white/10">Отмена</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-btn"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}