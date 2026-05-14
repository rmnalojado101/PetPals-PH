import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, MapPin, PawPrint, Phone } from 'lucide-react';

import { api } from '@/lib/api';
import { Billing, User } from '@/types';

interface ReceiptTemplateProps {
  billing: Billing;
}

export function ReceiptTemplate({ billing }: ReceiptTemplateProps) {
  const clinicId = billing?.medicalRecord?.veterinarian?.clinicId || 
                   (billing?.medicalRecord?.veterinarian as any)?.clinic_id ||
                   billing?.vaccination?.administeredByUser?.clinicId ||
                   (billing?.vaccination?.administeredByUser as any)?.clinic_id ||
                   (billing?.medicalRecord?.veterinarian?.role === 'vet_clinic' ? billing?.medicalRecord?.veterinarian?.id : null) ||
                   (billing?.vaccination?.administeredByUser?.role === 'vet_clinic' ? billing?.vaccination?.administeredByUser?.id : null);

  const { data: settings } = useQuery({
    queryKey: ['settings', clinicId],
    queryFn: () => clinicId ? api.getClinicSettings(clinicId) : api.getSettings(),
  });

  const total = Number(billing.totalAmount);
  const currencyPrefix = 'PHP ';
  const normalize = (value?: string | null) => value?.trim() || '';
  const isPlaceholderClinicName = (value: string) =>
    ['petpals ph', 'veterinary clinic', 'your veterinary clinic'].includes(value.trim().toLowerCase());
  const relatedClinic = (
    ((billing.medicalRecord as any)?.veterinarian as any)?.clinic ??
    ((billing.vaccination as any)?.administeredByUser as any)?.clinic
  ) as User | undefined;
  const configuredClinicName = normalize(settings?.name);
  const clinicName =
    configuredClinicName && !isPlaceholderClinicName(configuredClinicName)
      ? configuredClinicName
      : normalize(relatedClinic?.name) || 'Veterinary Clinic';
  const clinicAddress = normalize(settings?.address) || normalize(relatedClinic?.address) || 'Address Not Set';
  const clinicPhone = normalize(settings?.phone) || normalize(relatedClinic?.phone) || 'Phone Not Set';
  const clinicEmail = normalize(settings?.email) || normalize(relatedClinic?.email) || 'Email Not Set';

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 border shadow-sm rounded-lg text-slate-800" id="receipt-content">
      <div className="flex justify-between items-start border-b pb-8 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <PawPrint className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              {clinicName}
            </h1>
          </div>
          <div className="text-sm text-slate-500 space-y-1">
            <p className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              {clinicAddress}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              {clinicPhone}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              {clinicEmail}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-2">Receipt</h2>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Invoice #: <span className="text-primary">{billing.invoiceNumber}</span>
            </p>
            <p className="text-sm font-semibold">
              Date: {billing.billingDate ? format(new Date(billing.billingDate), 'MMMM dd, yyyy') : 'N/A'}
            </p>
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 ${
                billing.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {billing.status}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To</h3>
          <p className="font-bold text-lg">{billing.owner?.name}</p>
          <p className="text-sm text-slate-500">{billing.owner?.email}</p>
          <p className="text-sm text-slate-500">{billing.owner?.phone}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
          <p className="font-bold text-lg">{billing.pet?.name}</p>
          <p className="text-sm text-slate-500">
            {billing.pet?.species} ({billing.pet?.breed})
          </p>
          {billing.medicalRecord && (
            <p className="text-xs italic text-primary mt-1">
              Consultation Ref: {billing.medicalRecord.diagnosis}
            </p>
          )}
          {billing.vaccination && (
            <p className="text-xs italic text-primary mt-1">
              Vaccination Ref: {billing.vaccination.name}
            </p>
          )}
        </div>
      </div>

      <div className="mb-12">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-100">
              <th className="text-left py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Description</th>
              <th className="text-center py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-24">Qty</th>
              <th className="text-right py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Price</th>
              <th className="text-right py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {billing.items.map((item, index) => (
              <tr key={index}>
                <td className="py-4">
                  <p className="font-semibold text-slate-700">{item.description}</p>
                </td>
                <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                <td className="py-4 text-right text-slate-600">
                  {currencyPrefix}
                  {Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 text-right font-bold text-slate-700">
                  {currencyPrefix}
                  {(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-start pt-8 border-t-2 border-slate-100">
        <div className="max-w-[300px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {billing.notes ||
              `Thank you for trusting ${clinicName} with your pet's care. Please keep this receipt for your records.`}
          </p>
          {billing.paymentMethod && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase">Payment Method</p>
              <p className="text-sm font-semibold text-primary uppercase">
                {billing.paymentMethod.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
        <div className="w-64 space-y-3">
          {settings?.paymentQrCodeUrl && billing.status !== 'paid' && (
            <div className="p-3 bg-white border-2 border-dashed border-primary/20 rounded-xl mb-4 flex flex-col items-center">
              <p className="text-[10px] font-bold text-primary uppercase mb-2">Scan to Pay Online</p>
              <img src={settings.paymentQrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain" />
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>
              {currencyPrefix}
              {total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tax (0%)</span>
            <span>{currencyPrefix}0.00</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-lg font-bold text-slate-700">Total</span>
            <span className="text-3xl font-black text-primary">
              {currencyPrefix}
              {total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center text-xs text-slate-400">
        <p>This is a computer-generated receipt.</p>
        <p className="mt-1">
          Copyright {new Date().getFullYear()} {clinicName}. All rights reserved.
        </p>
      </div>

      <style
        type="text/css"
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          .print\\:hidden { display: none !important; }
        }
      `,
        }}
      />
    </div>
  );
}
