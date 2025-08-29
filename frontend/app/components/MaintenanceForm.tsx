"use client";
import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface MaintenanceFormProps {
  serialHash: string;
  onMaintenanceAdded: () => void;
  onCancel: () => void;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ 
  serialHash, 
  onMaintenanceAdded, 
  onCancel 
}) => {
  const { address } = useAccount();
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!description.trim()) {
        throw new Error('Please enter a description');
      }

      const formData = new FormData();
      formData.append('description', description);
      formData.append('actor', address || '');

      if (evidenceFile) {
        formData.append('evidence', evidenceFile);
      }

      const response = await fetch(`/api/vehicles/${serialHash}/events`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onMaintenanceAdded();
        setDescription('');
        setEvidenceFile(null);
      } else {
        setError(data.error || 'Failed to add maintenance record');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEvidenceFile(file);
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Add Maintenance Record</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Oil change and tire rotation"
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-1">
            Evidence (Optional)
          </label>
          <input
            type="file"
            id="evidence"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: PDF, JPG, PNG, DOC, DOCX
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Adding...' : 'Add Maintenance'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaintenanceForm;
