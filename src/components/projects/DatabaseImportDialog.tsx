import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import type { DbImportOptions } from "@/types/ddev";

interface DatabaseImportDialogProps {
  isOpen: boolean;
  onConfirm: (options: DbImportOptions) => void;
  onCancel: () => void;
}

function DialogContent({
  onConfirm,
  onCancel,
}: {
  onConfirm: (options: DbImportOptions) => void;
  onCancel: () => void;
}) {
  const [database, setDatabase] = useState("");
  const [noDrop, setNoDrop] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm({
      database: database.trim() || undefined,
      noDrop: noDrop || undefined,
    });
  }, [onConfirm, database, noDrop]);

  return (
    <div className="space-y-4">
      <div>
        <h2
          id="import-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Import Database
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure import options, then select a file
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="import-database-name"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Database name
          </label>
          <Input
            id="import-database-name"
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="db"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty to use the default database (db)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Keep existing data
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preserve existing tables during import
            </p>
          </div>
          <Toggle enabled={noDrop} onChange={setNoDrop} label="Keep existing data" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} icon={<Upload className="h-4 w-4" />}>
          Select File...
        </Button>
      </div>
    </div>
  );
}

export function DatabaseImportDialog({ isOpen, onConfirm, onCancel }: DatabaseImportDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="sm" ariaLabelledBy="import-dialog-title">
      {isOpen && <DialogContent onConfirm={onConfirm} onCancel={onCancel} />}
    </Modal>
  );
}
