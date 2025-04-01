import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onUpdate: (value: string) => void;
  multiline?: boolean;
  label?: string;
}

export function EditableText({ value, onUpdate, multiline, label }: EditableTextProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedValue, setEditedValue] = React.useState(value);

  const handleSave = () => {
    onUpdate(editedValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        {label && <h4 className="font-medium text-gray-900">{label}</h4>}
        {multiline ? (
          <textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setEditedValue(value);
              setIsEditing(false);
            }}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {label && <h4 className="font-medium text-gray-900 mb-1">{label}</h4>}
      <p className="text-gray-700">{value}</p>
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-0 right-0 p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
      >
        <Edit2 size={16} />
      </button>
    </div>
  );
} 