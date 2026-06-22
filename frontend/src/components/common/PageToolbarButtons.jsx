import React from "react";
import { Sun, Moon, HelpCircle } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import PageFontSizeButton from "./PageFontSizeButton.jsx";

export default function PageToolbarButtons({
  fontLevel,
  onCycleFont,
  onHelp,
  showHelp = true,
  btnClass = "v3-icon-btn-gentle",
}) {
  const { isDarkMode, toggleDarkMode } = useAppTheme();

  return (
    <>
      <button
        type="button"
        onClick={toggleDarkMode}
        className={btnClass}
        title={isDarkMode ? "تم روشن" : "تم تیره"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <PageFontSizeButton level={fontLevel} onCycle={onCycleFont} className={btnClass} />
      {showHelp && onHelp ? (
        <button type="button" onClick={onHelp} className={btnClass} title="راهنما">
          <HelpCircle size={18} />
        </button>
      ) : null}
    </>
  );
}
