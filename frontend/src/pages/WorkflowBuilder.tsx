import React, { useRef } from 'react';
import Canvas from '../components/Canvas';

const WorkflowBuilder = ({ username }: { username: string })  => {

 const canvasRef = useRef<any>(null);

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
    } catch (error) {
      alert("❌ Error saving workflow");
      console.error(error);
    }
  };

  const runWorkflow = async () => {
    const workflow = canvasRef.current?.getWorkflowJson?.("temp-run");

    try {
      const res = await fetch("http://localhost:8000/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      const data = await res.json();
      alert(`🚀 Run: ${data.message}`);
    } catch (error) {
      alert("❌ Error running workflow");
      console.error(error);
    }
  };

  

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 200, padding: 10, borderRight: '1px solid #ccc' }}>
        <h3>Tools</h3>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'gmail')}>
          📧 Gmail
        </div>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'notion')}>
          📓 Notion
        </div>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('type', 'youtube')}>
          ▶️ YouTube
        </div>

        <hr style={{ margin: '12px 0' }} />
        <button onClick={saveWorkflow}  style={{ width: '100%', marginBottom: 8 }}>💾 Save</button>
        <button onClick={runWorkflow} style={{ width: '100%' }}>▶️ Run</button>
      </div>

      <div style={{ flex: 1 }}>
        <Canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default WorkflowBuilder;
