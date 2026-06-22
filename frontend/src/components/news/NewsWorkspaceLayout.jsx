import React from "react";
import ResizableNewsColumns from "./ResizableNewsColumns.jsx";

export default function NewsWorkspaceLayout({
  listPane,
  centerPane,
  reviewPane,
  isMobile,
  mobileDrawer,
  drawerOpen = false,
  theme,
}) {
  if (isMobile) {
    if (drawerOpen) {
      return mobileDrawer;
    }
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: 8,
          }}
        >
          {listPane}
        </div>
      </div>
    );
  }

  return (
    <ResizableNewsColumns
      listPane={listPane}
      centerPane={centerPane}
      reviewPane={reviewPane}
      theme={theme}
    />
  );
}
