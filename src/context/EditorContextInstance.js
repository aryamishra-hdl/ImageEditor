import { createContext, useContext } from "react";
export const EditorContext = createContext(null);

export const useEditorContext = () => {
  const ctx = useContext(EditorContext);
  if (!ctx)
    throw new Error("useEditorContext must be used inside <EditorProvider>");
  return ctx;
};
