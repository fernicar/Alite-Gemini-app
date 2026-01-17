
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', isConfirm = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-slate-900 border border-cyan-500 rounded-lg p-6 w-full max-w-md shadow-[0_0_20px_rgba(6,182,212,0.3)]">
        <h3 className="font-orbitron text-xl text-orange-300 mb-4 border-b border-gray-700 pb-2">{title}</h3>
        <p className="text-gray-300 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-4">
          {isConfirm && (
            <button 
              onClick={onCancel} 
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-200 border border-gray-600"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition duration-200 shadow-lg shadow-cyan-900/20"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
