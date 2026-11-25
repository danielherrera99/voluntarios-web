import {Printer, X} from 'lucide-react';
import {useState} from 'react';
import {getAssetUrl} from '../../lib/api';

export interface CelebrationCardPreset {
  mode: 'birthday' | 'anniversary';
  title: string;
  subtitle: string;
  dateLabel: string;
  yearsLabel?: string;
  message: string;
}

interface CelebrationCardModalProps {
  preset: CelebrationCardPreset;
  onClose: () => void;
}

export function CelebrationCardModal({preset, onClose}: CelebrationCardModalProps) {
  const [mode, setMode] = useState<'birthday' | 'anniversary'>(preset.mode);
  const [title, setTitle] = useState(preset.title);
  const [subtitle, setSubtitle] = useState(preset.subtitle);
  const [dateLabel, setDateLabel] = useState(preset.dateLabel);
  const [yearsLabel, setYearsLabel] = useState(preset.yearsLabel ?? '3 Años');
  const [message, setMessage] = useState(preset.message);

  const pennants = ['#8D4999', '#109A51', '#E6332A', '#8D4999', '#109A51', '#E6332A', '#0A6EB4', '#F8C300'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Generador de pieza conmemorativa"
    >
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Diseño Conmemorativo Diocesano
            </h3>
            <p className="text-xs text-slate-500">
              Formato oficial inspirado en la línea gráfica de la Pastoral Juvenil de Chiclayo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="no-print border-b lg:border-b-0 lg:border-r border-slate-200 p-6 lg:col-span-5 space-y-4">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('birthday')}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'birthday'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cumpleaños
              </button>
              <button
                type="button"
                onClick={() => setMode('anniversary')}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'anniversary'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aniversario Parroquial
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {mode === 'birthday' ? 'Nombre del Integrante / Coordinador' : 'Parroquia / Grupo Juvenil'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {mode === 'birthday' ? 'Cargo o Pastoral' : 'Zona Pastoral o Comunidad'}
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                <input
                  type="text"
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                />
              </div>
              {mode === 'anniversary' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Años</label>
                  <input
                    type="text"
                    value={yearsLabel}
                    onChange={(e) => setYearsLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mensaje Fraterno</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-6 lg:col-span-7 flex items-center justify-center">
            <div className="relative w-full max-w-[440px] aspect-square rounded-xl border border-slate-200 bg-white halftone-subtle overflow-hidden flex flex-col justify-between p-8 shadow-sm">
              {/* Top Banderines */}
              <div className="flex items-start justify-between gap-1.5 -mt-8 -mx-4">
                {pennants.map((color, idx) => (
                  <svg
                    key={idx}
                    viewBox="0 0 36 44"
                    className="w-10 h-11 shrink-0"
                    aria-hidden="true"
                  >
                    <polygon points="2,0 34,0 34,40 18,28 2,40" fill={color} />
                  </svg>
                ))}
              </div>

              <div className="text-center space-y-3 my-auto py-4">
                <p className="font-serif italic text-3xl font-semibold text-[#8D4999]">
                  {mode === 'birthday' ? '¡Feliz Cumpleaños!' : '¡Feliz Aniversario!'}
                </p>

                {mode === 'anniversary' && (
                  <div className="inline-flex items-baseline gap-3 py-1">
                    <span className="font-mono text-5xl font-bold tracking-tight text-slate-800 tabular-nums">
                      {yearsLabel.split(' ')[0]}
                    </span>
                    <div className="text-left">
                      <p className="text-base font-bold text-slate-800 leading-tight">
                        {yearsLabel.split(' ').slice(1).join(' ') || 'Años'}
                      </p>
                      <p className="text-xs font-semibold text-white bg-slate-700 rounded px-2 py-0.5 mt-0.5">
                        {dateLabel}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <h4 className="text-xl font-bold text-slate-900 text-balance">{title}</h4>
                  <p className="text-sm font-medium text-[#8D4999] mt-1">{subtitle}</p>
                  {mode === 'birthday' && (
                    <p className="text-xs font-mono text-slate-500 mt-1 tabular-nums">{dateLabel}</p>
                  )}
                </div>

                <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed pt-1">
                  {message}
                </p>
              </div>

              {/* Institutional Seals Footer */}
              <div className="flex items-center justify-center gap-5 pt-4 border-t border-slate-100">
                <img
                  src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
                  alt="Logo Pastoral Juvenil Diócesis de Chiclayo"
                  className="h-11 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                <img
                  src={getAssetUrl('assets/aistudio/CDJ_8x_082c8e32.png')}
                  alt="Sello Comisión Diocesana de Juventud"
                  className="h-11 w-11 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
