import React, { useRef, useEffect, useState } from 'react';
import Canvas from '../components/Canvas';

const WorkflowBuilder = ({ username }: { username: string }) => {
  const canvasRef = useRef<any>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);
   const [schedule, setSchedule] = useState<number>(5); // default 5 minutes
   const [currentWorkflow, setCurrentWorkflow] = useState<any | null>(null);

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

    try {
      const res = await fetch("http://localhost:8000/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });
      const data = await res.json();
      alert(`🚀 Run: ${data.message}`);
    } catch (err) {
      alert("❌ Failed to run workflow");
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
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: 220, padding: 10, borderRight: '1px solid #ccc' }}>
        <h3>🛠 Tools</h3>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'gmail')}>
          📧 Gmail
        </div>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'notion')}>
          📓 Notion
        </div>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'youtube')}>
          ▶️ YouTube
        </div>

        <h3 style={{ marginTop: 20 }}>📁 My Workflows</h3>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {savedWorkflows.map((wf, index) => (
            <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                style={{ margin: '5px 0', width: '100%' }}
                onClick={() => loadWorkflow(wf)}
              >
                {wf.name}
              </button>
              <button
                style={{ marginLeft: 8, color: 'red' }}
                onClick={async () => {
                  if (!window.confirm(`Delete workflow "${wf.name}"?`)) return;
                  const res = await fetch(`http://localhost:8000/workflows/delete/${wf.id}`, {
                    method: "DELETE",
                  });
                  const data = await res.json();
                  alert(data.message);
                  setSavedWorkflows((prev) => prev.filter(w => w.id !== wf.id));
                }}
                title="Delete"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 20 }}>
          <button onClick={saveWorkflow} style={{ width: '100%', marginBottom: 8 }}>
            💾 Save
          </button>
          <button onClick={runWorkflow} style={{ width: '100%' }}>
            ▶️ Run
          </button>
        </div>




        <div>
          <label>
            Schedule (minutes):
            <input
              type="number"
              value={schedule}
              onChange={(e) => setSchedule(Number(e.target.value))}
              min={1}
            />
          </label>
          <button
    onClick={async () => {
      // Replace with your selected workflow's ID
       if (!currentWorkflow || !currentWorkflow.id) {
      alert("Please load a workflow to schedule.");
      return;
    }
     
      const res = await fetch("http://localhost:8000/workflows/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: currentWorkflow.id,schedule }),
      });
      const data = await res.json();
      alert(data.message);
    }}
    style={{ marginLeft: 12 }}
  >
    Schedule
  </button>
        </div>
      </div>

      

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default WorkflowBuilder;
