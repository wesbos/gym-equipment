/** Shared by numeric, select, appearance and future logo controls. */
export function ResetButton({ label, changed, onReset, disabled = false, value }: {
  label: string; changed: boolean; onReset: () => void; disabled?: boolean; value?: string | number;
}) {
  return <button type="button" className="field-reset" disabled={disabled || !changed}
    aria-label={`Reset ${label}`} title={`Reset ${label}${value !== undefined ? ` to ${value}` : ' to default'} · Undo restores your edit`}
    onClick={onReset}>↶ <span>Reset</span></button>;
}
