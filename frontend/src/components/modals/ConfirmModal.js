import React from 'react';
import { BaseModal } from './BaseModal';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
