import React, { useRef, useEffect, useState } from 'react';
import Canvas from '../components/Canvas';
import {
  Paper, Box, Typography, Stack, Button, Divider, List, ListItem, IconButton, TextField
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // <-- ADD THIS
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import BookIcon from '@mui/icons-material/Book';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const WorkflowBuilder = ({ username, mode, setMode }: { username: string, mode: 'light' | 'dark', setMode: (m: 'light' | 'dark') => void }) => {
  const theme = useTheme(); // <-- ADD THIS
  const canvasRef = useRef<any>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);
   const [schedule, setSchedule] = useState<number>(5); // default 5 minutes
   const [currentWorkflow, setCurrentWorkflow] = useState<any | null>(null);
   const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

  // Fetch saved workflows for this user
useEffect(() => {
  fetch(`http://localhost:8000/workflows/user/${username}`)
    .then(res => res.json())
    .then(data => {
      console.log("[FRONTEND] Received workflows from backend:", data); // <-- LO
      setSavedWorkflows(Array.isArray(data) ? data : []); // <-- Ensure array
    })
    .catch(err => {
      console.error("Failed to load workflows", err);
      setSavedWorkflows([]); // fallback to empty array on error
    });
}, [username]);

  const saveWorkflow = async () => {
    const name = prompt("Enter a name for your workflow:");
    if (!name) return;
    const workflow = canvasRef.current?.getWorkflowJson?.(name);
    const fullData = { ...workflow, owner: username };

    try {
      const res = await fetch("http://localhost:8000/workflows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });
      const data = await res.json();
      alert(`✅ Saved: ${data.message}`);

      // Reload workflows from backend and set the latest as current
      const wfRes = await fetch(`http://localhost:8000/workflows/user/${username}`);
      const wfList = await wfRes.json();
      setSavedWorkflows(Array.isArray(wfList) ? wfList : []);
      // Set the last workflow (most recently saved) as current
      if (Array.isArray(wfList) && wfList.length > 0) {
        setCurrentWorkflow(wfList[wfList.length - 1]);
      }
    } catch (err) {
      alert("❌ Failed to save workflow");
      console.error(err);
    }
  };

  const runWorkflow = async () => {
    const workflow = canvasRef.current?.getWorkflowJson?.("temp-run");
    const fullData = { ...workflow, owner: username };
    const gmailToken = localStorage.getItem("gmail_token");
    const notionToken = localStorage.getItem("notion_token");
    try {
      const res = await fetch("http://localhost:8000/workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(gmailToken ? { "X-Gmail-Token": gmailToken } : {}),
          ...(notionToken ? { "X-Notion-Token": notionToken } : {}),
        },
        body: JSON.stringify(fullData),
      });
      const data = await res.json();
      setCurrentWorkflowId(data.workflow_id); // <--- Add this
      console.log("[FRONTEND] Workflow run result:", data); // <-- LOG

      if (canvasRef.current?.setOutput) {
        console.log("[FRONTEND] Setting output in canvas");
        if (data.subject || data.body) {
          canvasRef.current.setOutput(
            `Subject: ${data.subject || ""}\n\n${data.body || ""}`
          );
        } else if (data.message) {
          canvasRef.current.setOutput(data.message);
        } else {
          canvasRef.current.setOutput(JSON.stringify(data, null, 2));
        }
      }
    } catch (err) {
      // Optionally show error in output panel
      if (canvasRef.current?.setOutput) {
        canvasRef.current.setOutput("❌ Failed to run workflow");
      }
      console.error(err);
    }
  };

  const loadWorkflow = (wf: any) => {
    console.log("[FRONTEND] Loading workflow to canvas:", wf); // <-- LOG
      let parsedWorkflow = wf;
  if (typeof wf.workflow === "string") {
    parsedWorkflow = { ...wf, workflow: JSON.parse(wf.workflow) };
  }

    if (canvasRef.current?.loadWorkflow) {
      canvasRef.current.loadWorkflow(parsedWorkflow);
      setCurrentWorkflow(parsedWorkflow);
    }
  };



  return (
    <Box display="flex" height="100vh">
      {/* Theme toggle button in the top right */}
    <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}>
      <Button
        variant="outlined"
        startIcon={mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      >
        {mode === 'dark' ? 'Light' : 'Dark'} Mode
      </Button>
    </Box>
      {/* Sidebar */}
      <Paper
        elevation={4}
        sx={{
          width: 280,
          p: 3,
          minHeight: '100vh',
          borderRadius: 3,
          bgcolor: theme.palette.background.paper, // <-- USE THEME
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Stack spacing={4} sx={{ flex: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              Tools
            </Typography>
            <Stack spacing={2}>
              <Button
                startIcon={<EmailIcon />}
                variant="contained"
                color="primary"
                fullWidth
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('type', 'gmail');
                }}
              >
                Gmail
              </Button>
              <Button
                startIcon={<BookIcon />}
                variant="contained"
                color="secondary"
                fullWidth
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('type', 'notion');
                }}
              >
                Notion
              </Button>
              <Button
                startIcon={<PlayCircleIcon />}
                variant="contained"
                color="info"
                fullWidth
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('type', 'youtube');
                }}
              >
                YouTube
              </Button>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flexGrow: 1 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
              My Workflows
            </Typography>
            <List dense>
              {savedWorkflows.map((wf, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={async () => {
                      if (!window.confirm(`Delete workflow "${wf.name}"?`)) return;
                      const res = await fetch(`http://localhost:8000/workflows/delete/${wf.id}`, { method: "DELETE" });
                      const data = await res.json();
                      alert(data.message);
                      setSavedWorkflows(prev => prev.filter(w => w.id !== wf.id));
                    }}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  }
                  disablePadding
                >
                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => loadWorkflow(wf)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {wf.name}
                  </Button>
                </ListItem>
              ))}
            </List>
          </Box>
          <Divider />
          <Stack spacing={1} mb={2}>
            <Button variant="contained" color="success" onClick={saveWorkflow}>💾 Save</Button>
            <Button variant="contained" color="primary" onClick={runWorkflow}>▶️ Run</Button>
          </Stack>
          <Box>
            <TextField
              label="Schedule (minutes)"
              type="number"
              value={schedule}
              onChange={e => setSchedule(Number(e.target.value))}
              size="small"
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ width: 120, mr: 1 }}
            />
            <Button
              variant="outlined"
              color="warning"
              onClick={async () => {
                if (!currentWorkflow || !currentWorkflow.id) {
                  alert("Please load a workflow to schedule.");
                  return;
                }
                const res = await fetch("http://localhost:8000/workflows/schedule", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workflow_id: currentWorkflow.id, schedule }),
                });
                const data = await res.json();
                alert(data.message);
              }}
            >
              Schedule
            </Button>
          </Box>
        </Stack>
      </Paper>
      {/* Canvas */}
      <Box flex={1} sx={{ bgcolor: theme.palette.background.default }}>
        <Canvas ref={canvasRef} currentWorkflowId={currentWorkflowId} mode={mode} />
      </Box>
    </Box>
  );
};

export default WorkflowBuilder;
