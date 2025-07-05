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
  useReactFlow
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
  Paper,
  IconButton
} from '@mui/material';
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import OpenAIPromptPanel from './OpenAIPromptPanel';

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
  const theme = useTheme();

const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [output, setOutput] = useState<string>("");
const [logOutput, setLogOutput] = useState<string[]>([]);
const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);
const wsRef = useRef<WebSocket | null>(null);
const onConnect = useCallback((params:Connection) => setEdges((eds) => addEdge(params, eds)), []);
const reactFlowInstance = useReactFlow();



useImperativeHandle(ref, () => ({
  getWorkflowJson: (name: string) => ({
    name,
    workflow: nodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      service: n.data.label,
      action: n.data.action,
      parentId: n.data.parentId, // <-- Add this line
    })),
    edges,
  }),
  loadWorkflow: (workflowData: any) => {
  const verticalSpacing = 120;
  const startX = 300;
  const startY = 100;
  const newNodes = workflowData.workflow.map((step: any, index: number) => ({
    id: step.id, // <-- Always use the id from backend
    type: 'default',
    position: { x: startX, y: startY + index * verticalSpacing },
    data: {
      label: step.service,
      type: step.type,
      action: step.action,
      parentId: step.parentId,
    },
  }));
  setNodes(newNodes);
  setEdges(workflowData.edges || []);
},
  setOutput,
}));

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('type');
    if (!type) return;

    // Get bounding rect of the React Flow wrapper
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();

    // Calculate position relative to the canvas and project to flow coordinates
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

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

    setNodes(nds => nds.concat(newNode));
  };

  // const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  const onNodeClick = (_: any, node: Node) => {
    setOpenNodeIds(ids => ids.includes(node.id) ? ids : [...ids, node.id]);
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
  const [notionUser, setNotionUser] = useState<string | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notionToken = params.get('notion_token');
    if (notionToken) {
      localStorage.setItem('notion_token', notionToken);
      setNotionUser('Connected');
      // Optionally, remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Add this function to add a node and open its panel
  const addNodeAndOpenPanel = (type: string) => {
    const verticalSpacing = 120;
    const startX = 300;
    const startY = 100;
    const nodeCount = nodes.length;
    const newNode = {
      id: uuidv4(),
      type: 'default',
      position: { x: startX, y: startY + nodeCount * verticalSpacing },
      data: {
        label: type,
        type: type === 'gmail' ? 'trigger' : 'action',
        action: 'default_action',
      },
    };
    setNodes(nds => nds.concat(newNode));
    setOpenNodeIds(ids => [...ids, newNode.id]);
  };

  const actionOptions: Record<string, string[]> = {
    gmail: ['new_email', 'send_email'],
    notion: ['create_page', 'update_page'],
    youtube: ['upload_video', 'get_comments'],
    googlesheets: ['add_row', 'read_sheet'],
    slack: ['send_message', 'read_channel'],
    facebook: ['post_status', 'get_feed'],
    yahoofinance: ['get_stock', 'get_news'],
    openai: ['generate_text', 'summarize'],
    twilio: ['send_sms', 'make_call'],
  };

  const selectedService = selectedNode?.data.label || '';
  const actions = actionOptions[selectedService] || ['default_action'];

  // Render node panels as a vertical list on the right
  return (
    <Box sx={{ position: "relative", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        onDrop={onDrop}
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
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
              select
              label="Type"
              value={selectedNode?.data.type || ''}
              onChange={e => updateSelectedField('type', e.target.value)}
              size="small"
              fullWidth
              margin="dense"
            >
              <MenuItem value="trigger">Trigger</MenuItem>
              <MenuItem value="action">Action</MenuItem>
            </TextField>
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
              select
              label="Action"
              value={selectedNode?.data.action || ''}
              onChange={e => updateSelectedField('action', e.target.value)}
              size="small"
              fullWidth
              margin="dense"
            >
              {actions.map(action => (
                <MenuItem key={action} value={action}>{action}</MenuItem>
              ))}
            </TextField>
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
            {selectedNode?.data.type === "action" && selectedNode?.data.label === "notion" && (
              <Box mt={2} p={2} borderRadius={1} bgcolor={notionUser ? "success.light" : "grey.100"}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: notionUser ? "success.main" : "grey.400"
                    }}
                  />
                  <Typography variant="body2">
                    {notionUser
                      ? <>Connected as <b>{notionUser}</b></>
                      : "Not connected to Notion"}
                  </Typography>
                  {notionUser && (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ ml: 2 }}
                      onClick={() => {
                        localStorage.removeItem("notion_token");
                        setNotionUser(null);
                      }}
                    >
                      Sign out
                    </Button>
                  )}
                </Stack>
                {!notionUser && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      // Redirect to your backend's Notion OAuth endpoint
                      window.location.href = "http://localhost:8000/notion/oauth/start";
                    }}
                  >
                    Connect Notion
                  </Button>
                )}
              </Box>
            )}
            {selectedNode?.data.label === "notion" && (
              <TextField
                label="Notion Parent ID"
                value={selectedNode?.data.parentId || ""}
                onChange={e => updateSelectedField('parentId', e.target.value)}
                placeholder="Enter Notion page or database ID"
                size="small"
                fullWidth
                margin="dense"
                helperText="Paste your Notion page or database ID here"
              />
            )}
            {selectedNode?.data.label === "openai" && (
              <Box mt={2} p={2} borderRadius={1} bgcolor="grey.100">
                <OpenAIPromptPanel node={selectedNode} setNodes={setNodes} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedNode) {
                setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                setSelectedNode(null);
              }
            }}
            color="error"
            variant="outlined"
          >
            Delete
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
          bgcolor: theme.palette.background.paper,
          p: 2,
          fontFamily: 'monospace',
          fontSize: '1rem',
          color: theme.palette.text.primary,
          minHeight: 100,
          boxShadow: 1,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>Output:</Typography>
        <Box sx={{ whiteSpace: 'pre-wrap' }}>
          {logOutput.length ? logOutput.join('\n') : "No output yet."}
        </Box>
      </Paper>

      {/* Right sidebar for node panels */}
      <Box
        sx={{
          position: "absolute",
          top: 72, // below the icon row (adjust as needed)
          right: 16,
          height: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          zIndex: 100,
          pointerEvents: "none",
        }}
      >
        {openNodeIds.map((id) => {
          const node = nodes.find(n => n.id === id);
          if (!node) return null;
          return (
            <Paper
              key={id}
              elevation={4}
              sx={{
                minWidth: 340,
                maxWidth: 400,
                m: 2,
                mb: 0,
                pointerEvents: "auto",
                position: "relative",
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">Edit Node: {node.data.label}</Typography>
                  <IconButton size="small" onClick={() => setOpenNodeIds(ids => ids.filter(nid => nid !== id))}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                {/* Node edit fields */}
                <Box
                  component="form"
                  sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}
                  onSubmit={e => {
                    e.preventDefault();
                    // No modal to close, just update node in place
                  }}
                >
                  <TextField
                    label="Type"
                    value={node.data.type || ''}
                    onChange={e => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, type: e.target.value } } : n))}
                    placeholder="trigger / action"
                    size="small"
                    fullWidth
                    margin="dense"
                  />
                  <TextField
                    label="Service"
                    value={node.data.label || ''}
                    onChange={e => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n))}
                    placeholder="gmail / notion / etc"
                    size="small"
                    fullWidth
                    margin="dense"
                  />
                  <TextField
                    label="Action"
                    value={node.data.action || ''}
                    onChange={e => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, action: e.target.value } } : n))}
                    placeholder="new_file / create_page"
                    size="small"
                    fullWidth
                    margin="dense"
                  />

                  {/* Gmail trigger fields */}
                  {node.data.type === "trigger" && node.data.label === "gmail" && (
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

                  {/* Notion action fields */}
                  {node.data.type === "action" && node.data.label === "notion" && (
                    <Box mt={2} p={2} borderRadius={1} bgcolor={notionUser ? "success.light" : "grey.100"}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: notionUser ? "success.main" : "grey.400"
                          }}
                        />
                        <Typography variant="body2">
                          {notionUser
                            ? <>Connected as <b>{notionUser}</b></>
                            : "Not connected to Notion"}
                        </Typography>
                        {notionUser && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ ml: 2 }}
                            onClick={() => {
                              localStorage.removeItem("notion_token");
                              setNotionUser(null);
                            }}
                          >
                            Sign out
                          </Button>
                        )}
                      </Stack>
                      {!notionUser && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            window.location.href = "http://localhost:8000/notion/oauth/start";
                          }}
                        >
                          Connect Notion
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Notion Parent ID field */}
                  {node.data.label === "notion" && (
                    <TextField
                      label="Notion Parent ID"
                      value={node.data.parentId || ""}
                      onChange={e => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, parentId: e.target.value } } : n))}
                      placeholder="Enter Notion page or database ID"
                      size="small"
                      fullWidth
                      margin="dense"
                      helperText="Paste your Notion page or database ID here"
                    />
                  )}

                  {/* OpenAI prompt panel */}
                  {node.data.label === "openai" && (
                    <Box mt={2} p={2} borderRadius={1} bgcolor="grey.100">
                      <OpenAIPromptPanel node={node} setNodes={setNodes} />
                    </Box>
                  )}

                  {/* Delete Button */}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== id));
                      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
                      setOpenNodeIds(ids => ids.filter(nid => nid !== id));
                    }}
                    sx={{ mt: 2 }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
});

export default Canvas;
