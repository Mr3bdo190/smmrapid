import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe,
  Calendar,
  ExternalLink,
  Coins
} from 'lucide-react';

export const InvoiceModal: React.FC = () => {
  const {
    language,
    invoiceModalOrder,
    invoiceModalDeposit,
    closeInvoiceModal,
    userProfile
  } = useApp();

  const isAr = language === 'ar';

  if (!invoiceModalOrder && !invoiceModalDeposit) return null;

  const isOrder = Boolean(invoiceModalOrder);
  const invoiceNumber = isOrder
    ? `INV-${invoiceModalOrder?.id.replace('ORD-', '')}`
    : `RCP-${invoiceModalDeposit?.id.replace('DEP-', '')}`;

  const issueDate = isOrder
    ? invoiceModalOrder?.createdAt || new Date().toISOString().slice(0, 10)
    : invoiceModalDeposit?.createdAt || new Date().toISOString().slice(0, 10);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 dark:text-white my-auto print:border-none print:shadow-none print:text-black">
        
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                {isAr ? 'فاتورة وإيصال معتمد' : 'Official Tax Invoice & Receipt'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / PDF'}</span>
            </button>
            <button
              onClick={closeInvoiceModal}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Card */}
        <div className="space-y-6" id="printable-invoice">
          
          {/* Header Brand & Details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                <Zap className="w-6 h-6 fill-white" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  SMM<span className="text-cyan-500">RAPID</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'منصة خدمات السوشيال ميديا والتسويق الرقمي' : 'Digital Growth & Social SMM Hub'}
                </div>
              </div>
            </div>

            <div className="sm:text-end text-xs space-y-1">
              <div className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-base">{invoiceNumber}</div>
              <div className="text-slate-500 flex items-center sm:justify-end gap-1">
                <Calendar className="w-3 h-3" />
                <span>{issueDate}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                <CheckCircle2 className="w-3 h-3" />
                <span>{isAr ? 'مدفوع ومعتمد' : 'PAID & VERIFIED'}</span>
              </div>
            </div>
          </div>

          {/* Billed To / Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-bold block mb-1">
                {isAr ? 'صدرت إلى (العميل):' : 'Billed To:'}
              </span>
              <div className="font-black text-sm text-slate-900 dark:text-white">{userProfile.name}</div>
              <div className="font-mono text-slate-500">{userProfile.email}</div>
              <div className="text-slate-400 text-[11px]">{userProfile.country}</div>
            </div>
            <div className="sm:text-end">
              <span className="text-slate-400 font-bold block mb-1">
                {isAr ? 'الجهة المصدرة:' : 'Issued By:'}
              </span>
              <div className="font-black text-sm text-slate-900 dark:text-white">SMM Rapid Global Inc.</div>
              <div className="text-slate-500">VAT / Tax ID: EG-789-204-SMM</div>
              <div className="text-slate-400 text-[11px]">support@smmrapid.com</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">{isAr ? 'البيان والخدمة' : 'Description'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'السعر' : 'Rate'}</th>
                  <th className="p-3.5 text-start sm:text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isOrder ? (
                  <tr>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {invoiceModalOrder?.serviceName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {invoiceModalOrder?.targetLink}
                      </div>
                      <div className="text-[10px] text-cyan-500 font-mono mt-0.5">
                        {isAr ? 'رقم الطلب:' : 'Order ID:'} {invoiceModalOrder?.id}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {(invoiceModalOrder?.quantity ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-500">
                      ${((invoiceModalOrder?.charge || 0) / ((invoiceModalOrder?.quantity || 1000) / 1000)).toFixed(2)}/1k
                    </td>
                    <td className="p-3.5 text-start sm:text-end font-mono font-black text-slate-900 dark:text-white">
                      ${(invoiceModalOrder?.charge ?? 0).toFixed(3)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {isAr ? 'شحن رصيد المحفظة عبر' : 'Wallet Deposit via'} {invoiceModalDeposit?.gatewayName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {invoiceModalDeposit?.accountNumber} ({invoiceModalDeposit?.transactionHash})
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      1
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-500">
                      ${invoiceModalDeposit?.amountUSD.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-start sm:text-end font-mono font-black text-slate-900 dark:text-white">
                      ${invoiceModalDeposit?.amountUSD.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 max-w-sm">
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              <span>
                {isAr
                  ? 'هذا المستند صادر إلكترونياً ومعتمد رسمياً من نظام SMM Rapid. لا يحتاج إلى توقيع خطي.'
                  : 'Electronically generated invoice certified by SMM Rapid. No physical signature required.'}
              </span>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ${isOrder ? invoiceModalOrder?.charge.toFixed(2) : invoiceModalDeposit?.amountUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'الضريبة المضافة (0%):' : 'Tax (0%):'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-slate-200 dark:border-slate-800 pt-2 text-slate-900 dark:text-white">
                <span>{isAr ? 'المبلغ الإجمالي المدفوع:' : 'Total Amount Paid:'}</span>
                <span className="font-mono text-emerald-500 text-base">
                  ${isOrder ? invoiceModalOrder?.charge.toFixed(2) : invoiceModalDeposit?.amountUSD.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
