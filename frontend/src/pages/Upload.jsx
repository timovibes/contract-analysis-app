return (
    <div className="doc-card">
      <p className="eyebrow">New submission</p>
      <h1>Upload contract</h1>
      <input type="file" onChange={handleFile} />
      {status && <p className="upload-status">{status}</p>}
    </div>
  );