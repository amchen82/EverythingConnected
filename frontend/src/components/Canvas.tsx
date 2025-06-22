import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useCallback
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
