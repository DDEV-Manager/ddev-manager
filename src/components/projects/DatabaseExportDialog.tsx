import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ButtonGroup } from "@/components/ui/ButtonGroup";
import { Input } from "@/components/ui/Input";
import type { DbExportOptions } from "@/types/ddev";

type CompressionType = "gzip" | "bzip2" | "xz";

interface DatabaseExportDialogProps {
  isOpen: boolean;
  onConfirm: (options: DbExportOptions) => void;
  onCancel: () => void;
}

const compressionOptions = [
  { value: "gzip" as const, label: "gzip" },
  { value: "bzip2" as const, label: "bzip2" },
  { value: "xz" as const, label: "xz" },
];

function DialogContent({
  onConfirm,
  onCancel,
}: {
  onConfirm: (options: DbExportOptions) => void;
  onCancel: () => void;
}) {
  const [database, setDatabase] = useState("");
  const [compression, setCompression] = useState<CompressionType>("gzip");

  const handleConfirm = useCallback(() => {
    onConfirm({
      database: database.trim() || undefined,
      compression,
    });
  }, [onConfirm, database, compression]);

  return (
    <div className="space-y-4">
      <div>
        <h2
          id="export-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Export Database
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure export options, then choose a destination
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="export-database-name"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Database name
          </label>
          <Input
            id="export-database-name"
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="db"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty to use the default database (db)
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Compression
          </label>
          <ButtonGroup options={compressionOptions} value={compression} onChange={setCompression} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} icon={<Download className="h-4 w-4" />}>
          Choose Destination...
        </Button>
      </div>
    </div>
  );
}

export function DatabaseExportDialog({ isOpen, onConfirm, onCancel }: DatabaseExportDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="sm" ariaLabelledBy="export-dialog-title">
      {isOpen && <DialogContent onConfirm={onConfirm} onCancel={onCancel} />}
    </Modal>
  );
}
