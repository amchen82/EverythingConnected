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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Paper
} from '@mui/material';

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

// Add this interface for props
interface CanvasProps {
  currentWorkflowId?: string | null;
  mode?: 'light' | 'dark';
}

const Canvas = forwardRef<any, CanvasProps>((props, ref) => {
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [output, setOutput] = useState<string>("");
const [logOutput, setLogOutput] = useState<string[]>([]);
const wsRef = useRef<WebSocket | null>(null);
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
      // Render the Google Sign-In button
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });

      // Set up the OAuth2 token client
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: "600728715852-5grvn63j2hhnir4448fcbgeoa2t92bre.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: async (response: any) => {
          localStorage.setItem("gmail_token", response.access_token);

          // Fetch user info using the access token
          try {
            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            });
            const userInfo = await userInfoRes.json();
            setGmailUser(userInfo.email || userInfo.name || null);
          } catch (err) {
            setGmailUser("Connected");
          }
        },
      });

      // Attach click handler to the rendered button
      if (googleButtonRef.current) {
        googleButtonRef.current.onclick = () => {
          tokenClient.requestAccessToken();
        };
      }
    }
  }, [selectedNode, gmailUser]);

  // Subscribe to logs when a workflow is run
  useEffect(() => {
    if (!props.currentWorkflowId) return;
    setLogOutput([]); // Clear previous logs
    wsRef.current = new WebSocket(`ws://localhost:8000/workflows/ws/workflow_log/${props.currentWorkflowId}`);
    wsRef.current.onmessage = (event) => {
      setLogOutput((prev) => [...prev, event.data]);
    };
    return () => {
      wsRef.current?.close();
    };
  }, [props.currentWorkflowId]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: props.mode === 'dark' ? '#181818' : '#fff',
        color: props.mode === 'dark' ? '#fff' : '#000'
      }}
    >
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
      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)}>
        <DialogTitle>Edit Node</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="node-edit-form"
            onSubmit={handleNodeUpdate}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}
          >
            <TextField
              label="Type"
              value={selectedNode?.data.type || ''}
              onChange={e => updateSelectedField('type', e.target.value)}
              placeholder="trigger / action"
              size="small"
              fullWidth
              margin="dense"
            />
            <TextField
              label="Service"
              value={selectedNode?.data.label || ''}
              onChange={e => updateSelectedField('label', e.target.value)}
              placeholder="gmail / notion / etc"
              size="small"
              fullWidth
              margin="dense"
            />
            <TextField
              label="Action"
              value={selectedNode?.data.action || ''}
              onChange={e => updateSelectedField('action', e.target.value)}
              placeholder="new_file / create_page"
              size="small"
              fullWidth
              margin="dense"
            />
            {selectedNode?.data.type === "trigger" && selectedNode?.data.label === "gmail" && (
              <Box mt={2} p={2} borderRadius={1} bgcolor={gmailUser ? "success.light" : "grey.100"}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: gmailUser ? "success.main" : "grey.400"
                    }}
                  />
                  <Typography variant="body2">
                    {gmailUser
                      ? <>Logged in as <b>{gmailUser}</b></>
                      : "Not connected to Gmail"}
                  </Typography>
                  {gmailUser && (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ ml: 2 }}
                      onClick={() => {
                        localStorage.removeItem("gmail_token");
                        setGmailUser(null);
                      }}
                    >
                      Sign out
                    </Button>
                  )}
                </Stack>
                {!gmailUser && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      if (window.google) {
                        const tokenClient = window.google.accounts.oauth2.initTokenClient({
                          client_id: "600728715852-5grvn63j2hhnir4448fcbgeoa2t92bre.apps.googleusercontent.com",
                          scope: 'https://www.googleapis.com/auth/gmail.readonly',
                          callback: async (response: any) => {
                            localStorage.setItem("gmail_token", response.access_token);
                            try {
                              const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                                headers: {
                                  Authorization: `Bearer ${response.access_token}`,
                                },
                              });
                              const userInfo = await userInfoRes.json();
                              setGmailUser(userInfo.email || userInfo.name || null);
                            } catch (err) {
                              setGmailUser("Connected");
                            }
                          },
                        });
                        tokenClient.requestAccessToken();
                      }
                    }}
                  >
                    Connect Gmail
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)} color="secondary">
            Cancel
          </Button>
          <Button type="submit" form="node-edit-form" variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Output Panel */}
      <Paper
        elevation={2}
        sx={{
          mt: 'auto',
          borderRadius: 2,
          bgcolor: props.mode === 'dark' ? '#232323' : '#fafafa',
          p: 2,
          fontFamily: 'monospace',
          fontSize: '1rem',
          color: props.mode === 'dark' ? '#fff' : '#333',
          minHeight: 100,
          boxShadow: 1,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>Output:</Typography>
        <Box sx={{ whiteSpace: 'pre-wrap' }}>
          {logOutput.length ? logOutput.join('\n') : "No output yet."}
        </Box>
      </Paper>
    </div>
  );
});

export default Canvas;
