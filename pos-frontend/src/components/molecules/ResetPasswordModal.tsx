'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePasswordStrength,
  generateTemporaryPassword,
} from '@/core/utils/password';
import { notifyInfo, notifySuccess } from '@/store/ui';

type ResetPasswordModalProps = {
  open: boolean;
  userEmail?: string;
  isProcessing?: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void | Promise<void>;
};

const strengthBarClass: Record<string, string> = {
  weak: 'bg-rose-500 w-1/3',
  fair: 'bg-amber-500 w-2/3',
  good: 'bg-emerald-500 w-full',
};

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <div className="relative mt-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="app-input w-full rounded-3xl px-4 py-3 pr-24"
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[rgba(74,83,60,0.08)]"
        >
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
    </label>
  );
}

export function ResetPasswordModal({
  open,
  userEmail,
  isProcessing = false,
  onCancel,
  onSubmit,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validation = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirm(false);
      setLocalError(null);
    }
  }, [open, userEmail]);

  if (!open) return null;

  const handleGenerate = () => {
    const generated = generateTemporaryPassword(12);
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirm(true);
    setLocalError(null);
    notifyInfo('Contraseña temporal generada', 'Revísala y compártela de forma segura con el usuario.');
  };

  const handleCopy = async () => {
    if (!password.trim()) {
      setLocalError('Genera o escribe una contraseña antes de copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      notifySuccess('Contraseña copiada al portapapeles');
      setLocalError(null);
    } catch {
      setLocalError('No se pudo copiar. Copia manualmente el campo de contraseña.');
    }
  };

  const handleSubmit = async () => {
    const trimmed = password.trim();
    if (!validation.isValid) {
      setLocalError('La contraseña no cumple los requisitos mínimos de seguridad.');
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    setLocalError(null);
    try {
      await onSubmit(trimmed);
    } catch {
      // El padre muestra el error; el modal permanece abierto para reintentar.
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setLocalError(null);
    onCancel();
  };

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-panel w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-[#3D4532]">Restablecer contraseña</h2>
        <p className="mt-2 text-sm text-slate-600">{userEmail}</p>
        <p className="mt-1 text-xs text-slate-500">
          Define una clave temporal segura y entrégala al usuario por un canal privado.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isProcessing}
            className="rounded-2xl border border-[rgba(176,138,76,0.45)] bg-[rgba(176,138,76,0.08)] px-3 py-2 text-xs font-semibold text-[#8C6A2B] hover:bg-[rgba(176,138,76,0.14)] disabled:opacity-50"
          >
            Generar temporal
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isProcessing || !password}
            className="app-btn-secondary rounded-2xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Copiar clave
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <PasswordField
            label="Nueva contraseña"
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            placeholder="Mínimo 8 caracteres"
          />

          {password.length > 0 && (
            <div className="rounded-2xl border border-[rgba(74,83,60,0.2)] bg-[rgba(74,83,60,0.06)] px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Fortaleza</span>
                <span
                  className={
                    validation.strength === 'good'
                      ? 'text-emerald-400'
                      : validation.strength === 'fair'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }
                >
                  {validation.label}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[rgba(74,83,60,0.16)]">
                <div className={`h-1.5 rounded-full transition-all ${strengthBarClass[validation.strength]}`} />
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {validation.checks.map((check) => (
                  <li
                    key={check.label}
                    className={check.ok ? 'text-[#4A533C]' : 'text-slate-500'}
                  >
                    {check.ok ? '✓' : '○'} {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PasswordField
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
            placeholder="Repite la contraseña"
          />

          {confirmPassword.length > 0 && (
            <p
              className={`text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {passwordsMatch ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
            </p>
          )}
        </div>

        {localError && (
          <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {localError}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="app-btn-secondary rounded-3xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || !validation.isValid || !passwordsMatch}
            className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Guardando…' : 'Restablecer'}
          </button>
        </div>
      </div>
    </div>
  );
}
