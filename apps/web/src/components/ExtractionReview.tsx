import React from "react";

interface ExtractionReviewProps {
  documentType: "LOAN" | "EXPENSE";
  structuredData: any;
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

export function ExtractionReview({ documentType, structuredData, onConfirm, onCancel }: ExtractionReviewProps) {
  // In a real application, you'd use a form library (like react-hook-form) here 
  // to allow users to edit the values before submitting.
  
  return (
    <div className="p-4 border rounded-md shadow-sm space-y-4">
      <h3 className="text-lg font-medium text-green-700">Data Extracted Successfully!</h3>
      <p className="text-sm text-gray-500">Please review the extracted data. You can edit these fields later.</p>

      <div className="bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto">
        <pre>{JSON.stringify(structuredData, null, 2)}</pre>
      </div>

      <div className="flex space-x-2">
        <button 
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
        >
          Cancel
        </button>
        <button 
          onClick={() => onConfirm(structuredData)}
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          Confirm & Fill Form
        </button>
      </div>
    </div>
  );
}
