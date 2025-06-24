import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useCallback,
  useEffect
} from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  Node,
} from 'react-flow-renderer';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    google: any;
  }
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

const Canvas = forwardRef((props, ref) => {
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [output, setOutput] = useState<string>("");
const onConnect = useCallback((params:Connection) => setEdges((eds) => addEdge(params, eds)), []);



useImperativeHandle(ref, () => ({
  getWorkflowJson: (name: string) => ({
    name,
    workflow: nodes.map((n) => ({
      id: n.id, // <-- Save node id!
      type: n.data.type,
      service: n.data.label,
      action: n.data.action,
    })),
    edges,
  }),
  loadWorkflow: (workflowData: any) => {
      const verticalSpacing = 120; // pixels between nodes
  const startX = 300;
  const startY = 100;
   console.log("[CANVAS] Received workflowData:", workflowData);
    const newNodes = workflowData.workflow.map((step:any, index:number) => ({
      id: step.id ||String(index),
      type: 'default',
      position: { x: startX, y: startY + index * verticalSpacing },

      data: {
        label: step.service,
        type: step.type,
        action: step.action,
      },
    }));
    setNodes(newNodes);
    setEdges(workflowData.edges || []); // optionally clear edges
  },
  setOutput,
}));

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('type');
    const position = {
      x: event.clientX - 250,
      y: event.clientY - 50,
    };

    const newNode = {
      id: uuidv4(),
      type: 'default',
      position,
      data: {
        label: type,
        type: type === 'gmail' ? 'trigger' : 'action',
        action: 'default_action',
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  // const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const handleNodeUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode?.id) {
        return {
          ...node,
          data: {
            ...selectedNode.data,
          },
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    setSelectedNode(null);
  };

  const updateSelectedField = (field: string, value: string) => {
    if (selectedNode) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          [field]: value,
        },
      });
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, setNodes, setEdges]);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [gmailUser, setGmailUser] = useState<string | null>(null);

  useEffect(() => {
    // On mount, check if already connected
    const token = localStorage.getItem("gmail_token");
    if (token) {
      const payload = parseJwt(token);
      setGmailUser(payload?.email || payload?.name || null);
    }
  }, []);

  useEffect(() => {
    if (
      selectedNode &&
      selectedNode.data.type === "trigger" &&
      selectedNode.data.label === "gmail" &&
      window.google &&
      googleButtonRef.current &&
      !gmailUser // Only show button if not connected
    ) {
      
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: "600728715852-5grvn63j2hhnir4448fcbgeoa2t92bre.apps.googleusercontent.com", // Use client ID from .env
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (response: any) => {
           console.log("Google login callback", response);
          localStorage.setItem("gmail_token", response.access_token);
          console.log(localStorage.getItem("gmail_token"));
          const payload = parseJwt(response.access_token);
          const user = payload?.email || payload?.name || null;
          setGmailUser(user);
        },
      });

      tokenClient.requestAccessToken();

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });
    }
  }, [selectedNode, gmailUser]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>

      {/* Node Edit Popup */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white',
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 8,
          zIndex: 1000,
        }}>
          <h4>Edit Node</h4>
          <form onSubmit={handleNodeUpdate}>
            <label>Type: </label>
            <input
              value={selectedNode.data.type}
              onChange={(e) => updateSelectedField('type', e.target.value)}
              placeholder="trigger / action"
            /><br />
            <label>Service: </label>
            <input
              value={selectedNode.data.label}
              onChange={(e) => updateSelectedField('label', e.target.value)}
              placeholder="gmail / notion / etc"
            /><br />
            <label>Action: </label>
            <input
              value={selectedNode.data.action}
              onChange={(e) => updateSelectedField('action', e.target.value)}
              placeholder="new_file / create_page"
            /><br />
            <button type="submit">Save</button>
          </form>
          {selectedNode.data.type === "trigger" &&
          selectedNode.data.label === "gmail" && (
            <div style={{ margin: "16px 0" }}>
              {!gmailUser && <div ref={googleButtonRef}></div>}
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: gmailUser ? "#e6f4ea" : "#f5f5f5",
                  color: gmailUser ? "#137333" : "#555",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: gmailUser ? "0 1px 4px rgba(19,115,51,0.08)" : "none",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: gmailUser ? "#34a853" : "#ccc",
                    marginRight: 8,
                  }}
                />
                {gmailUser
                  ? (
                    <>
                      Logged in as <span style={{ fontWeight: 700 }}>{gmailUser}</span>
                      <button
                        style={{
                          marginLeft: 16,
                          padding: "2px 10px",
                          border: "none",
                          borderRadius: 4,
                          background: "#eee",
                          color: "#d93025",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                        onClick={() => {
                          localStorage.removeItem("gmail_token");
                          setGmailUser(null);
                        }}
                      >
                        Sign out
                      </button>
                    </>
                  )
                  : "Not connected to Gmail"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Output Panel */}
      <div
        style={{
          marginTop: "auto",
          background: "#f7f7f7",
          borderTop: "1px solid #ddd",
          padding: "16px",
          minHeight: "80px",
          fontFamily: "monospace",
          fontSize: "1rem",
          color: "#333",
        }}
      >
        <strong>Output:</strong>
        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
          {output || "No output yet."}
        </div>
      </div>
    </div>
  );
});

export default Canvas;
