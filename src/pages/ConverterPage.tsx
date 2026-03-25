import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import FormatSelector from '../components/FormatSelector';
import type { ConversionType, ConversionResult } from '../utils/converter';
import {
  getAvailableConversions,
  validateFileSize,
  convertFile,
} from '../utils/converter';

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [availableConversions, setAvailableConversions] = useState<ConversionType[]>([]);
  const [selectedConversion, setSelectedConversion] = useState<ConversionType | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview for image files
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const type = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(null);
  }, [file]);

  const handleFileSelect = (selectedFile: File) => {
    // Reset state
    setResult(null);
    setError(null);
    setSuccessMessage(null);

    // Validate file size
    const sizeError = validateFileSize(selectedFile);
    if (sizeError) {
      setError(sizeError);
      setFile(null);
      setAvailableConversions([]);
      setSelectedConversion(null);
      return;
    }

    const conversions = getAvailableConversions(selectedFile);
    if (conversions.length === 0) {
      setError(
        `Unsupported file type. Please upload a DOCX, PDF, JPG, or HEIC file.`
      );
      setFile(null);
      setAvailableConversions([]);
      setSelectedConversion(null);
      return;
    }

    setFile(selectedFile);
    setAvailableConversions(conversions);
    setSelectedConversion(conversions[0]);
  };

  const handleConvert = async () => {
    if (!file || !selectedConversion) return;

    setIsConverting(true);
    setError(null);
    setSuccessMessage(null);
    setResult(null);

    try {
      const conversionResult = await convertFile(file, selectedConversion);
      setResult(conversionResult);
      setSuccessMessage('File converted successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during conversion.';
      setError(message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setAvailableConversions([]);
    setSelectedConversion(null);
    setResult(null);
    setError(null);
    setSuccessMessage(null);
    setPreviewUrl(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm">
        {/* Card Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Upload & Convert
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a file to get started. All processing happens in your browser.
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8 space-y-6">
          {/* File Upload */}
          <FileUpload
            onFileSelect={handleFileSelect}
            currentFile={file}
            disabled={isConverting}
          />

          {/* Image Preview */}
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Preview
                </span>
              </div>
              <div className="p-4 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="File preview"
                  className="max-h-64 max-w-full rounded-lg object-contain"
                />
              </div>
            </div>
          )}

          {/* Format Selector */}
          {file && (
            <FormatSelector
              availableConversions={availableConversions}
              selectedConversion={selectedConversion}
              onSelect={setSelectedConversion}
              disabled={isConverting}
            />
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
              <svg className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {file && !result && (
              <button
                onClick={handleConvert}
                disabled={isConverting || !selectedConversion}
                className="
                  flex-1 inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xl
                  bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                  dark:bg-indigo-500 dark:hover:bg-indigo-600
                  text-white font-semibold text-sm
                  shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2
                  dark:focus:ring-offset-gray-800
                "
              >
                {isConverting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Converting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Convert File
                  </>
                )}
              </button>
            )}

            {result && (
              <button
                onClick={handleDownload}
                className="
                  flex-1 inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xl
                  bg-green-600 hover:bg-green-700 active:bg-green-800
                  dark:bg-green-500 dark:hover:bg-green-600
                  text-white font-semibold text-sm
                  shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2
                  dark:focus:ring-offset-gray-800
                "
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {result.fileName}
              </button>
            )}

            {(file || result) && (
              <button
                onClick={handleReset}
                disabled={isConverting}
                className="
                  inline-flex items-center justify-center gap-2
                  px-6 py-3.5 rounded-xl
                  bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                  dark:bg-gray-700 dark:hover:bg-gray-600
                  text-gray-700 dark:text-gray-200 font-medium text-sm
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2
                  dark:focus:ring-offset-gray-800
                "
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supported Formats Info */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { from: 'DOCX', to: 'PDF', icon: '📄' },
          { from: 'PDF', to: 'DOCX', icon: '📝' },
          { from: 'JPG', to: 'HEIC', icon: '🖼️' },
          { from: 'HEIC', to: 'JPG', icon: '📷' },
        ].map(({ from, to, icon }) => (
          <div
            key={`${from}-${to}`}
            className="
              flex flex-col items-center gap-1.5 p-4 rounded-xl
              bg-white/60 dark:bg-gray-800/40
              border border-gray-200/80 dark:border-gray-700/30
              hover:border-indigo-300 dark:hover:border-indigo-700
              hover:shadow-md
              transition-all duration-300
            "
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {from}
            </span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {to}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
