export const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++", editorLanguage: "cpp" },
  { value: "py", label: "Python", editorLanguage: "python" },
  { value: "js", label: "JavaScript", editorLanguage: "javascript" },
  { value: "cs", label: "C#", editorLanguage: "csharp" },
  { value: "java", label: "Java", editorLanguage: "java" },
];

export function getEditorLanguage(language) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === language)?.editorLanguage ||
    "plaintext"
  );
}

export function getLanguageLabel(language) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ||
    language.toUpperCase()
  );
}
