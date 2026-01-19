import { useState, useEffect } from "react";
import { X, Folder, ChevronRight, ChevronLeft, Check, Download, Loader2 } from "lucide-react";
import {
  useSelectFolder,
  useCreateProject,
  useCheckFolderEmpty,
  useCheckComposerInstalled,
  useCheckWpCliInstalled,
  type CmsInstallConfig,
} from "@/hooks/useCreateProject";
import { Modal } from "@/components/ui/Modal";
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
  cmsInstall: CmsInstallConfig | null;
}

// CMS installation options per project type
interface CmsOption {
  label: string;
  type: "composer" | "wordpress";
  package?: string;
}

const CMS_INSTALLERS: Record<string, CmsOption[]> = {
  drupal11: [
    { label: "Drupal CMS", type: "composer", package: "drupal/cms" },
    { label: "Drupal Core", type: "composer", package: "drupal/recommended-project" },
  ],
  drupal10: [{ label: "Drupal Core", type: "composer", package: "drupal/recommended-project:^10" }],
  laravel: [{ label: "Laravel", type: "composer", package: "laravel/laravel" }],
  shopware6: [{ label: "Shopware 6", type: "composer", package: "shopware/production" }],
  wordpress: [{ label: "WordPress", type: "wordpress" }],
};

const PROJECT_TYPES = [
  { value: "", label: "Auto-detect" },
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
  const [isFolderEmpty, setIsFolderEmpty] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    path: "",
    name: "",
    projectType: "php",
    phpVersion: "",
    database: "",
    webserver: "",
    docroot: "",
    autoStart: true,
    cmsInstall: null,
  });

  const selectFolder = useSelectFolder();
  const createProject = useCreateProject();
  const checkFolderEmpty = useCheckFolderEmpty();
  const { data: hasComposer = false } = useCheckComposerInstalled();
  const { data: hasWpCli = false } = useCheckWpCliInstalled();

  const handleSelectFolder = async () => {
    const result = await selectFolder.mutateAsync();
    if (result) {
      const folderName = result.split("/").pop() || result.split("\\").pop() || "";
      // Check if folder is empty
      const isEmpty = await checkFolderEmpty.mutateAsync(result);
      setIsFolderEmpty(isEmpty);
      setFormData((prev) => ({
        ...prev,
        path: result,
        name: prev.name || folderName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        // Auto-detect for non-empty folders, php for empty folders
        projectType: isEmpty ? "php" : "",
        cmsInstall: null, // Reset CMS install when folder changes
      }));
    }
  };

  // Check folder empty when path changes manually
  useEffect(() => {
    if (formData.path) {
      checkFolderEmpty
        .mutateAsync(formData.path)
        .then((isEmpty) => {
          setIsFolderEmpty(isEmpty);
          // Auto-detect for non-empty folders, keep current type for empty folders
          setFormData((prev) => ({
            ...prev,
            projectType: isEmpty ? prev.projectType || "php" : "",
            cmsInstall: null, // Reset CMS install when path changes
          }));
        })
        .catch(() => {
          setIsFolderEmpty(false);
          setFormData((prev) => ({ ...prev, cmsInstall: null }));
        });
    } else {
      setIsFolderEmpty(false);
      setFormData((prev) => ({ ...prev, cmsInstall: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.path]);

  const handleCreate = () => {
    // Show info toast and close modal - process runs in background
    toast.info(
      "Creating project",
      `${formData.name} is being created. You can cancel via the status bar.`
    );
    createProject.mutate({
      path: formData.path,
      name: formData.name,
      projectType: formData.projectType,
      phpVersion: formData.phpVersion || undefined,
      database: formData.database || undefined,
      webserver: formData.webserver || undefined,
      docroot: formData.docroot || undefined,
      autoStart: formData.autoStart,
      cmsInstall: formData.cmsInstall || undefined,
    });
    onClose();
  };

  // Get CMS options for current project type
  const cmsOptions = CMS_INSTALLERS[formData.projectType] || [];
  const hasCmsOptions = isFolderEmpty && cmsOptions.length > 0;

  // Check if installation is available (composer for most, always for wordpress)
  const canInstallCms = (option: CmsOption) => {
    if (option.type === "wordpress") return true;
    if (option.type === "composer") return hasComposer;
    return false;
  };

  // Get installation method description for WordPress
  const getWordPressMethodLabel = () => {
    return hasWpCli ? "(via WP-CLI)" : "(via download)";
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.path.length > 0;
      case 1:
        // projectType can be empty (auto-detect)
        return formData.name.length > 0;
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
                    onClick={() =>
                      setFormData({ ...formData, projectType: type.value, cmsInstall: null })
                    }
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors",
                      formData.projectType === type.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CMS Installation Options */}
            {hasCmsOptions && (
              <div className="border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20 rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Download className="text-primary-600 dark:text-primary-400 h-4 w-4" />
                  <span className="text-primary-700 dark:text-primary-300 text-sm font-medium">
                    Install {PROJECT_TYPES.find((t) => t.value === formData.projectType)?.label}
                  </span>
                </div>
                <p className="text-primary-600 dark:text-primary-400 mb-3 text-xs">
                  The folder is empty. You can optionally install the CMS files.
                </p>

                {cmsOptions.length === 1 ? (
                  // Single option - checkbox
                  <label
                    className={cn(
                      "flex items-center gap-2",
                      !canInstallCms(cmsOptions[0]) && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.cmsInstall !== null}
                      disabled={!canInstallCms(cmsOptions[0])}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            cmsInstall: {
                              type: cmsOptions[0].type,
                              package: cmsOptions[0].package,
                            },
                          });
                        } else {
                          setFormData({ ...formData, cmsInstall: null });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Install {cmsOptions[0].label}
                      {cmsOptions[0].type === "wordpress" && (
                        <span className="ml-1 text-xs text-gray-500">
                          {getWordPressMethodLabel()}
                        </span>
                      )}
                    </span>
                  </label>
                ) : (
                  // Multiple options - radio buttons
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cmsInstall"
                        checked={formData.cmsInstall === null}
                        onChange={() => setFormData({ ...formData, cmsInstall: null })}
                        className="h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Don&apos;t install (configure only)
                      </span>
                    </label>
                    {cmsOptions.map((option, index) => (
                      <label
                        key={index}
                        className={cn(
                          "flex items-center gap-2",
                          !canInstallCms(option) && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="cmsInstall"
                          disabled={!canInstallCms(option)}
                          checked={
                            formData.cmsInstall?.type === option.type &&
                            formData.cmsInstall?.package === option.package
                          }
                          onChange={() =>
                            setFormData({
                              ...formData,
                              cmsInstall: { type: option.type, package: option.package },
                            })
                          }
                          className="h-4 w-4 border-gray-300"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Install {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Show warning if composer not available */}
                {cmsOptions.some((o) => o.type === "composer") && !hasComposer && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Composer not found. Install Composer to enable CMS installation.
                  </p>
                )}
              </div>
            )}
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

      case 3: {
        // Find CMS install label for display
        const getCmsInstallLabel = () => {
          if (!formData.cmsInstall) return null;
          const options = CMS_INSTALLERS[formData.projectType] || [];
          const option = options.find(
            (o) =>
              o.type === formData.cmsInstall?.type && o.package === formData.cmsInstall?.package
          );
          if (option) {
            if (option.type === "wordpress") {
              return `${option.label} ${hasWpCli ? "(via WP-CLI)" : "(via download)"}`;
            }
            return option.label;
          }
          return formData.cmsInstall.package || "WordPress";
        };

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
                {formData.cmsInstall && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Install:</dt>
                    <dd className="text-green-600 dark:text-green-400">{getCmsInstallLabel()}</dd>
                  </div>
                )}
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
      }

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="lg" scrollable closeOnClickOutside={false}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Create New Project
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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
                    ? "bg-primary-500 text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-24",
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
      <div className="mb-6 min-h-70">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            className="bg-primary-500 hover:bg-primary-600 flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
          >
            <Check className="h-4 w-4" />
            Create Project
          </button>
        )}
      </div>
    </Modal>
  );
}
