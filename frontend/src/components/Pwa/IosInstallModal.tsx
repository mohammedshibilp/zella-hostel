import React from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Share, PlusSquare, CheckCircle2, Smartphone } from 'lucide-react';
import zellaIcon from '../../assets/zella_icon.png';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install Zellahostel on iOS"
      subtitle="Follow these 3 quick steps to add Zellahostel to your iPhone or iPad Home Screen"
      maxWidth="md"
    >
      <div className="flex flex-col gap-5 text-sm">
        {/* App Preview Card */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <img
            src={zellaIcon}
            alt="Zellahostel App Icon"
            className="w-12 h-12 rounded-xl object-contain shadow-xs bg-white p-1 border border-slate-100 shrink-0"
          />
          <div className="min-w-0">
            <h4 className="font-extrabold text-navy-900 text-sm">Zellahostel App</h4>
            <p className="text-xs text-slate-500">Standalone Hostel Management Portal</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Screen • Offline Shell • Fast Launch</span>
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex flex-col gap-3.5">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 flex items-center gap-1.5 text-xs">
                <span>Tap the Safari Share button</span>
                <span className="p-1 rounded bg-slate-100 text-primary inline-flex items-center justify-center">
                  <Share className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Found at the bottom toolbar on iPhone or top-right bar on iPad.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary font-black flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 flex items-center gap-1.5 text-xs">
                <span>Scroll down and select</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1">
                  <PlusSquare className="w-3.5 h-3.5 text-secondary" />
                  <span>Add to Home Screen</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Look for the square with a plus icon in the actions menu list.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 text-xs">
                Tap <span className="text-primary font-extrabold">"Add"</span> in the top-right corner
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Zellahostel will now appear on your Home Screen as an independent, standalone application.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <Button variant="primary" onClick={onClose} className="w-full sm:w-auto">
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
};
