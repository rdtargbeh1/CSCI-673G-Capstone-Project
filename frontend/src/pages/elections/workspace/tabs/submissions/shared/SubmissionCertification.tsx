// src/pages/elections/workspace/tabs/submissions/shared/SubmissionCertification.tsx

import { CheckCircle2, PenLine } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  signerName: string;
  value: string;
  confirmed: boolean;
  onChange: (value: string) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  statement: string;
  title?: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionCertification({
  signerName,
  value,
  confirmed,
  onChange,
  onConfirmedChange,
  statement,
  title = "Certification",
}: Props) {
  const expectedName = String(signerName ?? "").trim();
  const enteredName = String(value ?? "").trim();

  const nameMatches =
    Boolean(expectedName) &&
    enteredName.toLowerCase() === expectedName.toLowerCase();

  return (
    <section className="border-b border-slate-200 py-2.5 sm:py-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <PenLine size={14} className="shrink-0 text-blue-600" />

          <h2 className="truncate text-[12px] font-extrabold text-slate-900 sm:text-sm">
            {title}
          </h2>
        </div>

        {nameMatches && confirmed ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[8px] font-bold uppercase text-emerald-700 sm:text-[9px]">
            <CheckCircle2 size={11} />
            Certified
          </span>
        ) : (
          <span className="shrink-0 text-[8px] font-bold uppercase text-slate-400 sm:text-[9px]">
            Required
          </span>
        )}
      </div>

      {/* Statement */}
      <p className="mb-2 text-[10px] leading-4 text-slate-600 sm:text-xs">
        {statement}
      </p>

      {/* Signer */}
      <div className="mb-1 text-[9px] font-semibold text-slate-500 sm:text-[10px]">
        Authenticated user:{" "}
        <strong className="text-slate-700">{expectedName || "—"}</strong>
      </div>

      {/* Typed signature */}
      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
            Type your full name to sign
          </span>

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={expectedName || "Full name"}
            autoComplete="off"
            spellCheck={false}
            className={[
              "h-9 w-full rounded-md border bg-white px-2.5 text-[11px] font-semibold outline-none focus:ring-1 sm:text-sm",
              enteredName && !nameMatches
                ? "border-red-300 text-red-700 focus:border-red-500 focus:ring-red-100"
                : nameMatches
                  ? "border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-100"
                  : "border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-100",
            ].join(" ")}
          />
        </label>

        {nameMatches ? (
          <div className="hidden items-center gap-1 pb-2 text-[9px] font-bold text-emerald-700 sm:flex">
            <CheckCircle2 size={11} />
            Name matched
          </div>
        ) : null}
      </div>

      {enteredName && !nameMatches ? (
        <div className="mt-1 text-[9px] font-semibold text-red-600">
          Enter your account name exactly: {expectedName || "—"}
        </div>
      ) : null}

      {nameMatches ? (
        <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-700 sm:hidden">
          <CheckCircle2 size={10} />
          Signature matches authenticated user.
        </div>
      ) : null}

      {/* Confirmation */}
      <label className="mt-2 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!nameMatches}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
        />

        <span
          className={[
            "text-[10px] font-semibold leading-4 sm:text-xs",
            nameMatches ? "text-slate-700" : "text-slate-400",
          ].join(" ")}
        >
          I confirm that this certification represents my authorized action.
        </span>
      </label>
    </section>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

export function certificationReady(
  signerName: string,
  signature: string,
  confirmed: boolean,
) {
  const expected = String(signerName ?? "")
    .trim()
    .toLowerCase();
  const entered = String(signature ?? "")
    .trim()
    .toLowerCase();

  return Boolean(expected) && entered === expected && confirmed;
}

export function appendCertification(text: string, signerName: string) {
  const clean = String(text ?? "").trim();
  const cleanSigner = String(signerName ?? "").trim();
  const signedAt = new Date().toISOString();

  const certification = `[Certified by ${cleanSigner || "Unknown user"} at ${signedAt}]`;

  return clean ? `${clean}\n\n${certification}` : certification;
}
