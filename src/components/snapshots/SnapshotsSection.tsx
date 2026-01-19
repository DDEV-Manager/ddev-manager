import { useState, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Database, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useListSnapshots,
  useCreateSnapshot,
  useRestoreSnapshot,
  useDeleteSnapshot,
  useCleanupSnapshots,
  type Snapshot,
  queryKeys,
} from "@/hooks/useDdev";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error" | "cancelled";
  message?: string;
  process_id?: string;
}

interface SnapshotsSectionProps {
  projectName: string;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

type SnapshotOperation = "snapshot" | "snapshot-restore" | "snapshot-delete" | "snapshot-cleanup";

export function SnapshotsSection({ projectName }: SnapshotsSectionProps) {
  const [snapshotName, setSnapshotName] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Snapshot | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [activeOperation, setActiveOperation] = useState<SnapshotOperation | null>(null);

  const queryClient = useQueryClient();
  const { data: snapshots, isLoading } = useListSnapshots(projectName);
  const createSnapshot = useCreateSnapshot();
  const restoreSnapshot = useRestoreSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const cleanupSnapshots = useCleanupSnapshots();

  // Listen for command completion to clear loading states and show toasts
  useEffect(() => {
    let mounted = true;
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      if (!mounted) return;

      const { command, project, status } = event.payload;

      // Only handle events for this project and snapshot commands
      if (project !== projectName) return;
      if (
        !["snapshot", "snapshot-restore", "snapshot-delete", "snapshot-cleanup"].includes(command)
      )
        return;

      if (status === "finished") {
        if (command === "snapshot") {
          toast.success("Snapshot created", "Database snapshot has been created");
          setSnapshotName("");
        } else if (command === "snapshot-restore") {
          toast.success("Snapshot restored", "Database has been restored to the snapshot");
        } else if (command === "snapshot-delete") {
          toast.success("Snapshot deleted", "The snapshot has been removed");
        } else if (command === "snapshot-cleanup") {
          toast.success("All snapshots deleted", "All database snapshots have been removed");
        }
        setActiveOperation(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.snapshots(projectName) });
      } else if (status === "error") {
        toast.error(`Operation failed`, "Check the terminal for details");
        setActiveOperation(null);
      } else if (status === "cancelled") {
        toast.info("Operation cancelled", "The operation was cancelled");
        setActiveOperation(null);
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
  }, [projectName, queryClient]);

  const handleCreate = useCallback(() => {
    const name = snapshotName.trim() || undefined;
    setActiveOperation("snapshot");
    createSnapshot.mutate({ project: projectName, name });
  }, [projectName, snapshotName, createSnapshot]);

  const handleRestore = useCallback(() => {
    if (!restoreTarget) return;
    setActiveOperation("snapshot-restore");
    setRestoreTarget(null);
    restoreSnapshot.mutate({ project: projectName, snapshot: restoreTarget.name });
  }, [projectName, restoreTarget, restoreSnapshot]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setActiveOperation("snapshot-delete");
    setDeleteTarget(null);
    deleteSnapshot.mutate({ project: projectName, snapshot: deleteTarget.name });
  }, [projectName, deleteTarget, deleteSnapshot]);

  const handleCleanup = useCallback(() => {
    setShowCleanupConfirm(false);
    setActiveOperation("snapshot-cleanup");
    cleanupSnapshots.mutate(projectName);
  }, [projectName, cleanupSnapshots]);

  const isCreating = activeOperation === "snapshot";
  const isCleaning = activeOperation === "snapshot-cleanup";
  const isRestoring = activeOperation === "snapshot-restore";
  const isDeleting = activeOperation === "snapshot-delete";
  const hasSnapshots = snapshots && snapshots.length > 0;
  const isAnyOperationActive = activeOperation !== null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          <Database className="mr-1 inline h-4 w-4" />
          Snapshots
        </h3>
        {hasSnapshots && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowCleanupConfirm(true)}
            disabled={isAnyOperationActive}
            loading={isCleaning}
          >
            Clean All
          </Button>
        )}
      </div>

      {/* Create snapshot form */}
      <div className="mb-4 flex gap-2">
        <Input
          type="text"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="Snapshot name (optional)"
          disabled={isCreating}
        />
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={isAnyOperationActive}
          loading={isCreating}
          icon={<Plus className="h-4 w-4" />}
        >
          Create Snapshot
        </Button>
      </div>

      {/* Snapshots list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !hasSnapshots ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
          No snapshots yet. Create one to backup your database.
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.name}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">{snapshot.name}</div>
                <div className="text-xs text-gray-500">{formatDate(snapshot.created)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRestoreTarget(snapshot)}
                  disabled={isAnyOperationActive}
                  loading={isRestoring}
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                >
                  Restore
                </Button>
                <Button
                  variant="danger-ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(snapshot)}
                  disabled={isAnyOperationActive}
                  loading={isDeleting}
                  icon={<Trash2 className="h-4 w-4" />}
                  title="Delete snapshot"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore confirmation dialog */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        title="Restore Snapshot"
        message={`This will restore the database to "${restoreTarget?.name}". Your current database will be overwritten. Are you sure?`}
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Snapshot"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Cleanup confirmation dialog */}
      <ConfirmDialog
        isOpen={showCleanupConfirm}
        title="Delete All Snapshots"
        message={`This will permanently delete all ${snapshots?.length ?? 0} snapshot(s) for this project. This action cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleCleanup}
        onCancel={() => setShowCleanupConfirm(false)}
      />
    </section>
  );
}
