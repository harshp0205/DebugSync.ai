import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

export default function CodeEditor({ value, onChange, socket, roomId, remoteCursors }) {
  const editorRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).slice(2));

  // Helper to get color for a username
  function getColorForUser(username) {
    const palette = [
      '#ff4b4b', '#4bafff', '#4bffb3', '#ffb34b', '#b34bff', '#ff4bb3', '#4bff4b', '#ffd24b', '#4bffd2', '#d24bff', '#ff4bd2', '#4bd2ff', '#d2ff4b', '#b3ff4b', '#4bb3ff', '#ffb3b3', '#b3b3ff', '#b3ffb3', '#ffb3ff', '#b3ffff', '#ffffb3'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  // // Get current username from localStorage (for sidebar display)
  // const currentUsername = localStorage.getItem("username") || "You";

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
    const handler = ({ cursor, clientId: remoteId, username }) => {
      // Only show remote cursors, not the local user's own cursor
      if (remoteId !== clientId.current && username !== clientId.current) {
        setRemoteCursor(cursor);
      }
    };
    socket.on("remote-cursor", handler);
    return () => socket.off("remote-cursor", handler);
  }, [socket]);

  // Render all remote cursors
  useEffect(() => {
    if (!editorRef.current || !remoteCursors) return;
    const editor = editorRef.current;
    // Only render remote cursors, not the local user's own cursor
    const decorations = Object.values(remoteCursors)
      .filter(({ username }) => username !== clientId.current)
      .map(({ cursor, color, username }) => ({
        range: new window.monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column),
        options: {
          className: `remote-cursor remote-cursor-color-${username}`,
          stickiness: 1,
          afterContentClassName: "remote-cursor-label",
          after: {
            content: username,
            inlineClassName: "remote-cursor-username",
          },
          isWholeLine: false,
        },
      }));
    editor._remoteCursorDecorations = editor.deltaDecorations(editor._remoteCursorDecorations || [], decorations);
    // Inject dynamic styles for each user color
    const styleId = 'remote-cursor-colors';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    let css = '';
    Object.values(remoteCursors).forEach(({ username, color }) => {
      css += `.remote-cursor-color-${username} { border-left: 2.5px solid ${color} !important; background: none !important; animation: live-blink 1s steps(1) infinite; }
      .remote-cursor-username { color: ${color} !important; font-size: 11px; margin-left: 4px; font-weight: bold; }
      .remote-cursor-label::after { display: none !important; }
      `;
    });
    // Style for the vertical line and blinking effect
    css += `@keyframes live-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.2; } }
    .remote-cursor { border-left: 2.5px solid; height: 1.4em; margin-left: -1.5px; background: none !important; animation: live-blink 1s steps(1) infinite; }`;
    styleTag.innerHTML = css;
  }, [remoteCursors]);

  const handleChange = (newValue) => {
    onChange(newValue || "");
  };

  return (
    <>
      
      <Editor
        height="65vh"
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
