
import React from 'react';
import { ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';

interface DeviceAdminModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeviceAdminModal: React.FC<DeviceAdminModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="absolute inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white text-gray-900 w-full max-w-sm rounded-lg shadow-2xl overflow-hidden font-sans animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-gray-600" />
            </div>
            <div>
                <h3 className="text-lg font-semibold leading-tight">Activate device administrator?</h3>
                <p className="text-xs text-gray-500">com.jarvis.pk</p>
            </div>
        </div>

        {/* Content */}
        <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">
                Activating this administrator will allow the app <span className="font-bold">Call of Jarvis</span> to perform the following operations:
            </p>
            
            <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    <div>
                        <span className="block text-sm font-medium">Erase all data</span>
                        <span className="block text-xs text-gray-500">Erase the phone's data without warning by performing a factory data reset.</span>
                    </div>
                </li>
                <li className="flex gap-3 items-start">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    <div>
                        <span className="block text-sm font-medium">Lock the screen</span>
                        <span className="block text-xs text-gray-500">Control how and when the screen locks.</span>
                    </div>
                </li>
                <li className="flex gap-3 items-start">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    <div>
                        <span className="block text-sm font-medium">Monitor screen-unlock attempts</span>
                        <span className="block text-xs text-gray-500">Monitor the number of incorrect passwords typed when unlocking the screen.</span>
                    </div>
                </li>
            </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex border-t border-gray-200">
            <button 
                onClick={onCancel}
                className="flex-1 py-4 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                className="flex-1 py-4 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
            >
                Activate
            </button>
        </div>

      </div>
    </div>
  );
};
