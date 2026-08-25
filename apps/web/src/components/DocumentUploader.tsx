"use client";

import React, { useState } from "react";

interface ExtractionResult {
  document: any;
  extraction: {
    structuredData: any;
  };
}

interface DocumentUploaderProps {
  userId: string;
  documentType: "LOAN" | "EXPENSE";
  onExtractionComplete: (result: ExtractionResult) => void;
}

export function DocumentUploader({ userId, documentType, onExtractionComplete }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("documentType", documentType);

      // 1. Upload Document
      const uploadRes = await fetch("http://localhost:4000/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed.");
      const uploadedDoc = await uploadRes.json();

      // 2. Trigger Extraction
      setIsUploading(false);
      setIsExtracting(true);

      const extractRes = await fetch(`http://localhost:4000/api/documents/${uploadedDoc.id}/extract`, {
        method: "POST",
      });

      if (!extractRes.ok) throw new Error("Extraction failed.");
      const extractionResult = await extractRes.json();

      onExtractionComplete(extractionResult);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  return (
    <div className="p-4 border rounded-md shadow-sm space-y-4">
      <h3 className="text-lg font-medium">Upload {documentType === "LOAN" ? "Loan Document" : "Receipt"}</h3>
      
      <input 
        type="file" 
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button 
        onClick={handleUploadAndExtract}
        disabled={!file || isUploading || isExtracting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? "Uploading..." : isExtracting ? "Extracting Data (AI)..." : "Upload & Extract"}
      </button>
    </div>
  );
}
