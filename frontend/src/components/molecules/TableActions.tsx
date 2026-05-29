'use client';

type TableActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  restoreLabel?: string;
  showEdit?: boolean;
  isInactive?: boolean;
  disabled?: boolean;
};

const actionBase =
  'inline-flex h-8 min-w-[5.75rem] items-center justify-center rounded-full px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';

export function TableActions({
  onEdit,
  onDelete,
  onRestore,
  editLabel = 'Modificar',
  deleteLabel = 'Desactivar',
  restoreLabel = 'Restaurar',
  showEdit = true,
  isInactive = false,
  disabled = false,
}: TableActionsProps) {
  if (!onEdit && !onDelete && !onRestore) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showEdit && onEdit && !isInactive && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className={`${actionBase} border border-sky-400/70 text-sky-300 hover:bg-sky-400/10 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {editLabel}
        </button>
      )}
      {isInactive && onRestore ? (
        <button
          type="button"
          onClick={onRestore}
          disabled={disabled}
          className={`${actionBase} border border-emerald-500/70 text-emerald-300 hover:bg-emerald-500/10 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {restoreLabel}
        </button>
      ) : null}
      {!isInactive && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className={`${actionBase} border border-rose-500/70 text-rose-300 hover:bg-rose-500/10 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
