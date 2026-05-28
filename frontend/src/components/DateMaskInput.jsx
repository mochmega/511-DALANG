import { forwardRef } from 'react'

export const DateMaskInput = forwardRef(({ value, onClick, onChange, className, ...rest }, ref) => {
  const handleChange = (e) => {
    let val = e.target.value.replace(/\D/g, '') // remove non-digits
    
    // Auto add slashes
    if (val.length > 4) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4, 8)
    } else if (val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4)
    }

    // Mutate the event target's value so react-datepicker reads the masked string
    e.target.value = val
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <input
      ref={ref}
      value={value}
      onClick={onClick}
      onChange={handleChange}
      className={className || "w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"}
      placeholder="DD/MM/YYYY"
      maxLength="10"
      {...rest}
    />
  )
})
