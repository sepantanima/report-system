import { PAGE_WIDE_MAX } from "../constants/pageLayoutWidths.js";

/** CSS مشترک صفحات فرم — ریسپانسیو، جداول، فونت ورودی */
export const FORM_PAGE_CSS = `
  .page-font-root textarea,
  .page-font-root input[type="text"],
  .page-font-root input[type="search"],
  .page-font-root input[type="password"],
  .page-font-root input[type="number"],
  .page-font-root input[type="url"],
  .page-font-root input:not([type]),
  .page-font-root select,
  .page-font-root .themed-date-input,
  .page-font-root .rich-text-area,
  .page-font-root .v3-input-new,
  .page-font-root .v3-textarea-new,
  .page-font-root .v3-textarea-small-new,
  .page-font-root .v3-select-new,
  .page-font-root .v3-search-input input,
  .page-font-root .v3-select-filter,
  .page-font-root .v3-input-text,
  .page-font-root [contenteditable="true"] {
    font-size: var(--input-font-size, 14px) !important;
  }
  .page-font-root .page-scalable-text {
    font-size: var(--input-font-size, 14px) !important;
  }
  .page-font-root .page-scalable-text-sm {
    font-size: calc(var(--input-font-size, 14px) * 0.857) !important;
  }

  .form-page-header-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }
  .form-page-header-title {
    overflow: hidden;
  }
  .form-page-header-title h1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .form-page-header-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: nowrap;
  }
  .page-user-logout-btn:hover {
    background: rgba(239, 68, 68, 0.15) !important;
    color: #ef4444 !important;
    border-color: rgba(239, 68, 68, 0.35) !important;
  }
  body.light .page-user-logout-btn:hover {
    background: rgba(239, 68, 68, 0.1) !important;
    color: #dc2626 !important;
    border-color: rgba(239, 68, 68, 0.3) !important;
  }
  .form-page-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    width: 100%;
  }
  .form-page-header-actions .v3-add-fab,
  .form-page-header-actions .form-page-btn {
    flex: 0 1 auto;
  }

  .form-page-header-sub {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
  }
  .form-page-header-sub > * {
    width: 100%;
    max-width: min(${PAGE_WIDE_MAX}px, 96vw);
  }

  .form-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.93em;
    white-space: nowrap;
  }
  .form-page-btn-secondary {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: inherit;
  }
  body.light .form-page-btn-secondary {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #1e293b;
  }
  .form-page-btn-primary {
    background: #0ea5e9;
    border: none;
    color: #fff;
  }

  .form-page-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end;
    margin-bottom: 14px;
  }
  .form-page-filter-field {
    flex: 1 1 180px;
    min-width: 0;
  }
  .form-page-filter-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    flex: 1 1 auto;
  }
  .form-page-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 14px;
  }
  .form-page-toolbar-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }
  .form-page-panel-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 15px;
  }
  .form-page-panel-bar .form-page-search {
    flex: 1 1 200px;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .form-page-panel-bar .form-page-date {
    flex: 0 1 auto;
  }

  .form-page-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 8px;
  }
  .form-page-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.93em;
    min-width: 560px;
  }
  .form-page-table th,
  .form-page-table td {
    padding: 8px 10px;
    text-align: right;
    vertical-align: top;
  }
  .form-page-table .col-narrow { width: 56px; white-space: nowrap; }
  .form-page-table .col-short { min-width: 72px; white-space: nowrap; }
  .form-page-table .col-text { min-width: 140px; }
  .form-page-table .col-title { min-width: 160px; max-width: 280px; }
  .form-page-table .col-wide { min-width: 200px; max-width: 360px; }
  .form-page-table .col-mono { min-width: 120px; font-family: ui-monospace, monospace; font-size: 0.86em; }
  .form-page-table .col-actions { white-space: nowrap; width: 1%; }

  .form-page-table--ai-form-actions {
    min-width: 0;
    table-layout: fixed;
  }
  .form-page-table--ai-form-actions th,
  .form-page-table--ai-form-actions td {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .form-page-table--ai-form-actions .col-narrow { width: 44px; min-width: 0; }
  .form-page-table--ai-form-actions .col-form-action { width: 30%; min-width: 0; }
  .form-page-table--ai-form-actions .col-button-label { width: 22%; min-width: 0; }
  .form-page-table--ai-form-actions .col-api { width: 28%; min-width: 0; }
  .form-page-table--ai-form-actions .col-short { width: 48px; min-width: 0; white-space: nowrap; }
  .form-page-table--ai-form-actions .col-actions { width: 84px; min-width: 0; }
  .form-page-table--ai-form-actions .col-mono {
    min-width: 0;
    font-size: 0.82em;
    line-height: 1.45;
    word-break: break-all;
  }
  .form-page-table--ai-form-actions .col-actions button {
    padding: 3px 7px;
    min-height: 28px;
    font-size: 0.86em;
  }

  .unmapped-senders-page {
    min-width: 0;
    max-width: 100%;
  }
  .unmapped-sender-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }
  .unmapped-sender-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end;
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 10px;
  }
  .unmapped-sender-filter-search {
    flex: 1 1 220px;
    min-width: 0;
  }
  .unmapped-sender-filter-kind {
    flex: 0 1 160px;
    min-width: 0;
  }
  .unmapped-sender-filter-count {
    font-size: 0.93em;
    opacity: 0.75;
    padding-bottom: 8px;
  }
  .unmapped-senders-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .unmapped-sender-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto minmax(180px, 220px) minmax(108px, auto);
    gap: 10px;
    align-items: center;
    padding: 12px;
    border-radius: 10px;
    min-width: 0;
  }
  .unmapped-sender-row__meta {
    display: contents;
  }
  .unmapped-sender-row__sender-name {
    font-weight: 700;
    font-size: 0.93em;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .unmapped-sender-row__meta-line {
    font-size: 0.93em;
    opacity: 0.8;
    white-space: nowrap;
  }
  .unmapped-sender-row__status {
    font-size: 0.86em;
    opacity: 0.65;
    white-space: nowrap;
  }
  .unmapped-sender-row__select {
    min-width: 0;
  }
  .unmapped-sender-row__actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    min-width: 0;
  }
  .unmapped-sender-row__actions button {
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .form-page-header-main { flex-wrap: nowrap; }
    .form-page-header-tools { gap: 4px; }
    .form-page-header-title h1 { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .form-page-header-actions {
      justify-content: stretch;
    }
    .form-page-header-actions .v3-add-fab {
      flex: 1;
      justify-content: center;
      min-height: 2.5em;
    }
    .form-page-filter-row {
      flex-direction: column;
      align-items: stretch;
    }
    .form-page-filter-field {
      width: 100%;
      flex: 1 1 100%;
    }
    .form-page-filter-actions {
      width: 100%;
    }
    .form-page-filter-actions .form-page-btn {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
    }
    .form-page-actions-row .form-page-btn,
    .form-page-actions-row .v3-add-fab,
    .form-page-actions-row button {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
      justify-content: center;
    }
    .form-page-panel-bar { flex-direction: column; align-items: stretch; }
    .form-page-panel-bar .form-page-search { width: 100%; }
    .form-page-panel-bar .form-page-date { width: 100%; }
    .form-page-panel-bar .form-page-date .themed-date-picker { width: 100%; }
    .form-page-panel-bar .form-page-date .themed-date-input { width: 100%; box-sizing: border-box; }
    .form-page-table--ai-form-actions th,
    .form-page-table--ai-form-actions td {
      padding: 6px 6px;
      font-size: 0.88em;
    }
    .form-page-table--ai-form-actions .col-actions {
      width: 72px;
    }
    .unmapped-sender-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .unmapped-sender-filter-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .unmapped-sender-filter-search,
    .unmapped-sender-filter-kind {
      flex: 1 1 100%;
      width: 100%;
    }
    .unmapped-sender-filter-count {
      padding-bottom: 0;
    }
    .unmapped-sender-row {
      grid-template-columns: 1fr;
      gap: 10px;
      align-items: stretch;
    }
    .unmapped-sender-row__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
      align-items: center;
    }
    .unmapped-sender-row__actions {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .unmapped-sender-row__actions button {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
    }
  }
`;
