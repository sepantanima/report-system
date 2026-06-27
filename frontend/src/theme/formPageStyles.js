/** CSS مشترک صفحات فرم — ریسپانسیو، جداول، فونت ورودی */
export const FORM_PAGE_CSS = `
  .page-font-root textarea,
  .page-font-root input[type="text"],
  .page-font-root input[type="search"],
  .page-font-root input[type="password"],
  .page-font-root input[type="number"],
  .page-font-root input[type="url"],
  .page-font-root input:not([type]),
  .page-font-root select {
    font-size: inherit !important;
  }
  .page-font-root .themed-date-input {
    font-size: inherit !important;
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

  @media (max-width: 768px) {
    .form-page-header-main { flex-wrap: nowrap; }
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
  }
`;
