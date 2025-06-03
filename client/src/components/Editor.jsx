import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

export default function CodeEditor({ value, onChange, socket, roomId }) {
  const editorRef = useRef(null);
  const [remoteCursor, setRemoteCursor] = useState(null);
  const clientId = useRef(Math.random().toString(36).slice(2));

  // Handle local cursor change and emit to server
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      if (roomId) {
        socket.emit("cursor-change", {
          roomId,
          cursor: position,
          clientId: clientId.current,
        });
      }
    });
  };

  // Listen for remote cursor updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ cursor, clientId: remoteId }) => {
      if (remoteId !== clientId.current) {
        setRemoteCursor(cursor);
      }
    };
    socket.on("remote-cursor", handler);
    return () => socket.off("remote-cursor", handler);
  }, [socket]);

  // Render remote cursor
  useEffect(() => {
    if (!editorRef.current || !remoteCursor) return;
    const editor = editorRef.current;
    // Remove previous decorations
    editor.deltaDecorations(
      editor._remoteCursorDecorations || [],
      []
    );
    // Add new decoration
    editor._remoteCursorDecorations = editor.deltaDecorations(
      [],
      [
        {
          range: new window.monaco.Range(
            remoteCursor.lineNumber,
            remoteCursor.column,
            remoteCursor.lineNumber,
            remoteCursor.column
          ),
          options: {
            className: "remote-cursor",
            stickiness: 1,
            afterContentClassName: "remote-cursor-label",
          },
        },
      ]
    );
  }, [remoteCursor]);

  const handleChange = (newValue) => {
    onChange(newValue || "");
  };

  return (
    <>
      <style>{`
        .remote-cursor {
          border-left: 2px solid #ff00ff;
          margin-left: -1px;
        }
        .remote-cursor-label::after {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #ff00ff;
          border-radius: 50%;
          margin-left: 2px;
        }
      `}</style>
      <Editor
        height="80vh"
        defaultLanguage="javascript"
        defaultValue="// Start coding here..."
        value={value}
        onChange={handleChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          automaticLayout: true,
        }}
      />
    </>
  );
}
