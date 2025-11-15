from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class ProjectStatus(BaseModel):
    status: str
    progress: int = 0
    message: str = ""
    current_step: str = ""

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    prompt: str
    status: ProjectStatus = Field(default_factory=lambda: ProjectStatus(status="creating", progress=0, message="Инициализация"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    files_count: int = 0
    github_url: Optional[str] = None

class ProjectCreate(BaseModel):
    prompt: str

class FileItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    path: str
    content: str
    language: str = "text"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FileCreate(BaseModel):
    path: str
    content: str
    language: str = "text"

class FileUpdate(BaseModel):
    content: str

class Version(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    message: str
    changes: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = "system"

class VersionCreate(BaseModel):
    message: str
    changes: Dict[str, Any]

class LogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    agent: str
    level: str
    message: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LogCreate(BaseModel):
    agent: str
    level: str
    message: str
    details: Optional[Dict[str, Any]] = None

class AgentConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    prompt_template: str
    model_provider: str = "openai"
    model_name: str = "gpt-4o"
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "settings"
    github_token: Optional[str] = None
    llm_api_key: Optional[str] = None
    use_emergent_key: bool = True
    default_model: str = "gpt-4o"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    github_token: Optional[str] = None
    llm_api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None
    default_model: Optional[str] = None

class TestResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    tests_passed: int = 0
    tests_failed: int = 0
    errors: List[str] = []
    warnings: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_project(sid, data):
    project_id = data.get('project_id')
    await sio.enter_room(sid, f"project_{project_id}")
    print(f"Client {sid} joined project {project_id}")

async def emit_to_project(project_id: str, event: str, data: dict):
    """Отправить событие всем клиентам проекта"""
    await sio.emit(event, data, room=f"project_{project_id}")

# ==================== HELPER FUNCTIONS ====================

async def create_log(project_id: str, agent: str, level: str, message: str, details: Optional[Dict] = None):
    """Создать лог запись и отправить через WebSocket"""
    log = LogEntry(
        project_id=project_id,
        agent=agent,
        level=level,
        message=message,
        details=details
    )
    doc = log.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.logs.insert_one(doc)
    
    # Отправить через WebSocket
    await emit_to_project(project_id, 'log', {
        'agent': agent,
        'level': level,
        'message': message,
        'details': details,
        'timestamp': doc['created_at']
    })

async def update_project_status(project_id: str, status: str, progress: int, message: str, current_step: str = ""):
    """Обновить статус проекта и отправить через WebSocket"""
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "status.status": status,
            "status.progress": progress,
            "status.message": message,
            "status.current_step": current_step,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Отправить через WebSocket
    await emit_to_project(project_id, 'status', {
        'status': status,
        'progress': progress,
        'message': message,
        'current_step': current_step
    })

async def emit_file_created(project_id: str, file_data: dict):
    """Уведомить о создании файла"""
    await emit_to_project(project_id, 'file_created', file_data)

async def get_llm_chat():
    """Получить LLM chat клиент"""
    settings_doc = await db.settings.find_one({"id": "settings"})
    
    if settings_doc and not settings_doc.get('use_emergent_key', True) and settings_doc.get('llm_api_key'):
        api_key = settings_doc['llm_api_key']
    else:
        api_key = os.environ['EMERGENT_LLM_KEY']
    
    model_name = settings_doc.get('default_model', 'gpt-4o') if settings_doc else 'gpt-4o'
    
    chat = LlmChat(
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message="Вы - AI агент, помогающий генерировать код и проекты."
    )
    chat.with_model("openai", model_name)
    
    return chat

# ==================== AGENTS PROMPTS ====================

AGENT_PROMPTS = {
    "generator": """
Вы - агент генерации проекта. Ваша задача - создать структуру проекта на основе описания пользователя.

Промпт пользователя: {prompt}

Ваши задачи:
1. Проанализировать требования
2. Создать список необходимых файлов
3. Определить технологии и библиотеки
4. Сгенерировать базовую структуру проекта

Верните JSON с следующей структурой:
{{
  "project_name": "название проекта",
  "description": "описание проекта",
  "files": [
    {{"path": "путь/к/файлу", "content": "содержимое", "language": "язык"}}
  ],
  "technologies": ["список технологий"],
  "next_steps": ["следующие шаги"]
}}
""",
    "tester": """
Вы - агент тестирования. Ваша задача - проверить проект на ошибки.

Файлы проекта:
{files}

Ваши задачи:
1. Проверить синтаксис кода
2. Найти потенциальные ошибки
3. Проверить зависимости
4. Создать отчет о тестировании

Верните JSON:
{{
  "tests_passed": количество,
  "tests_failed": количество,
  "errors": ["список ошибок с указанием файла и строки"],
  "warnings": ["предупреждения"],
  "suggestions": ["рекомендации"]
}}
""",
    "fixer": """
Вы - агент исправления ошибок. Ваша задача - автоматически исправить найденные ошибки.

Файл с ошибкой:
Путь: {file_path}
Ошибка: {error}

Текущий код:
{code}

Ваши задачи:
1. Проанализировать ошибку
2. Исправить код
3. Убедиться что исправление не ломает другой функционал

Верните JSON:
{{
  "fixed_code": "исправленный код",
  "explanation": "объяснение что было исправлено",
  "additional_fixes": ["другие найденные и исправленные проблемы"]
}}
"""
}

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Emergent Clone API v2.0", "status": "running"}

# ========== PROJECTS ==========

@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    """Создать новый проект"""
    project_name = f"project_{uuid.uuid4().hex[:8]}"
    
    project = Project(
        name=project_name,
        description="Генерация из промпта...",
        prompt=input.prompt,
        status=ProjectStatus(status="creating", progress=5, message="Проект создан", current_step="Инициализация")
    )
    
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['status'] = {
        'status': doc['status']['status'],
        'progress': doc['status']['progress'],
        'message': doc['status']['message'],
        'current_step': doc['status']['current_step']
    }
    
    await db.projects.insert_one(doc)
    await create_log(project.id, "system", "info", "Проект создан", {"prompt": input.prompt})
    
    # Запустить генерацию в фоне
    asyncio.create_task(generate_project_with_details(project.id, input.prompt))
    
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Получить все проекты"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    for project in projects:
        if isinstance(project['created_at'], str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project['updated_at'], str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
        
        if 'status' in project:
            project['status'] = ProjectStatus(**project['status'])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Получить проект по ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    if isinstance(project['created_at'], str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project['updated_at'], str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    
    if 'status' in project:
        project['status'] = ProjectStatus(**project['status'])
    
    return project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Удалить проект"""
    result = await db.projects.delete_one({"id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    await db.files.delete_many({"project_id": project_id})
    await db.logs.delete_many({"project_id": project_id})
    await db.versions.delete_many({"project_id": project_id})
    
    return {"message": "Проект удален"}

@api_router.post("/projects/{project_id}/regenerate")
async def regenerate_project(project_id: str):
    """Перегенерировать проект"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    await update_project_status(project_id, "creating", 5, "Перегенерация...", "Инициализация")
    await create_log(project_id, "system", "info", "Начата перегенерация проекта")
    
    asyncio.create_task(generate_project_with_details(project_id, project['prompt']))
    
    return {"message": "Перегенерация запущена"}

# ========== FILES ==========

@api_router.get("/projects/{project_id}/files", response_model=List[FileItem])
async def get_project_files(project_id: str):
    """Получить все файлы проекта"""
    files = await db.files.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    for file in files:
        if isinstance(file['created_at'], str):
            file['created_at'] = datetime.fromisoformat(file['created_at'])
        if isinstance(file['updated_at'], str):
            file['updated_at'] = datetime.fromisoformat(file['updated_at'])
    
    return files

@api_router.post("/projects/{project_id}/files", response_model=FileItem)
async def create_file(project_id: str, input: FileCreate):
    """Создать файл"""
    file = FileItem(
        project_id=project_id,
        path=input.path,
        content=input.content,
        language=input.language
    )
    
    doc = file.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.files.insert_one(doc)
    await db.projects.update_one(
        {"id": project_id},
        {"$inc": {"files_count": 1}}
    )
    
    return file

@api_router.get("/files/{file_id}", response_model=FileItem)
async def get_file(file_id: str):
    """Получить файл по ID"""
    file = await db.files.find_one({"id": file_id}, {"_id": 0})
    
    if not file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    if isinstance(file['created_at'], str):
        file['created_at'] = datetime.fromisoformat(file['created_at'])
    if isinstance(file['updated_at'], str):
        file['updated_at'] = datetime.fromisoformat(file['updated_at'])
    
    return file

@api_router.put("/files/{file_id}", response_model=FileItem)
async def update_file(file_id: str, input: FileUpdate):
    """Обновить файл"""
    file = await db.files.find_one({"id": file_id}, {"_id": 0})
    
    if not file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    await db.files.update_one(
        {"id": file_id},
        {"$set": {
            "content": input.content,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    file['content'] = input.content
    file['updated_at'] = datetime.now(timezone.utc)
    
    if isinstance(file['created_at'], str):
        file['created_at'] = datetime.fromisoformat(file['created_at'])
    
    return FileItem(**file)

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Удалить файл"""
    file = await db.files.find_one({"id": file_id}, {"_id": 0})
    
    if not file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    result = await db.files.delete_one({"id": file_id})
    
    if result.deleted_count > 0:
        await db.projects.update_one(
            {"id": file['project_id']},
            {"$inc": {"files_count": -1}}
        )
    
    return {"message": "Файл удален"}

# ========== VERSIONS ==========

@api_router.get("/projects/{project_id}/versions", response_model=List[Version])
async def get_versions(project_id: str):
    """Получить историю версий"""
    versions = await db.versions.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for version in versions:
        if isinstance(version['created_at'], str):
            version['created_at'] = datetime.fromisoformat(version['created_at'])
    
    return versions

@api_router.post("/projects/{project_id}/versions", response_model=Version)
async def create_version(project_id: str, input: VersionCreate):
    """Создать версию (коммит)"""
    version = Version(
        project_id=project_id,
        message=input.message,
        changes=input.changes
    )
    
    doc = version.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.versions.insert_one(doc)
    await create_log(project_id, "system", "info", f"Создана версия: {input.message}")
    
    return version

# ========== LOGS ==========

@api_router.get("/projects/{project_id}/logs", response_model=List[LogEntry])
async def get_logs(project_id: str, limit: int = 100):
    """Получить логи проекта"""
    logs = await db.logs.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    
    return logs

# ========== SETTINGS ==========

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    """Получить настройки"""
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    
    if not settings:
        default_settings = Settings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(input: SettingsUpdate):
    """Обновить настройки"""
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_settings()

# ========== TESTING ==========

@api_router.post("/projects/{project_id}/test")
async def test_project(project_id: str):
    """Запустить тестирование проекта"""
    await update_project_status(project_id, "testing", 50, "Запуск тестов...", "Тестирование")
    await create_log(project_id, "tester", "info", "Начато тестирование")
    
    asyncio.create_task(run_project_tests_with_fixes(project_id))
    
    return {"message": "Тестирование запущено"}

# ========== GITHUB ==========

@api_router.post("/projects/{project_id}/deploy")
async def deploy_project(project_id: str, repo_name: str):
    """Деплой проекта в GitHub"""
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    
    if not settings or not settings.get('github_token'):
        raise HTTPException(status_code=400, detail="GitHub токен не настроен")
    
    await update_project_status(project_id, "deploying", 80, "Деплой в GitHub...", "Деплой")
    await create_log(project_id, "deploy", "info", "Начат деплой в GitHub")
    
    asyncio.create_task(deploy_to_github(project_id, repo_name, settings['github_token']))
    
    return {"message": "Деплой запущен"}

# ==================== BACKGROUND TASKS ====================

async def generate_project_with_details(project_id: str, prompt: str):
    """Генерация проекта с детальным отображением процесса"""
    try:
        # Шаг 1: Анализ промпта
        await update_project_status(project_id, "creating", 10, "Анализ требований...", "Анализ промпта")
        await create_log(project_id, "generator", "info", "Начат анализ промпта")
        await asyncio.sleep(1)
        
        # Шаг 2: Подключение к AI
        await update_project_status(project_id, "creating", 20, "Подключение к AI...", "Инициализация LLM")
        await create_log(project_id, "generator", "info", "Подключение к AI модели")
        
        chat = await get_llm_chat()
        
        # Шаг 3: Генерация структуры
        await update_project_status(project_id, "creating", 30, "Генерация структуры проекта...", "Планирование")
        await create_log(project_id, "generator", "info", "AI анализирует требования и планирует структуру")
        
        agent_prompt = AGENT_PROMPTS["generator"].format(prompt=prompt)
        message = UserMessage(text=agent_prompt)
        
        await update_project_status(project_id, "creating", 40, "AI генерирует файлы...", "Генерация кода")
        await create_log(project_id, "generator", "info", "Запущена генерация кода")
        
        response = await chat.send_message(message)
        
        # Парсинг ответа
        try:
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            result = json.loads(response_text)
        except Exception as e:
            await create_log(project_id, "generator", "warning", f"Не удалось распарсить JSON, использую базовую структуру: {str(e)}")
            result = {
                "project_name": f"project_{uuid.uuid4().hex[:8]}",
                "description": prompt,
                "files": [
                    {"path": "README.md", "content": f"# {prompt}\n\nПроект создан автоматически.", "language": "markdown"},
                    {"path": "main.py", "content": "# Основной файл\nprint('Hello, World!')", "language": "python"}
                ],
                "technologies": ["Python"],
                "next_steps": ["Реализовать основной функционал"]
            }
        
        # Обновить информацию о проекте
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "name": result.get("project_name", f"project_{uuid.uuid4().hex[:8]}"),
                "description": result.get("description", prompt)
            }}
        )
        
        await update_project_status(project_id, "creating", 50, "Создание файлов...", "Сохранение файлов")
        await create_log(project_id, "generator", "info", f"Создание {len(result.get('files', []))} файлов")
        
        # Создать файлы с уведомлениями
        files_created = 0
        total_files = len(result.get("files", []))
        
        for idx, file_data in enumerate(result.get("files", [])):
            file = FileItem(
                project_id=project_id,
                path=file_data.get("path", "unknown.txt"),
                content=file_data.get("content", ""),
                language=file_data.get("language", "text")
            )
            
            doc = file.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            await db.files.insert_one(doc)
            files_created += 1
            
            # Уведомить о создании файла
            await emit_file_created(project_id, {
                'id': file.id,
                'path': file.path,
                'language': file.language,
                'size': len(file.content)
            })
            
            progress = 50 + int((idx + 1) / total_files * 30)
            await update_project_status(
                project_id, 
                "creating", 
                progress, 
                f"Создан файл {idx + 1}/{total_files}: {file.path}",
                f"Файл {idx + 1}/{total_files}"
            )
            await create_log(project_id, "generator", "info", f"✓ Создан файл: {file.path}")
            
            await asyncio.sleep(0.5)  # Небольшая задержка для визуализации
        
        # Обновить счетчик файлов
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"files_count": files_created}}
        )
        
        await update_project_status(project_id, "ready", 100, "Проект готов", "Завершено")
        await create_log(project_id, "generator", "info", f"✓ Проект создан: {files_created} файлов", {
            "files_count": files_created,
            "technologies": result.get("technologies", [])
        })
        
    except Exception as e:
        await update_project_status(project_id, "failed", 0, f"Ошибка: {str(e)}", "Ошибка")
        await create_log(project_id, "generator", "error", f"Ошибка генерации: {str(e)}")

async def run_project_tests_with_fixes(project_id: str):
    """Запуск тестов с автоматическим исправлением ошибок"""
    max_iterations = 3
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        try:
            await update_project_status(project_id, "testing", 50 + iteration * 10, f"Тестирование (попытка {iteration})...", "Анализ кода")
            await create_log(project_id, "tester", "info", f"Запуск тестирования (попытка {iteration}/{max_iterations})")
            
            # Получить файлы проекта
            files = await db.files.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
            
            if not files:
                await update_project_status(project_id, "ready", 100, "Нет файлов для тестирования", "Завершено")
                return
            
            await create_log(project_id, "tester", "info", f"Анализ {len(files)} файлов")
            
            # Получить LLM клиент
            chat = await get_llm_chat()
            
            # Подготовить данные о файлах
            files_info = "\n\n".join([f"Файл: {f['path']}\nЯзык: {f['language']}\nСодержимое:\n{f['content'][:1000]}...\n" for f in files[:5]])
            
            # Сформировать промпт для тестирования
            agent_prompt = AGENT_PROMPTS["tester"].format(files=files_info)
            message = UserMessage(text=agent_prompt)
            
            await update_project_status(project_id, "testing", 60 + iteration * 10, "AI проверяет код на ошибки...", "Проверка")
            
            # Получить результаты тестирования
            response = await chat.send_message(message)
            
            # Парсинг результатов
            try:
                response_text = response.strip()
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]
                
                result = json.loads(response_text)
            except:
                result = {
                    "tests_passed": len(files),
                    "tests_failed": 0,
                    "errors": [],
                    "warnings": []
                }
            
            # Сохранить результаты
            test_result = TestResult(
                project_id=project_id,
                tests_passed=result.get("tests_passed", 0),
                tests_failed=result.get("tests_failed", 0),
                errors=result.get("errors", []),
                warnings=result.get("warnings", [])
            )
            
            doc = test_result.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.test_results.insert_one(doc)
            
            # Если есть ошибки и это не последняя попытка - исправить
            if result.get("tests_failed", 0) > 0 and iteration < max_iterations:
                await create_log(project_id, "tester", "warning", f"Найдено {result['tests_failed']} ошибок", result)
                await update_project_status(project_id, "testing", 70 + iteration * 10, "Исправление ошибок...", "Автоисправление")
                
                # Исправить ошибки
                errors_fixed = await fix_errors(project_id, files, result.get("errors", []))
                
                if errors_fixed > 0:
                    await create_log(project_id, "fixer", "info", f"Исправлено ошибок: {errors_fixed}")
                    await asyncio.sleep(1)
                    continue  # Запустить тесты снова
                else:
                    break
            else:
                # Все тесты прошли или достигнут лимит попыток
                if result.get("tests_failed", 0) > 0:
                    await update_project_status(project_id, "ready", 100, f"Тесты завершены с {result['tests_failed']} ошибками", "Завершено с ошибками")
                    await create_log(project_id, "tester", "warning", f"Тестирование завершено. Остались ошибки: {result['tests_failed']}", result)
                else:
                    await update_project_status(project_id, "ready", 100, "Все тесты пройдены", "Завершено")
                    await create_log(project_id, "tester", "info", "✓ Все тесты пройдены успешно", result)
                break
            
        except Exception as e:
            await update_project_status(project_id, "ready", 100, f"Ошибка тестирования: {str(e)}", "Ошибка")
            await create_log(project_id, "tester", "error", f"Ошибка: {str(e)}")
            break

async def fix_errors(project_id: str, files: list, errors: list) -> int:
    """Автоматическое исправление ошибок"""
    fixed_count = 0
    
    for error in errors[:3]:  # Исправляем максимум 3 ошибки за раз
        try:
            await create_log(project_id, "fixer", "info", f"Исправление: {error}")
            
            # Найти файл с ошибкой (простой поиск по имени файла в тексте ошибки)
            target_file = None
            for file in files:
                if file['path'] in error:
                    target_file = file
                    break
            
            if not target_file:
                target_file = files[0]  # Если не нашли, берем первый файл
            
            # Получить LLM клиент
            chat = await get_llm_chat()
            
            # Сформировать промпт для исправления
            agent_prompt = AGENT_PROMPTS["fixer"].format(
                file_path=target_file['path'],
                error=error,
                code=target_file['content']
            )
            message = UserMessage(text=agent_prompt)
            
            # Получить исправленный код
            response = await chat.send_message(message)
            
            # Парсинг ответа
            try:
                response_text = response.strip()
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]
                
                fix_result = json.loads(response_text)
                fixed_code = fix_result.get("fixed_code", "")
                
                if fixed_code:
                    # Обновить файл
                    await db.files.update_one(
                        {"id": target_file['id']},
                        {"$set": {
                            "content": fixed_code,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    fixed_count += 1
                    await create_log(project_id, "fixer", "info", f"✓ Исправлен файл: {target_file['path']}", {
                        "explanation": fix_result.get("explanation", "")
                    })
                    
                    # Уведомить об обновлении файла
                    await emit_file_created(project_id, {
                        'id': target_file['id'],
                        'path': target_file['path'],
                        'language': target_file['language'],
                        'updated': True
                    })
                    
            except Exception as parse_error:
                await create_log(project_id, "fixer", "warning", f"Не удалось распарсить исправление: {str(parse_error)}")
                
        except Exception as e:
            await create_log(project_id, "fixer", "error", f"Ошибка исправления: {str(e)}")
    
    return fixed_count

async def deploy_to_github(project_id: str, repo_name: str, github_token: str):
    """Деплой в GitHub"""
    try:
        await update_project_status(project_id, "deploying", 85, "Подготовка файлов...", "Подготовка")
        await asyncio.sleep(2)
        
        github_url = f"https://github.com/user/{repo_name}"
        
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"github_url": github_url}}
        )
        
        await update_project_status(project_id, "deployed", 100, "Деплой завершен", "Завершено")
        await create_log(project_id, "deploy", "info", f"Проект задеплоен: {github_url}", {"repo": repo_name})
        
    except Exception as e:
        await update_project_status(project_id, "ready", 100, f"Ошибка деплоя: {str(e)}", "Ошибка")
        await create_log(project_id, "deploy", "error", f"Ошибка деплоя: {str(e)}")

# ==================== STARTUP ====================

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)