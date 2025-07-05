import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Stack } from '@mui/material';

function OpenAIPromptPanel({ node, setNodes }: { node: any, setNodes?: any }) {
  const [prompt, setPrompt] = useState(node.data.prompt || '');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  // Save prompt to node data
  const handleSavePrompt = () => {
    if (setNodes) {
      setNodes((nds: any[]) =>
        nds.map(n =>
          n.id === node.id ? { ...n, data: { ...n.data, prompt } } : n
        )
      );
    }
  };

  // Run OpenAI with current prompt
  const handleRun = async () => {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('http://localhost:8000/workflows/tools/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setOutput(data.result || data.error || 'No response');
    } catch (err) {
      setOutput('Error contacting backend');
    }
    setLoading(false);
  };

  useEffect(() => {
    setPrompt(node.data.prompt || '');
  }, [node.data.prompt]);

  return (
    <Box>
      <TextField
        label="Prompt"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        maxRows={6}
        margin="dense"
      />
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleSavePrompt}
          disabled={!prompt.trim()}
        >
          Save Prompt
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleRun}
          disabled={loading || !prompt.trim()}
        >
          {loading ? <CircularProgress size={20} /> : "Run OpenAI"}
        </Button>
      </Stack>
      {output && (
        <Box mt={2}>
          <Typography variant="subtitle2">Output:</Typography>
          <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
            {output}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OpenAIPromptPanel;