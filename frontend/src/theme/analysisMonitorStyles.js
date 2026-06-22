export const ANALYSIS_MONITOR_CSS = `
  .v3-navbar { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
  .v3-nav-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .v3-nav-row.sub { margin-top: 2px; align-items: stretch; }
  .v3-nav-tools { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .v3-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(30,41,59,0.5); color: #94a3b8; cursor: pointer; flex-shrink: 0; }
  body.light .v3-icon-btn { border-color: #cbd5e1; background: #f1f5f9; color: #475569; }
  .v3-icon-btn.active { background: rgba(56,189,248,0.15); color: #38bdf8; border-color: #38bdf8; }
  .v3-icon-btn-gentle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #94a3b8; cursor: pointer; }
  .v3-search-input { flex: 1; min-width: 140px; display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 12px; }
  .v3-search-input input { background: none; border: none; outline: none; flex: 1; color: inherit; font-size: 13px; font-family: Tahoma, sans-serif; }
  .v3-date-box { display: flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 10px; font-size: 12px; background: rgba(255,255,255,0.02); }
  .v3-summary-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 5px 12px; border-radius: 10px; background: rgba(56,189,248,0.04); border: 1px solid rgba(56,189,248,0.12); font-size: 12px; flex: 1; min-width: 200px; }
  .v3-stat-seg { display: flex; align-items: center; gap: 6px; color: var(--seg-color, #38bdf8); }
  .v3-stat-seg b { font-size: 13px; background: color-mix(in srgb, var(--seg-color, #38bdf8) 18%, transparent); padding: 1px 7px; border-radius: 5px; }
  .v3-stat-divider { width: 1px; height: 18px; background: rgba(255,255,255,0.15); }
  .v3-side-filter { position: fixed; top: 0; bottom: 0; right: -320px; z-index: 2500; padding: 20px; transition: right 0.3s; box-shadow: -5px 0 15px rgba(0,0,0,0.3); overflow-y: auto; width: 290px; box-sizing: border-box; }
  .v3-side-filter.open { right: 0; }
  .v3-filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
  .v3-filter-label { display: block; font-size: 11px; opacity: 0.6; margin: 8px 0 4px; }
  .v3-select-filter { width: 100%; border-radius: 10px; padding: 8px 12px; font-family: inherit; font-size: 13px; cursor: pointer; outline: none; box-sizing: border-box; }
  .v3-reset-btn { background: none; border: none; color: #f87171; display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .v3-content-scroll { flex: 1; overflow-y: auto; padding: 15px; }
  .v3-content-fill { overflow: hidden; display: flex; flex-direction: column; min-height: 0; padding: 10px 12px; }
  .v3-report-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
  @media (min-width: 768px) { .v3-report-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); } }
  .v3-report-card { border-radius: 20px; padding: 15px; position: relative; overflow: hidden; display: flex; flex-direction: column; min-height: 200px; cursor: pointer; transition: transform 0.15s; }
  .v3-report-card:hover { transform: translateY(-2px); }
  .v3-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 12px; box-sizing: border-box; }
  .v3-modal-box { width: 100%; max-width: 520px; border-radius: 16px; max-height: 90vh; display: flex; flex-direction: column; }
  .v3-modal-header-new { display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .v3-modal-body { overflow-y: auto; padding: 20px; box-sizing: border-box; }
  .v3-modal-footer-new { padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; gap: 10px; justify-content: flex-end; }
  .v3-btn-footer { padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-weight: bold; font-size: 13px; }
  .v3-primary-solid { background: #0ea5e9; color: #fff; }
  .v3-secondary-btn { background: rgba(255,255,255,0.06); color: inherit; border: 1px solid rgba(255,255,255,0.1); }
  .v3-label-new { font-size: 12px; opacity: 0.7; margin-bottom: 6px; display: block; }
  .v3-input-new, .v3-textarea-new, .v3-select-new { width: 100%; box-sizing: border-box; border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 13px; outline: none; margin-bottom: 12px; }
  .v3-textarea-new { min-height: 90px; resize: vertical; }
  .page-font-root { font-size: var(--page-font-size, 14px); }
  .page-font-root .v3-search-input input { font-size: 0.93em; }
  .page-font-root .v3-icon-btn { width: 2.714em; height: 2.714em; }
  .page-font-root .v3-icon-btn svg { width: 1.15em; height: 1.15em; }
  .page-font-root .v3-add-fab { font-size: 0.86em; }
  .page-font-root .v3-summary-bar { font-size: 0.86em; }
  .page-font-root .v3-stat-seg b { font-size: 1.08em; }
  .page-font-root .news-choice-btn { font-size: 0.86em; min-height: 2.6em; padding: 0.65em 0.5em; }
  .page-font-root .v3-btn-footer,
  .page-font-root button,
  .page-font-root input,
  .page-font-root textarea,
  .page-font-root select { font-size: inherit; }
  .page-font-root .v3-filter-label { font-size: 0.79em; }
  .page-font-root .v3-select-filter { font-size: 0.93em; }
  .rich-text-toolbar-btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 1.85em; min-height: 1.85em; padding: 0.25em 0.35em;
    border-radius: 6px; cursor: pointer; font-family: inherit;
    border: 1px solid var(--rte-btn-border, #334155);
    background: var(--rte-btn-bg, #1e293b);
    color: var(--rte-btn-color, #e2e8f0);
    transition: background 0.12s, border-color 0.12s;
  }
  .rich-text-toolbar-btn:hover { border-color: #38bdf8; color: #38bdf8; }
  .rich-text-toolbar-btn.active { background: rgba(56,189,248,0.15); border-color: #38bdf8; color: #38bdf8; }
  .rich-text-toolbar-btn svg { width: 0.95em; height: 0.95em; }
  .rich-text-fs-btn { min-width: 1.85em; min-height: 1.85em; }
  .news-view-toggle {
    display: inline-flex; align-items: center; gap: 0.35em;
    padding: 0.35em 0.65em; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03); color: #94a3b8; cursor: pointer;
    font-family: inherit; font-size: 0.75em; font-weight: 600; white-space: nowrap;
  }
  body.light .news-view-toggle { border-color: #cbd5e1; background: #f1f5f9; color: #475569; }
  .news-view-toggle svg { width: 0.95em; height: 0.95em; }
  .v3-header-controls-mobile { display: none; }
  .v3-add-fab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: bold; color: #fff; background: #0ea5e9; white-space: nowrap; }
  .v3-add-fab-row { flex-shrink: 0; }
  .v3-tab-row { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
  .v3-tab-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; cursor: pointer; font-family: inherit; font-size: 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  .v3-tab-btn.active { background: rgba(56,189,248,0.15); color: #38bdf8; border-color: rgba(56,189,248,0.4); }
  @media (max-width: 768px) {
    .v3-nav-row.sub { flex-direction: column; gap: 8px; }
    .v3-date-row { width: 100%; justify-content: center; display: flex; order: 0; }
    .v3-summary-bar {
      width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-start;
      direction: rtl;
      gap: 8px 12px;
      order: 1;
    }
    .v3-stat-divider { display: none; }
    .v3-stat-seg { flex: 0 0 auto; }
    .v3-add-fab-row { width: 100%; justify-content: center; order: 2; }
    .v3-search-input { min-width: 0; }
  }
`;
