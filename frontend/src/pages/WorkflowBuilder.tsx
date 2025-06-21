import React, { useRef, useEffect, useState } from 'react';
import Canvas from '../components/Canvas';

const WorkflowBuilder = ({ username }: { username: string }) => {
  const canvasRef = useRef<any>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);

  // Fetch saved workflows for this user
useEffect(() => {
  fetch(`http://localhost:8000/workflows/user/${username}`)
    .then(res => res.json())
    .then(data => setSavedWorkflows(Array.isArray(data) ? data : [])) // <-- Ensure array
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
      // Refresh list after save
      setSavedWorkflows((prev) => [...prev, fullData]);
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
    if (canvasRef.current?.loadWorkflow) {
      canvasRef.current.loadWorkflow(wf);
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
            <li key={index}>
              <button
                style={{ margin: '5px 0', width: '100%' }}
                onClick={() => loadWorkflow(wf)}
              >
                {wf.name}
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
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default WorkflowBuilder;
