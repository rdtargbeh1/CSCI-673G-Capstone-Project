// src/pages/elections/shared/elections-ui.tsx

/**
 * ELECTIONS UI SHARED COMPONENTS
 *
 * PURPOSE:
 * - Shared layout primitives for Elections Hub + Workspace tabs.
 * - Keeps Election Workspace consistent and scalable.
 * - Responsive across phone, tablet, laptop, and desktop.
 */

import React from "react";
import { NavLink, useLocation } from "react-router-dom";

// ============================================================================
// SECTION TITLE
// ============================================================================

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="
          break-words
          text-xl
          font-black
          leading-tight
          text-blue-800

          sm:text-2xl
          lg:text-[28px]
        "
      >
        {title}
      </div>

      {subtitle && (
        <div
          className="
            mt-1
            break-words
            text-sm
            font-medium
            leading-5
            text-blue-900/75

            sm:text-base
            lg:text-lg
          "
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WORKSPACE HEADER
// ============================================================================

export function WorkspaceHeader({
  electionName,
  meta,
  right,
}: {
  electionName: string;
  meta: string;
  right?: React.ReactNode;
}) {
  return (
    <section
      className="
        w-full
        min-w-0
        rounded-xl
        border
        border-slate-200
        bg-white

        p-3

        sm:p-4
        lg:p-[14px]
      "
    >
      <div
        className="
          flex
          min-w-0
          flex-col
          gap-3

          md:flex-row
          md:items-start
          md:justify-between

          lg:gap-4
        "
      >
        {/* ============================================================
            ELECTION INFORMATION
        ============================================================ */}

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <h1
            className="
              break-words
              text-xl
              font-black
              leading-tight
              text-blue-800

              sm:text-2xl
              lg:text-2xl
            "
          >
            {electionName}
          </h1>

          <p
            className="
              mt-1.5
              break-words
              text-sm
              leading-5
              text-slate-600

              sm:text-base
              sm:leading-6

              lg:text-lg
            "
          >
            {meta}
          </p>
        </div>

        {/* ============================================================
            HEADER ACTIONS
        ============================================================ */}

        {right && (
          <div
            className="
              flex
              w-full
              min-w-0
              flex-wrap
              items-center
              justify-end
              gap-2

              md:w-auto
              md:shrink-0
            "
          >
            {right}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// TABS BAR
// ============================================================================

export function TabsBar({
  tabs,
}: {
  tabs: Array<{
    to: string;
    label: string;
    hidden?: boolean;
  }>;
}) {
  const location = useLocation();

  return (
    <div
      className="
        flex
        w-full
        min-w-0
        flex-nowrap
        items-center
        gap-2
        overflow-x-auto
        overflow-y-hidden
        pb-1

        sm:flex-wrap
        sm:overflow-visible
        sm:pb-0
      "
    >
      {tabs
        .filter((tab) => !tab.hidden)
        .map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => {
              const active = isActive || location.pathname.endsWith(tab.to);

              return `
                  inline-flex
                  min-h-10
                  shrink-0
                  items-center
                  justify-center

                  rounded-lg
                  border

                  px-2.5
                  py-2

                  text-xs
                  font-bold

                  no-underline
                  transition

                  sm:px-3
                  sm:text-sm

                  ${
                    active
                      ? `
                        border-indigo-200
                        bg-indigo-50
                        text-indigo-900
                      `
                      : `
                        border-slate-200
                        bg-white
                        text-slate-900
                        hover:bg-slate-50
                      `
                  }
                `;
            }}
          >
            {tab.label}
          </NavLink>
        ))}
    </div>
  );
}

// ============================================================================
// PANEL
// ============================================================================

export function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
      "
    >
      {/* ============================================================
          PANEL HEADER
      ============================================================ */}

      <div
        className="
          flex
          min-w-0
          flex-col
          gap-3

          border-b
          border-slate-200

          px-3
          py-3

          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-4

          lg:px-[14px]
        "
      >
        <h2
          className="
            min-w-0
            break-words
            text-xl
            font-extrabold
            leading-tight
            text-slate-950

            sm:text-2xl
            lg:text-[28px]
          "
        >
          {title}
        </h2>

        {right && (
          <div
            className="
              flex
              min-w-0
              flex-wrap
              items-center
              justify-end
              gap-2

              sm:shrink-0
            "
          >
            {right}
          </div>
        )}
      </div>

      {/* ============================================================
          PANEL CONTENT
      ============================================================ */}

      <div
        className="
          min-w-0
          p-3
          text-sm

          sm:p-4
          sm:text-base

          lg:p-[14px]
          lg:text-lg
        "
      >
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// BADGE
// ============================================================================

export function Badge({ text }: { text: string }) {
  return (
    <span
      className="
        inline-flex
        min-h-7
        items-center
        justify-center

        rounded-full
        border
        border-slate-200
        bg-white

        px-2
        py-0.5

        text-xs
        font-semibold
        text-slate-700

        sm:text-sm
      "
    >
      {text}
    </span>
  );
}

// ============================================================================
// READ ONLY BANNER
// ============================================================================

export function ReadOnlyBanner({
  reason,
  sources,
}: {
  reason: string;
  sources: string[];
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-dashed
        border-slate-300
        bg-slate-50

        p-3

        sm:p-4
      "
    >
      <div
        className="
          text-sm
          font-black
          text-slate-900

          sm:text-base
        "
      >
        Read-only (Tenant View)
      </div>

      <div
        className="
          mt-1.5
          text-xs
          leading-5
          text-slate-600

          sm:text-sm
        "
      >
        {reason}
      </div>

      <div
        className="
          mt-1.5
          text-[11px]
          leading-4
          text-slate-500

          sm:text-xs
        "
      >
        Data sources: {sources.join(", ")}
      </div>
    </div>
  );
}

// ============================================================================
// PLACEHOLDER NOTE
// ============================================================================

export function PlaceholderNote({
  title,
  bullets,
}: {
  title: string;
  bullets: string[];
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-dashed
        border-slate-300
        bg-slate-50

        p-3

        text-sm

        sm:p-4
        sm:text-base
      "
    >
      <div
        className="
          mb-2
          font-black
          text-slate-900
        "
      >
        {title}
      </div>

      <ul
        className="
          m-0
          space-y-1
          pl-5
          text-xs
          leading-5
          text-slate-600

          sm:text-sm
        "
      >
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// SIMPLE TABLE
// ============================================================================

/**
 * Existing table support is preserved.
 *
 * It remains horizontally scrollable when used on narrow screens.
 * New operational pages should generally prefer responsive lists/cards,
 * but existing pages depending on SimpleTable continue to work.
 */

export function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
}) {
  return (
    <div
      className="
        w-full
        min-w-0
        overflow-x-auto
        overscroll-x-contain
      "
    >
      <table
        className="
          w-full
          min-w-max
          border-collapse
        "
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="
                    whitespace-nowrap
                    border-b
                    border-slate-200

                    px-2
                    py-2

                    text-left
                    text-xs
                    font-semibold
                    text-slate-600

                    sm:text-sm
                    lg:text-base
                  "
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="
                  align-middle
                  hover:bg-slate-50
                "
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="
                        whitespace-nowrap
                        border-b
                        border-slate-100

                        px-2
                        py-2

                        text-sm
                        text-slate-900

                        sm:text-base
                        lg:text-lg
                      "
                >
                  {cell as any}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// ELECTION STATUS BADGE
// ============================================================================

export function ElectionStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`
        inline-flex
        min-h-7
        items-center
        gap-1.5

        rounded-full
        border
        border-slate-200

        px-2
        py-0.5

        text-[11px]
        font-bold

        sm:text-xs

        ${active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
      `}
      title={active ? "Active election" : "Inactive election"}
    >
      <span
        className={`
          h-2
          w-2
          shrink-0
          rounded-full

          ${active ? "bg-green-600" : "bg-red-600"}
        `}
      />

      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}
