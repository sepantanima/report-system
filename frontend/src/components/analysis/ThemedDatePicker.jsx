import React, { forwardRef } from "react";
import DatePicker from "react-multi-date-picker";
import "../../styles/themedDatePicker.css";

const ThemedDatePicker = forwardRef(function ThemedDatePicker(
  { isDarkMode = true, containerClassName = "", inputClass = "", className, ...props },
  ref
) {
  const calendarClass = isDarkMode ? "analysis-calendar-dark" : "analysis-calendar-light";

  return (
    <div className={`themed-date-picker ${containerClassName}`.trim()}>
      <DatePicker
        ref={ref}
        {...props}
        className={calendarClass}
        inputClass={`themed-date-input ${inputClass}`.trim()}
      />
    </div>
  );
});

export default ThemedDatePicker;
