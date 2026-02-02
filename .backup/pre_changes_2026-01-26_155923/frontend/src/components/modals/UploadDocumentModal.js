import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Upload } from 'lucide-react';
import api from '../../utils/api';

export function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  children = [],
  parents = [],
}) {
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    tags: '',
    linked_child_id: '',
    linked_parent_id: '',
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setError('File size must be less than 20MB.');
        return;
      }
      setError('');
      setFormData({ ...formData, file });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setError('File size must be less than 20MB.');
        e.target.value = '';
        return;
      }
      setError('');
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.file) {
        setError('Please select a file to upload.');
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      if (formData.category_id) {
        formDataToSend.append('category_id', formData.category_id);
      }
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }
      if (formData.tags) {
        const tagsArray = formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);
        formDataToSend.append('tags', JSON.stringify(tagsArray));
      }
      if (formData.linked_child_id) {
        formDataToSend.append('linked_child_id', formData.linked_child_id);
      }
      if (formData.linked_parent_id) {
        formDataToSend.append('linked_parent_id', formData.linked_parent_id);
      }

      await api.post('/files/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData({
        category_id: '',
        description: '',
        tags: '',
        linked_child_id: '',
        linked_parent_id: '',
        file: null,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to upload document:', err);
      setError(err.response?.data?.error || 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Upload Document">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
          >
            <option value="">Select Category...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            File
          </label>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#FF9B85] bg-[#FFF8F3]'
                : 'border-[#FFE5D9] hover:border-[#FF9B85] hover:bg-[#FFF8F3]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="mx-auto mb-4 text-[#FF9B85]" />
            {formData.file ? (
              <div>
                <p className="text-stone-700 font-medium mb-2">{formData.file.name}</p>
                <p className="text-xs text-stone-500">
                  {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <p className="text-stone-600 font-medium mb-2">
                  Drag and drop your file here, or
                </p>
                <label className="inline-block px-6 py-2 bg-[#FFE5D9] text-[#E07A5F] rounded-xl font-bold cursor-pointer hover:bg-[#FF9B85] hover:text-white transition-colors">
                  Browse Files
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="text-xs text-stone-400 mt-3">
                  Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 20MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Description (Optional)
          </label>
          <textarea
            placeholder="Brief description of the document..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            placeholder="medical, emergency, 2024"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Link to Child (Optional)
            </label>
            <select
              value={formData.linked_child_id}
              onChange={(e) => setFormData({ ...formData, linked_child_id: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            >
              <option value="">Select Child...</option>
              {children
                .filter((child) => !child.status || child.status === 'ACTIVE')
                .map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Link to Parent (Optional)
            </label>
            <select
              value={formData.linked_parent_id}
              onChange={(e) => setFormData({ ...formData, linked_parent_id: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            >
              <option value="">Select Parent...</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.first_name} {parent.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.file}
            className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
