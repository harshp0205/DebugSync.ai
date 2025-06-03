import Editor from "@monaco-editor/react";

export default function CodeEditor({ value, onChange }) {
  const handleChange = (newValue) => {
    onChange(newValue || "");
  };

  return (
    <Editor
      height="80vh"
      defaultLanguage="javascript"
      value={value}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 16,
        automaticLayout: true,
      }}
    />
  );
}
