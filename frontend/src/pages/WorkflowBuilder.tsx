import React from 'react';
import Canvas from '../components/Canvas';

const WorkflowBuilder = () => {
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
      </div>
      <div style={{ flex: 1 }}>
        <Canvas />
      </div>
    </div>
  );
};

export default WorkflowBuilder;
