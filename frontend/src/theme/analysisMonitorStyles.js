import { PAGE_WIDE_MAX, PAGE_NARROW_MAX } from "../constants/pageLayoutWidths.js";

export const ANALYSIS_MONITOR_CSS = `
  .v3-navbar { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
  .v3-nav-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .v3-nav-row.sub { margin-top: 2px; align-items: stretch; }
  .v3-nav-tools { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .v3-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(30,41,59,0.5); color: #94a3b8; cursor: pointer; flex-shrink: 0; }
  body.light .v3-icon-btn { border-color: #cbd5e1; background: #f1f5f9; color: #475569; }
  .v3-icon-btn.active { background: rgba(56,189,248,0.15); color: #38bdf8; border-color: #38bdf8; }
  .v3-icon-btn-gentle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #94a3b8; cursor: pointer; }
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
  .v3-search-input { flex: 1; min-width: 140px; display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 12px; }
  .v3-search-input input { background: none; border: none; outline: none; flex: 1; color: inherit; font-size: 13px; font-family: Tahoma, sans-serif; }
  .v3-nav-date-priority-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    flex-shrink: 0;
  }
  .v3-date-box { display: flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 10px; font-size: 12px; background: rgba(255,255,255,0.02); }
  .v3-nav-priority-filter { flex-shrink: 0; min-width: 120px; }
  .v3-nav-priority-select { width: 100%; background: transparent; border: none; outline: none; color: inherit; font-family: inherit; font-size: 12px; cursor: pointer; }
  .v3-summary-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 5px 12px; border-radius: 10px; background: rgba(56,189,248,0.04); border: 1px solid rgba(56,189,248,0.12); font-size: 12px; flex: 1; min-width: 200px; }
  .v3-stat-seg { display: flex; align-items: center; gap: 6px; color: var(--seg-color, #38bdf8); }
  .v3-stat-seg.v3-stat-clickable { cursor: pointer; border-radius: 8px; padding: 2px 4px; transition: background 0.15s; }
  .v3-stat-seg.v3-stat-clickable:hover { background: color-mix(in srgb, var(--seg-color, #38bdf8) 12%, transparent); }
  .v3-stat-seg b { font-size: 13px; background: color-mix(in srgb, var(--seg-color, #38bdf8) 18%, transparent); padding: 1px 7px; border-radius: 5px; }
  .v3-stat-divider { width: 1px; height: 18px; background: rgba(255,255,255,0.15); }
  .v3-side-filter { position: fixed; top: 0; bottom: 0; right: -320px; z-index: 2500; padding: 20px; transition: right 0.3s; box-shadow: -5px 0 15px rgba(0,0,0,0.3); overflow-y: auto; width: 290px; box-sizing: border-box; }
  .v3-side-filter.open { right: 0; }
  .v3-filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
  .v3-filter-label { display: block; font-size: 11px; opacity: 0.6; margin: 8px 0 4px; }
  .v3-select-filter { width: 100%; border-radius: 10px; padding: 8px 12px; font-family: inherit; font-size: 13px; cursor: pointer; outline: none; box-sizing: border-box; }
  .v3-reset-btn { background: none; border: none; color: #f87171; display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .v3-content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 15px; min-width: 0; }
  .v3-content-fill { overflow: hidden; display: flex; flex-direction: column; min-height: 0; padding: 10px 12px; }
  .v3-report-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
  @media (min-width: 768px) { .v3-report-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); } }
  .v3-topic-card-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 640px) { .v3-topic-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: ${PAGE_WIDE_MAX}px) { .v3-topic-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .v3-topic-card-pill { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
  .v3-topic-card-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .v3-topic-card-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  body.light .v3-topic-card-btn { border-color: #cbd5e1; background: #f8fafc; }
  .v3-topic-card-btn.primary { border-color: rgba(56,189,248,0.35); color: #38bdf8; background: rgba(56,189,248,0.08); }
  .v3-topic-card-btn.success { border-color: rgba(16,185,129,0.35); color: #10b981; background: rgba(16,185,129,0.08); }
  .v3-topic-card-btn.danger { border-color: rgba(239,68,68,0.3); color: #ef4444; background: rgba(239,68,68,0.06); }
  .v3-topic-card-btn.muted { color: #94a3b8; }
  .v3-report-card { border-radius: 20px; padding: 15px; position: relative; overflow: hidden; display: flex; flex-direction: column; min-height: 200px; transition: transform 0.15s; }
  .v3-report-card[role="button"] { cursor: pointer; }
  .v3-report-card[role="button"]:hover { transform: translateY(-2px); }
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
  .v3-tab-row { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
  .v3-tab-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; cursor: pointer; font-family: inherit; font-size: 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .v3-tab-btn.active { background: rgba(56,189,248,0.15); color: #38bdf8; border-color: rgba(56,189,248,0.4); }
  .v3-tab-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
  .v3-tab-badge-action { background: #ef4444; color: #fff; }
  .v3-tab-badge-highlight { background: #dc2626; color: #fff; }
  .v3-tab-badge-count { background: rgba(100,116,139,0.2); color: #94a3b8; border: 1px solid rgba(100,116,139,0.35); }
  body.light .v3-tab-badge-count { background: #e2e8f0; color: #475569; border-color: #cbd5e1; }
  .v3-topic-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
  body.light .v3-topic-table-wrap { border-color: #e2e8f0; }
  .v3-topic-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: ${PAGE_WIDE_MAX}px; }
  .v3-topic-table th { padding: 10px 10px; text-align: right; font-weight: 600; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
  body.light .v3-topic-table th { border-bottom-color: #e2e8f0; background: #f8fafc; }
  .v3-topic-table th.sortable { cursor: pointer; user-select: none; }
  .v3-topic-table th.sortable:hover { color: #38bdf8; }
  .v3-topic-table td { padding: 10px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; line-height: 1.6; }
  body.light .v3-topic-table td { border-bottom-color: #f1f5f9; }
  .v3-topic-table tr:hover td { background: rgba(56,189,248,0.04); }
  .v3-topic-table .topic-title-cell { font-weight: 600; max-width: 240px; }
  .v3-topic-table .topic-desc-snippet { font-size: 11px; opacity: 0.7; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .v3-topic-table .status-pill, .v3-topic-table .priority-pill { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
  .v3-topic-table .ops-cell { display: flex; flex-wrap: wrap; gap: 6px; min-width: 140px; }
  .v3-topic-table .ops-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  body.light .v3-topic-table .ops-btn { border-color: #cbd5e1; background: #f8fafc; }
  .v3-topic-table .ops-btn.primary { border-color: rgba(56,189,248,0.35); color: #38bdf8; background: rgba(56,189,248,0.08); }
  .v3-topic-table .ops-btn.success { border-color: rgba(16,185,129,0.35); color: #10b981; background: rgba(16,185,129,0.08); }
  .v3-topic-table .ops-btn.danger { border-color: rgba(239,68,68,0.3); color: #ef4444; background: rgba(239,68,68,0.06); }
  .v3-topic-table .ops-btn.muted { color: #94a3b8; }
  .v3-topic-table .return-hint { font-size: 10px; margin-top: 4px; padding: 4px 6px; border-radius: 6px; background: rgba(245,158,11,0.1); color: #f59e0b; max-width: 220px; }
  .v3-briefs-subtabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .v3-briefs-subtab-btn { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; font-family: inherit; text-align: center; }
  .v3-briefs-layout { display: flex; flex-direction: column; gap: 12px; min-width: 0; width: 100%; }
  .v3-briefs-list-pane { display: flex; flex-direction: column; gap: 8px; max-height: none; min-width: 0; width: 100%; }
  .v3-briefs-detail-pane { border-radius: 12px; padding: 12px; min-width: 0; width: 100%; box-sizing: border-box; }
  .v3-briefs-detail-header { display: none; align-items: center; gap: 8px; margin-bottom: 12px; }
  .v3-briefs-back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  body.light .v3-briefs-back-btn { border-color: #cbd5e1; background: #f8fafc; }
  .v3-brief-detail-root { display: flex; flex-direction: column; gap: 14px; padding: 4px; min-width: 0; }
  .v3-brief-detail-content { word-break: break-word; overflow-wrap: anywhere; }
  .v3-brief-action-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .v3-brief-action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .v3-brief-publish-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
  @media (min-width: 900px) {
    .v3-briefs-layout { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(300px, 1.2fr); gap: 16px; align-items: start; }
    .v3-briefs-list-pane { max-height: 70vh; overflow-y: auto; }
    .v3-briefs-subtab-btn { flex: 0 1 auto; min-width: 120px; }
  }
  @media (max-width: 899px) {
    .v3-briefs-layout:not(.has-selection) .v3-briefs-detail-pane { display: none; }
    .v3-briefs-layout.has-selection .v3-briefs-list-pane { display: none; }
    .v3-briefs-layout.has-selection .v3-briefs-detail-header { display: flex; }
    .v3-brief-action-row .v3-brief-action-btn { flex: 1 1 calc(50% - 4px); justify-content: center; min-width: 120px; }
    .v3-brief-publish-row { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .v3-brief-publish-row select { width: 100%; }
    .v3-brief-detail-content { max-height: none; }
    .v3-tab-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); overflow-x: visible; gap: 6px; }
    .v3-tab-btn { justify-content: center; width: 100%; white-space: normal; text-align: center; line-height: 1.4; padding: 10px 6px; font-size: 11px; }
    .v3-navbar { padding: 10px 12px; }
    .v3-nav-row { gap: 6px; }
    .v3-add-fab { width: 100%; justify-content: center; }
  }
  @media (max-width: 768px) {
    .v3-nav-row.sub { flex-direction: column; gap: 8px; }
    .v3-nav-date-priority-row { width: 100%; flex-wrap: wrap; }
    .v3-date-row { width: auto; flex: 1; min-width: 0; justify-content: center; display: flex; order: 0; }
    .v3-nav-priority-filter { flex: 1; min-width: 120px; }
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
  .v3-mission-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 0 12px;
  }
  .v3-mission-section-title {
    font-size: 14px;
    font-weight: 700;
  }
  .v3-mission-section-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .v3-mission-section-count {
    font-size: 12px;
    font-weight: 400;
    opacity: 0.8;
    white-space: nowrap;
  }
  .v3-mission-create-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: #0ea5e9;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .v3-mission-create-btn:hover { background: #0284c7; }
  .v3-mission-groups-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .v3-mission-groups-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .v3-mission-topic-group {
    border-radius: 12px;
    overflow: hidden;
    min-width: 0;
  }
  .v3-mission-topic-group-header {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    cursor: pointer;
    font-family: inherit;
    text-align: right;
    box-sizing: border-box;
    border: none;
    background: transparent;
  }
  @media (max-width: 639px) {
    .v3-mission-topic-group-header {
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto auto;
    }
    .v3-mission-topic-group-head-meta { grid-column: 1 / -1; justify-content: flex-start; }
    .v3-mission-topic-group-assign { grid-row: 1; grid-column: 3; }
  }
  .v3-mission-topic-group-toggle { opacity: 0.7; flex-shrink: 0; }
  .v3-mission-topic-group-head-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .v3-mission-topic-group-code { font-size: 11px; font-weight: 700; }
  .v3-mission-topic-group-title {
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .v3-mission-topic-group-head-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    min-width: 0;
  }
  .v3-mission-topic-group-assign {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(56,189,248,0.35);
    background: rgba(56,189,248,0.1);
    color: #38bdf8;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
  }
  .v3-mission-topic-group-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 12px 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  body.light .v3-mission-topic-group-body { border-top-color: #e2e8f0; }
  .v3-mission-topic-group-empty {
    margin: 10px 4px;
    font-size: 12px;
    opacity: 0.55;
  }
  .v3-mission-ready-strip {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .v3-mission-ready-strip-label { font-size: 12px; font-weight: 600; }
  .v3-mission-ready-strip-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .v3-mission-ready-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 220px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    background: transparent;
  }
  .v3-mission-ready-chip-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.85;
  }
  .v3-mission-ready-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .v3-mission-ready-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    padding: 12px;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    text-align: right;
    transition: filter 0.15s;
  }
  .v3-mission-ready-card:hover { filter: brightness(1.03); }
  .v3-mission-ready-card-code { font-size: 11px; font-weight: 700; }
  .v3-mission-ready-card-title { font-size: 13px; font-weight: 600; line-height: 1.5; }
  .v3-mission-ready-card-cta { font-size: 11px; color: #38bdf8; font-weight: 700; }
  .v3-mission-pane-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }
  .v3-mission-topic-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }
  .v3-mission-topic-pill.muted { opacity: 0.85; }
  .v3-mission-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .v3-mission-list-row {
    display: flex;
    align-items: stretch;
    gap: 0;
    width: 100%;
    padding: 0;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    text-align: right;
    overflow: hidden;
    box-sizing: border-box;
    transition: filter 0.15s;
  }
  .v3-mission-list-row:hover { filter: brightness(1.03); }
  .v3-mission-list-row-accent { width: 4px; flex-shrink: 0; }
  .v3-mission-list-row-body {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .v3-mission-list-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .v3-mission-list-row-analyst {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }
  .v3-mission-list-row-status {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }
  .v3-mission-list-row-sub {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    font-size: 11px;
    opacity: 0.8;
    align-items: center;
  }
  .v3-mission-list-row-deadline-priority {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .v3-mission-topic-deadline-priority { white-space: nowrap; }
  .v3-mission-list-row-chevron {
    align-self: center;
    margin-inline-start: 8px;
    margin-inline-end: 10px;
    opacity: 0.45;
    flex-shrink: 0;
  }
  .v3-mission-detail-pane .v3-mission-list {
    max-height: min(50vh, 480px);
    overflow-y: auto;
  }
  .v3-topic-picker-modal {
    width: 100%;
    max-width: ${PAGE_NARROW_MAX}px;
    max-height: 90vh;
  }
  .v3-topic-picker-toolbar {
    padding: 12px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  body.light .v3-topic-picker-toolbar { border-bottom-color: #e2e8f0; }
  .v3-topic-picker-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .v3-topic-picker-filter-btn {
    padding: 7px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: inherit;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  body.light .v3-topic-picker-filter-btn { border-color: #cbd5e1; background: #f8fafc; }
  .v3-topic-picker-filter-btn.active {
    background: rgba(56,189,248,0.15);
    color: #38bdf8;
    border-color: rgba(56,189,248,0.4);
    font-weight: 700;
  }
  .v3-topic-picker-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 10px;
    margin-bottom: 12px;
    background: rgba(255,255,255,0.02);
  }
  body.light .v3-topic-picker-search { background: #f8fafc; }
  .v3-topic-picker-search input {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    color: inherit;
    font-family: inherit;
    font-size: 13px;
    min-width: 0;
  }
  .v3-topic-picker-body {
    padding-top: 12px !important;
  }
  .v3-topic-picker-count {
    font-size: 11px;
    opacity: 0.7;
    margin: 0 0 12px;
  }
  .v3-topic-picker-empty {
    text-align: center;
    opacity: 0.5;
    padding: 32px 12px;
    font-size: 13px;
    margin: 0;
  }
  .v3-topic-picker-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .v3-topic-pick-card {
    width: 100%;
    text-align: right;
    border-radius: 14px;
    padding: 12px 14px;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.12s, box-shadow 0.12s;
    box-sizing: border-box;
  }
  .v3-topic-pick-card:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }
  .v3-topic-pick-card.is-new {
    border-color: rgba(34,197,94,0.35) !important;
    background: linear-gradient(135deg, rgba(34,197,94,0.06), transparent) !important;
  }
  .v3-topic-pick-card.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .v3-topic-pick-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }
  .v3-topic-pick-card-main {
    min-width: 0;
    flex: 1;
  }
  .v3-topic-pick-code {
    display: block;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .v3-topic-pick-title {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
  }
  .v3-topic-pick-chevron {
    opacity: 0.45;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .v3-topic-pick-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .v3-topic-pick-pill {
    display: inline-block;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .v3-topic-pick-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: 11px;
    opacity: 0.85;
  }
  .v3-topic-pick-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .v3-topic-pick-meta-item.muted { opacity: 0.65; }
  @media (max-width: 640px) {
    .v3-topic-picker-overlay {
      align-items: flex-end;
      padding: 0;
      background: rgba(0,0,0,0.55);
    }
    .v3-topic-picker-modal {
      max-width: none;
      width: 100%;
      border-radius: 20px 20px 0 0;
      max-height: 92vh;
      border-bottom: none;
    }
    .v3-mission-section-header {
      align-items: flex-start;
    }
    .v3-mission-section-meta {
      width: 100%;
      justify-content: space-between;
    }
  }
`;
