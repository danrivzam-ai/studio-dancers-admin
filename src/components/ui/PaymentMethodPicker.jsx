import { Banknote, Smartphone, CreditCard, Building2 } from 'lucide-react'
import { BANKS } from '../../lib/courses'
import { PAYMENT_METHOD_OPTIONS } from '../../lib/paymentMethods'

const ICONS = { efectivo: Banknote, transferencia: Smartphone, tarjeta: CreditCard }

const inputClass = 'w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-base'

// Selector de forma de pago compartido por todos los cobros.
// onChange recibe solo los campos que cambian: { paymentMethod, bankId, transferReceipt }
export default function PaymentMethodPicker({ paymentMethod, bankId, transferReceipt, onChange }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Forma de pago
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHOD_OPTIONS.map(method => {
            const Icon = ICONS[method.id]
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onChange({ paymentMethod: method.id, bankId: '', transferReceipt: '' })}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === method.id
                    ? 'border-[#7e2d55] bg-[#fdf5f9] text-[#551735]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs font-medium">{method.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {paymentMethod === 'transferencia' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building2 size={16} className="inline mr-1" />
              Banco de origen *
            </label>
            <select
              required
              value={bankId}
              onChange={(e) => onChange({ bankId: e.target.value })}
              className={inputClass}
            >
              <option value="">Seleccionar banco</option>
              {BANKS.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de comprobante *
            </label>
            <input
              type="text"
              required
              value={transferReceipt}
              onChange={(e) => onChange({ transferReceipt: e.target.value })}
              className={inputClass}
              placeholder="Número de comprobante de la transferencia"
            />
          </div>
        </>
      )}
    </>
  )
}
