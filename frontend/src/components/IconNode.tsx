const IconNode = ({ label }: { label: string }) => {
  return (
    <div
      style={{
        padding: 10,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 5,
      }}
    >
      {label}
    </div>
  );
};
export default IconNode;
