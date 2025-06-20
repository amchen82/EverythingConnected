import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
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

const Canvas = forwardRef((props, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Expose workflow JSON
useImperativeHandle(ref, () => ({
  getWorkflowJson: (name: string) => ({
    name : name,
    workflow: nodes.map((n) => ({
      type: n.data.type,
      service: n.data.label,
      action: n.data.action,
    })),
  })
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

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

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

  return (
    <div style={{ height: '100%', background: '#f0f0f0' }} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
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
        </div>
      )}
    </div>
  );
});

export default Canvas;
