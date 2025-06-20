import React, { useRef } from 'react';
import Canvas from '../components/Canvas';

const WorkflowBuilder = () => {

  const canvasRef = useRef<any>(null);

  const sendWorkflow = async (endpoint: string) => {
    const workflow = canvasRef.current?.getWorkflowJson?.() || [];

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      const data = await res.json();
      alert(`✅ ${endpoint.toUpperCase()}: ${data.message}`);
    } catch (error) {
      alert(`❌ Error on ${endpoint}`);
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
        <button onClick={()=> sendWorkflow('/workflows/save')}  style={{ width: '100%', marginBottom: 8 }}>💾 Save</button>
        <button onClick={ () => sendWorkflow('/workflows/run')} style={{ width: '100%' }}>▶️ Run</button>
      </div>

      <div style={{ flex: 1 }}>
        <Canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default WorkflowBuilder;
