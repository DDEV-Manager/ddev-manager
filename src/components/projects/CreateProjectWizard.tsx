import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { X, Folder, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { useSelectFolder, useCreateProject } from "@/hooks/useCreateProject";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

interface CreateProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  path: string;
  name: string;
  projectType: string;
  phpVersion: string;
  database: string;
  webserver: string;
  docroot: string;
  autoStart: boolean;
}

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error";
  message?: string;
}

const PROJECT_TYPES = [
  { value: "php", label: "PHP (Generic)" },
  { value: "wordpress", label: "WordPress" },
  { value: "drupal", label: "Drupal" },
  { value: "drupal10", label: "Drupal 10" },
  { value: "drupal11", label: "Drupal 11" },
  { value: "laravel", label: "Laravel" },
  { value: "typo3", label: "TYPO3" },
  { value: "magento2", label: "Magento 2" },
  { value: "shopware6", label: "Shopware 6" },
  { value: "backdrop", label: "Backdrop CMS" },
];

const PHP_VERSIONS = [
  { value: "", label: "Default (based on project type)" },
  { value: "8.3", label: "PHP 8.3" },
  { value: "8.2", label: "PHP 8.2" },
  { value: "8.1", label: "PHP 8.1" },
  { value: "8.0", label: "PHP 8.0" },
  { value: "7.4", label: "PHP 7.4" },
];

const DATABASES = [
  { value: "", label: "Default (MariaDB 10.11)" },
  { value: "mariadb:10.11", label: "MariaDB 10.11" },
  { value: "mariadb:10.6", label: "MariaDB 10.6" },
  { value: "mysql:8.0", label: "MySQL 8.0" },
  { value: "mysql:5.7", label: "MySQL 5.7" },
  { value: "postgres:16", label: "PostgreSQL 16" },
  { value: "postgres:15", label: "PostgreSQL 15" },
];

const WEBSERVERS = [
  { value: "", label: "Default (nginx-fpm)" },
  { value: "nginx-fpm", label: "Nginx + PHP-FPM" },
  { value: "apache-fpm", label: "Apache + PHP-FPM" },
];

const STEPS = ["Location", "Project Type", "Configuration", "Review"];

// Wrapper component that remounts content when opened
export function CreateProjectWizard({ isOpen, onClose }: CreateProjectWizardProps) {
  if (!isOpen) return null;
  return <CreateProjectWizardContent onClose={onClose} />;
}

function CreateProjectWizardContent({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    path: "",
    name: "",
    projectType: "php",
    phpVersion: "",
    database: "",
    webserver: "",
    docroot: "",
    autoStart: true,
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const selectFolder = useSelectFolder();
  const createProject = useCreateProject();

  // Listen for command completion
  useEffect(() => {
    if (!isCreating) return;

    let mounted = true;
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      if (!mounted) return;

      const { command, status } = event.payload;

      if (command === "config" && (status === "finished" || status === "error")) {
        setIsCreating(false);
        if (status === "finished") {
          toast.success("Project created", `${formData.name} has been created successfully`);
          onClose();
        } else {
          toast.error("Project creation failed", "Check the terminal for details");
        }
      }
    }).then((fn) => {
      if (mounted) {
        unlistenFn = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isCreating, onClose, formData.name]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCreating, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isCreating) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCreating, onClose]);

  const handleSelectFolder = async () => {
    const result = await selectFolder.mutateAsync();
    if (result) {
      const folderName = result.split("/").pop() || result.split("\\").pop() || "";
      setFormData((prev) => ({
        ...prev,
        path: result,
        name: prev.name || folderName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      }));
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    createProject.mutate({
      path: formData.path,
      name: formData.name,
      projectType: formData.projectType,
      phpVersion: formData.phpVersion || undefined,
      database: formData.database || undefined,
      webserver: formData.webserver || undefined,
      docroot: formData.docroot || undefined,
      autoStart: formData.autoStart,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.path.length > 0;
      case 1:
        return formData.name.length > 0 && formData.projectType.length > 0;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Folder
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="/path/to/project"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  onClick={handleSelectFolder}
                  disabled={selectFolder.isPending}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {selectFolder.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Folder className="h-4 w-4" />
                  )}
                  Browse
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select an existing folder or enter a path for a new project
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                placeholder="my-project"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, projectType: type.value })}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors",
                      formData.projectType === type.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                PHP Version
              </label>
              <select
                value={formData.phpVersion}
                onChange={(e) => setFormData({ ...formData, phpVersion: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {PHP_VERSIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Database
              </label>
              <select
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {DATABASES.map((db) => (
                  <option key={db.value} value={db.value}>
                    {db.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Web Server
              </label>
              <select
                value={formData.webserver}
                onChange={(e) => setFormData({ ...formData, webserver: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {WEBSERVERS.map((ws) => (
                  <option key={ws.value} value={ws.value}>
                    {ws.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Root (optional)
              </label>
              <input
                type="text"
                value={formData.docroot}
                onChange={(e) => setFormData({ ...formData, docroot: e.target.value })}
                placeholder="e.g., public, web, docroot"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for project root</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h4 className="mb-3 font-medium text-gray-900 dark:text-gray-100">Project Summary</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Location:</dt>
                  <dd className="font-mono text-gray-900 dark:text-gray-100">{formData.path}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{formData.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {PROJECT_TYPES.find((t) => t.value === formData.projectType)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">PHP:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.phpVersion || "Default"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Database:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.database || "MariaDB 10.11"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Web Server:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formData.webserver || "nginx-fpm"}
                  </dd>
                </div>
                {formData.docroot && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Docroot:</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{formData.docroot}</dd>
                  </div>
                )}
              </dl>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoStart}
                onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Start project after creation
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Project
          </h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  index < currentStep
                    ? "bg-green-500 text-white"
                    : index === currentStep
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                )}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8",
                    index < currentStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Title */}
        <h3 className="mb-4 text-sm font-medium text-gray-500">{STEPS[currentStep]}</h3>

        {/* Step Content */}
        <div className="mb-6 min-h-[280px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0 || isCreating}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
