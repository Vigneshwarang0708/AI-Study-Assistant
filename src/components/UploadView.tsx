import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, ArrowLeft, ShieldAlert, CheckCircle, BrainCircuit } from 'lucide-react';
import { DocumentMetadata } from '../types';
import { getApiUrl } from '../utils';

interface UploadViewProps {
  onUploadSuccess: (newDoc: DocumentMetadata) => void;
  onNavigateHome: () => void;
  userEmail: string;
}

export default function UploadView({ onUploadSuccess, onNavigateHome, userEmail }: UploadViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<DocumentMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file: File) => {
    setError('');
    setSuccess(null);

    if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
      setError("Invalid file format. AI Study Buddy only supports parsing PDF documents.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File is too large. PDF uploads are capped at 50 MB.");
      return;
    }

    setLoading(true);
    setProgressText('Uploading file to server...');

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate incremental steps in loader to make it feel super alive and immersive
      setTimeout(() => setProgressText('Extracting PDF texts & structural pages...'), 1200);
      setTimeout(() => setProgressText('Building semantic chunking map for RAG query indexing...'), 2600);

      const response = await fetch(getApiUrl('/api/docs/upload'), {
        method: 'POST',
        headers: {
          'user-email': userEmail,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload PDF study material');
      }

      setSuccess(data);
      onUploadSuccess(data);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An unexpected error occurred during PDF transmission.");
    } finally {
      setLoading(false);
      setProgressText('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="upload-view-container">
      {/* Back Button */}
      <div className="flex items-center space-x-3" id="upload-back-row">
        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-slate-800 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="bg-slate-800/25 border border-slate-700/60 rounded-3xl p-8 space-y-6 shadow-xl" id="upload-box-card">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-400" />
            <span>Upload Course Material</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Upload text-rich PDFs up to 50MB. Our RAG engine extracts and structures content automatically to enable deep interactive learning.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start space-x-2.5 animate-fade-in" id="upload-error-alert">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl space-y-3 text-emerald-300 text-xs" id="upload-success-panel">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <h4 className="font-bold text-white text-sm">Parsing Finished Successfully!</h4>
                <p className="text-slate-400 mt-0.5">"${success.name}" is now ready for active study.</p>
              </div>
            </div>
            <div className="flex space-x-3 pt-2 pl-8">
              <button
                onClick={onNavigateHome}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
              >
                Go to Workspace
              </button>
              <button
                onClick={() => setSuccess(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
              >
                Upload another PDF
              </button>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        {!loading && !success && (
          <div
            id="drag-file-uploader"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center space-y-4 cursor-pointer transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]' 
                : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept=".pdf,application/pdf"
            />
            
            <div className="p-4 bg-slate-800/50 rounded-2.5xl inline-block text-slate-400 group-hover:scale-105 transition-transform" id="upload-icon-container">
              <UploadCloud className="h-10 w-10 text-indigo-400" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Drag & drop your PDF file here, or <span className="text-indigo-400 hover:underline">browse</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Supports standard academic PDFs and slides up to 50 MB
              </p>
            </div>
          </div>
        )}

        {/* Loading overlay panel */}
        {loading && (
          <div className="p-10 border border-slate-700/55 rounded-3xl bg-slate-900/40 text-center space-y-4 shadow-inner" id="upload-loading-overlay">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-semibold text-white text-sm">Processing Document Study Files</h4>
              <p className="text-xs text-indigo-400 animate-pulse">{progressText}</p>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              Gemini is now OCR parsing structural files, processing vocabulary indexes, and preparing semantic summaries. Please keep this panel open!
            </p>
          </div>
        )}

        {/* Instructions / Hints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50" id="upload-tips-grid">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/40">
            <h5 className="font-semibold text-xs text-white flex items-center gap-1.5">
              <span className="p-1 bg-indigo-500/10 rounded-md text-indigo-400 shrink-0">✔</span>
              <span>Ideal Document Types</span>
            </h5>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Highly technical textbooks, physics schemas, math slides, vocab lists, and literature journals work best with our RAG text processors.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/40">
            <h5 className="font-semibold text-xs text-white flex items-center gap-1.5">
              <span className="p-1 bg-yellow-500/10 rounded-md text-yellow-500 shrink-0">⚠️</span>
              <span>Scanning Note files</span>
            </h5>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              If your PDF is scanned manually, verify that the text is machine-readable representation to let the text extractors fetch details correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
