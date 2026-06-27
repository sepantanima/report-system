import React from "react";
import FormPageLayout from "../common/FormPageLayout.jsx";

export default function AnalysisPageShell({
  title,
  subtitle,
  children,
  wide = true,
  backTo = "/main",
  onHelp,
  helpTitle = "راهنما",
}) {
  return (
    <FormPageLayout
      title={title}
      subtitle={subtitle}
      backTo={backTo}
      onHelp={onHelp}
      helpTitle={helpTitle}
      card
      wide={wide}
    >
      {children}
    </FormPageLayout>
  );
}
