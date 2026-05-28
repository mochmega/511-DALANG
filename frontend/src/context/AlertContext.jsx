import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const AlertContext = createContext()

export function useAlert() {
  return useContext(AlertContext)
}

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'info', // 'info', 'success', 'error', 'confirm'
  })

  const resolveRef = useRef(null)

  // Auto-close for alerts (not confirms)
  useEffect(() => {
    let timer;
    if (alertState.isOpen && alertState.type !== 'confirm') {
      timer = setTimeout(() => {
        closePopup(true)
      }, 6000)
    }
    return () => clearTimeout(timer)
  }, [alertState.isOpen, alertState.type])

  const showAlert = useCallback((message, type = 'info') => {
    setAlertState({ isOpen: true, message, type })
  }, [])

  const showConfirm = useCallback((message) => {
    setAlertState({ isOpen: true, message, type: 'confirm' })
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const closePopup = useCallback((result = false) => {
    setAlertState((prev) => ({ ...prev, isOpen: false }))
    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }
  }, [])

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* GLOBAL POPUP UI */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 flex flex-col items-center p-6 text-center">
            
            {/* ICON */}
            <div className="mb-4">
              {alertState.type === 'success' && <span className="text-4xl text-emerald-500 bg-emerald-500/10 p-4 rounded-full inline-block">✅</span>}
              {alertState.type === 'error' && <span className="text-4xl text-rose-500 bg-rose-500/10 p-4 rounded-full inline-block">❌</span>}
              {alertState.type === 'info' && <span className="text-4xl text-sky-500 bg-sky-500/10 p-4 rounded-full inline-block">ℹ️</span>}
              {alertState.type === 'confirm' && <span className="text-4xl text-amber-500 bg-amber-500/10 p-4 rounded-full inline-block">❓</span>}
            </div>

            {/* MESSAGE */}
            <h3 className="text-white font-bold text-lg leading-relaxed mb-6 whitespace-pre-line">
              {alertState.message}
            </h3>

            {/* BUTTONS */}
            <div className="flex gap-3 w-full justify-center">
              {alertState.type === 'confirm' ? (
                <>
                  <button 
                    onClick={() => closePopup(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl transition-colors border border-slate-700"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => closePopup(true)}
                    className="flex-1 bg-theme-600 hover:bg-theme-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-lg shadow-theme-500/20"
                  >
                    Ya, Lanjutkan
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => closePopup(true)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors border border-slate-600"
                >
                  Oke
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}
