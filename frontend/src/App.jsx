import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  CloudUpload, File, Gauge, Activity, Timer, 
  CheckCircle, Copy, Check 
} from 'lucide-react';
import './index.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, success, error
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [pingLatency, setPingLatency] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const measurePing = async () => {
    const start = performance.now();
    try {
      await axios.get('/api/ping', { timeout: 2000 });
      const end = performance.now();
      setPingLatency(Math.round(end - start));
    } catch (e) {
      setPingLatency(0);
    }
  };

  useEffect(() => {
    let pingInterval;
    if (uploadState === 'uploading') {
      pingInterval = setInterval(measurePing, 2000);
      measurePing(); // initial ping
    }
    return () => clearInterval(pingInterval);
  }, [uploadState]);

  const handleUpload = async () => {
    if (!file) return;
    
    setUploadState('uploading');
    setProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const startTime = performance.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          
          const currentTime = performance.now();
          const timeElapsed = (currentTime - lastTime) / 1000; // in seconds
          
          if (timeElapsed > 0.5) { // update speed every 500ms
            const bytesLoaded = progressEvent.loaded - lastLoaded;
            const speedBps = bytesLoaded / timeElapsed;
            setUploadSpeed(speedBps);
            
            const remainingBytes = progressEvent.total - progressEvent.loaded;
            const remainingTime = remainingBytes / speedBps;
            setTimeLeft(isFinite(remainingTime) ? remainingTime : 0);
            
            lastLoaded = progressEvent.loaded;
            lastTime = currentTime;
          }
        }
      });
      
      setShareUrl(response.data.shareUrl);
      setUploadState('success');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState('error');
    }
  };

  const formatSpeed = (speedBps) => {
    if (speedBps === 0) return '0 MB/s';
    return (speedBps / (1024 * 1024)).toFixed(2) + ' MB/s';
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    setShareUrl('');
  };

  return (
    <>
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="container">
        <header className="app-header">
          <div className="logo">
            <CloudUpload size={48} color="#6366f1" />
            <h1>Drop<span>Zone</span></h1>
          </div>
          <p>Share files quickly and securely.</p>
        </header>

        <div className="glass-panel">
          {uploadState === 'idle' && !file && (
            <div 
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                hidden 
              />
              <div className="upload-content">
                <CloudUpload size={64} className="upload-icon" />
                <h3>Drag & Drop your files here</h3>
                <p>or</p>
                <button className="btn-primary" onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current.click();
                }}>Browse Files</button>
              </div>
            </div>
          )}

          {(uploadState === 'idle' && file) || uploadState === 'uploading' ? (
            <div className="upload-progress-container">
              <div className="file-info">
                <div className="file-type-icon">
                  <File size={32} />
                </div>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatSize(file.size)}</span>
                </div>
                {uploadState === 'uploading' && (
                  <div className="progress-percentage">{progress}%</div>
                )}
              </div>
              
              {uploadState === 'uploading' && (
                <>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon"><Gauge size={20} /></div>
                      <div className="stat-info">
                        <span className="stat-label">Upload Speed</span>
                        <span className="stat-value">{formatSpeed(uploadSpeed)}</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon"><Activity size={20} /></div>
                      <div className="stat-info">
                        <span className="stat-label">Latency (Ping)</span>
                        <span className="stat-value">{pingLatency} ms</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon"><Timer size={20} /></div>
                      <div className="stat-info">
                        <span className="stat-label">Time Left</span>
                        <span className="stat-value">{formatTime(timeLeft)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {uploadState === 'idle' && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => setFile(null)}>Cancel</button>
                  <button className="btn-primary" onClick={handleUpload}>Start Upload</button>
                </div>
              )}
            </div>
          ) : null}

          {uploadState === 'success' && (
            <div className="result-container">
              <div className="success-icon">
                <CheckCircle size={64} />
              </div>
              <h3>Upload Complete!</h3>
              <p>Your file is ready to be shared.</p>
              <div className="share-link-wrapper">
                <input type="text" value={shareUrl} readOnly />
                <button className="btn-icon" onClick={copyToClipboard} title="Copy Link">
                  {copied ? <Check size={20} color="#10b981" /> : <Copy size={20} />}
                </button>
              </div>
              <button className="btn-secondary" onClick={reset}>Upload Another File</button>
            </div>
          )}

          {uploadState === 'error' && (
            <div className="result-container">
              <h3>Upload Failed</h3>
              <p>Something went wrong during the upload.</p>
              <button className="btn-secondary" onClick={reset}>Try Again</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
