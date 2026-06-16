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
  'inline-flex h-8 min-w-[5.75rem] items-center justify-center rounded-full px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white';

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
          className={`${actionBase} border border-brand-olive/50 text-brand-olive hover:bg-brand-olive/10 focus:ring-brand-olive disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {editLabel}
        </button>
      )}
      {isInactive && onRestore ? (
        <button
          type="button"
          onClick={onRestore}
          disabled={disabled}
          className={`${actionBase} border border-emerald-600/60 text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {restoreLabel}
        </button>
      ) : null}
      {!isInactive && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className={`${actionBase} border border-rose-500/60 text-rose-700 hover:bg-rose-50 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
