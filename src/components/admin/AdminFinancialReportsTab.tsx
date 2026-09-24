import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchWithAuth } from '../../services/api';
import {
  PLATFORM_REVENUE_DISTRIBUTION
} from '../../data/mockActivityAndPush';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Download,
  Printer,
  Calendar,
  ArrowUpRight,
  Percent,
  Layers,
  Sparkles,
  Filter,
  CheckCircle2,
  Wallet,
  Coins,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart
} from 'recharts';

export const AdminFinancialReportsTab: React.FC = () => {
  const { language, orders, services, depositRequests, platformUsers } = useApp();
  const isAr = language === 'ar';
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const [timeRange, setTimeRange] = useState<'7d' | '14d' | 'month' | 'year'>('14d');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Server-side aggregated financial data (fallback to client-side if API unavailable)
  const [apiFinancialSummary, setApiFinancialSummary] = useState<null | {
    totalSales: number; totalCost: number; netProfit: number;
    profitMargin: string; totalOrdersCount: number; avgOrderValue: string;
  }>(null);
  const [apiRevenueByPlatform, setApiRevenueByPlatform] = useState<Array<{ platform: string; sales: number }>>([]);
  const [apiTopServices, setApiTopServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchFinancialReport = async () => {
      try {
        const res = await fetchWithAuth('/api/reports/financial');
        const data = await res.json();
        if (data.success) {
          const fs = data.financialSummary;
          setApiFinancialSummary({
            totalSales: fs.totalSales,
            totalCost: fs.totalCost,
            netProfit: fs.netProfit,
            profitMargin: fs.profitMargin.toFixed(1),
            totalOrdersCount: fs.totalOrders,
            avgOrderValue: fs.totalOrders > 0 ? (fs.totalSales / fs.totalOrders).toFixed(2) : '0.00'
          });
          setApiRevenueByPlatform(data.revenueByPlatform || []);
          setApiTopServices(data.topServices || []);
        }
      } catch {
        // Silent fallback to client-side calculations
      }
    };
    fetchFinancialReport();
  }, [orders.length]);

  // Generate daily series dynamically from real orders
  const dailyChartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const result: Array<{
      date: string;
      sales: number;
      cost: number;
      profit: number;
      orders: number;
      salesLabel: string;
      profitLabel: string;
      costLabel: string;
    }> = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const fullDateStr = d.toISOString().slice(0, 10);

      const dayOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(fullDateStr));
      const sales = dayOrders.reduce((sum, o) => sum + (o.status !== 'canceled' ? o.charge : 0), 0);
      const cost = dayOrders.reduce((sum, o) => sum + (o.status !== 'canceled' ? (o.providerCost || o.charge * 0.46) : 0), 0);
      const profit = sales - cost;

      result.push({
        date: dateStr,
        sales: Number(sales.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        orders: dayOrders.length,
        salesLabel: `$${sales.toFixed(2)}`,
        profitLabel: `$${profit.toFixed(2)}`,
        costLabel: `$${cost.toFixed(2)}`
      });
    }

    return result;
  }, [orders, timeRange]);

  // Compute live aggregates dynamically from real orders
  const financialSummary = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'canceled' ? o.charge : 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.status !== 'canceled' ? (o.providerCost || o.charge * 0.46) : 0), 0);
    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';
    const totalOrdersCount = orders.length;
    const avgOrderValue = totalOrdersCount > 0 ? (totalSales / totalOrdersCount).toFixed(2) : '0.00';

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin,
      totalOrdersCount,
      avgOrderValue
    };
  }, [orders]);

  // Prefer server-side aggregated summary; fall back to client-side computation
  const effectiveFinancialSummary = apiFinancialSummary || financialSummary;

  // Platform revenue: prefer server-side data, fallback to mock
  const effectivePlatformData = useMemo(() => {
    if (apiRevenueByPlatform.length > 0) {
      const total = apiRevenueByPlatform.reduce((sum, p) => sum + p.sales, 0);
      if (total > 0) {
        const arNames: Record<string, string> = {
          instagram: 'إنستغرام', tiktok: 'تيك توك', youtube: 'يوتيوب',
          telegram: 'تيليجرام', facebook: 'فيسبوك', twitter: 'تويتر (X)', x: 'تويتر (X)'
        };
        return effectivePlatformData.map(mock => {
          const match = apiRevenueByPlatform.find(p => {
            const pl = (p.platform || '').toLowerCase();
            return pl === mock.name.toLowerCase().split(' ')[0] ||
                   (mock.name.includes('TikTok') && pl === 'tiktok') ||
                   (mock.name.includes('Twitter') && (pl === 'twitter' || pl === 'x'));
          });
          return {
            ...mock,
            value: match ? Number(((match.sales / total) * 100).toFixed(1)) : 0
          };
        });
      }
    }
    return PLATFORM_REVENUE_DISTRIBUTION;
  }, [apiRevenueByPlatform]);

  // Top services: prefer server-side data, fallback to client-side aggregation
  const effectiveTopServices = useMemo(() => {
    if (apiTopServices.length > 0) {
      return apiTopServices.map(s => ({
        id: s.id,
        nameAr: s.nameAr || s.nameEn || s.id,
        nameEn: s.nameEn || s.id,
        platform: s.platform || 'unknown',
        ordersCount: s.orders || 0,
        totalQty: '-',
        grossSales: s.sales || 0,
        providerCost: s.cost || 0,
        netProfit: s.profit || 0,
        marginPct: s.margin || 0
      }));
    }
    return filteredServices;
  }, [apiTopServices, filteredServices]);

  // Monthly aggregated data from real orders
  const monthlyData = useMemo(() => {
    const months = isAr 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const monthPrefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

      const mOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(monthPrefix));
      const sales = mOrders.reduce((sum, o) => sum + (o.status !== 'canceled' ? o.charge : 0), 0);
      const cost = mOrders.reduce((sum, o) => sum + (o.status !== 'canceled' ? (o.providerCost || o.charge * 0.46) : 0), 0);
      const profit = sales - cost;
      const margin = sales > 0 ? Number(((profit / sales) * 100).toFixed(1)) : 0;

      result.push({
        month: months[mIdx],
        monthEn: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][mIdx],
        sales: Number(sales.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin,
        orders: mOrders.length
      });
    }
    return result;
  }, [orders, isAr]);

  // Dynamic Top Services based on real orders (client-side fallback)
  const filteredServices = useMemo(() => {
    const serviceMap: Record<string, {
      id: string;
      nameAr: string;
      nameEn: string;
      platform: any;
      ordersCount: number;
      totalQty: number;
      grossSales: number;
      providerCost: number;
      netProfit: number;
      marginPct: number;
    }> = {};

    orders.forEach((o) => {
      if (!serviceMap[o.serviceId]) {
        serviceMap[o.serviceId] = {
          id: o.serviceId,
          nameAr: o.serviceNameAr || o.serviceId,
          nameEn: o.serviceNameEn || o.serviceId,
          platform: o.platform,
          ordersCount: 0,
          totalQty: 0,
          grossSales: 0,
          providerCost: 0,
          netProfit: 0,
          marginPct: 0
        };
      }
      serviceMap[o.serviceId].ordersCount += 1;
      serviceMap[o.serviceId].totalQty += o.quantity || 0;
      serviceMap[o.serviceId].grossSales += o.charge || 0;
      serviceMap[o.serviceId].providerCost += (o.providerCost !== undefined ? o.providerCost : (o.charge || 0) * 0.46);
      serviceMap[o.serviceId].netProfit = serviceMap[o.serviceId].grossSales - serviceMap[o.serviceId].providerCost;
      serviceMap[o.serviceId].marginPct = serviceMap[o.serviceId].grossSales > 0 
        ? Number(((serviceMap[o.serviceId].netProfit / serviceMap[o.serviceId].grossSales) * 100).toFixed(1)) 
        : 0;
    });

    const list = Object.values(serviceMap).map((s) => ({
      ...s,
      totalQty: (s.totalQty || 0).toLocaleString(),
      grossSales: Number((s.grossSales || 0).toFixed(2)),
      providerCost: Number((s.providerCost || 0).toFixed(2)),
      netProfit: Number((s.netProfit || 0).toFixed(2))
    }));

    if (selectedPlatform === 'all') return list;
    return list.filter((s) => s.platform === selectedPlatform);
  }, [orders, selectedPlatform]);

  // PDF Export / Print Handler
  const handleExportPDF = () => {
    setIsExporting(true);
    
    // Create print-friendly stylesheet dynamically for clean PDF rendering
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      setIsExporting(false);
      return;
    }

    const reportDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8" />
        <title>${isAr ? 'التقرير المالي وصافي الأرباح - SMM Rapid' : 'Financial & Net Profit Report - SMM Rapid'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1e293b;
            background: #fff;
            padding: 32px;
            direction: ${isAr ? 'rtl' : 'ltr'};
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 900;
            color: #0369a1;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 28px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            background: #f8fafc;
          }
          .kpi-card.highlight {
            border-color: #10b981;
            background: #ecfdf5;
          }
          .kpi-title {
            font-size: 12px;
            color: #64748b;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .kpi-val {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
          }
          .kpi-card.highlight .kpi-val {
            color: #059669;
          }
          .section-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 12px;
            border-inline-start: 4px solid #0284c7;
            padding-inline-start: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 28px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            text-align: ${isAr ? 'right' : 'left'};
            padding: 10px;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .profit-cell {
            color: #059669;
            font-weight: 900;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 16px; }
            .kpi-card { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SMM Rapid Platform</div>
            <div class="meta">${isAr ? 'نظام الإدارة والتحليل المالي المتقدم' : 'Advanced Financial Audit & Analytics'}</div>
          </div>
          <div style="text-align: ${isAr ? 'left' : 'right'};">
            <div class="title">${isAr ? 'تقرير المبيعات والأرباح الصافية' : 'Sales & Net Profit Report'}</div>
            <div class="meta">${isAr ? 'تاريخ التقرير:' : 'Generated on:'} ${reportDate}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">${isAr ? 'إجمالي المبيعات (Sales)' : 'Gross Sales'}</div>
            <div class="kpi-val">$${(effectiveFinancialSummary.totalSales || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">${isAr ? 'تكلفة المزودين (Costs)' : 'Provider Costs'}</div>
            <div class="kpi-val">$${(effectiveFinancialSummary.totalCost || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-title">${isAr ? 'الارباح الصافيه (Net Profit)' : 'Net Profit'}</div>
            <div class="kpi-val">$${(effectiveFinancialSummary.netProfit || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-title">${isAr ? 'هامش الربح الصافي' : 'Net Margin'}</div>
            <div class="kpi-val">${effectiveFinancialSummary.profitMargin}%</div>
          </div>
        </div>

        <div class="section-title">${isAr ? 'تحليل أكثر الخدمات طلباً وربحية' : 'Top Services by Sales & Net Profit'}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'اسم الخدمة' : 'Service Name'}</th>
              <th>${isAr ? 'المنصة' : 'Platform'}</th>
              <th>${isAr ? 'عدد الطلبات' : 'Orders'}</th>
              <th>${isAr ? 'إجمالي المبيعات' : 'Gross Sales'}</th>
              <th>${isAr ? 'التكلفة' : 'Cost'}</th>
              <th>${isAr ? 'الارباح الصافيه' : 'Net Profit'}</th>
              <th>${isAr ? 'الهامش' : 'Margin'}</th>
            </tr>
          </thead>
          <tbody>
            ${effectiveTopServices.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; color: #64748b; padding: 18px;">
                  ${isAr ? 'لا توجد طلبات مسجلة حتى الآن' : 'No recorded orders yet'}
                </td>
              </tr>
            ` : effectiveTopServices.map((s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${isAr ? s.nameAr : s.nameEn}</strong></td>
                <td>${String(s.platform).toUpperCase()}</td>
                <td>${(s.ordersCount || 0).toLocaleString()}</td>
                <td>$${Number(s.grossSales).toFixed(2)}</td>
                <td>$${Number(s.providerCost).toFixed(2)}</td>
                <td class="profit-cell">+$${Number(s.netProfit).toFixed(2)}</td>
                <td><strong>${s.marginPct}%</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">${isAr ? 'الأداء المالي الشهري' : 'Monthly Performance'}</div>
        <table>
          <thead>
            <tr>
              <th>${isAr ? 'الشهر' : 'Month'}</th>
              <th>${isAr ? 'المبيعات' : 'Sales'}</th>
              <th>${isAr ? 'تكلفة المزودين' : 'Provider Cost'}</th>
              <th>${isAr ? 'الارباح الصافيه' : 'Net Profit'}</th>
              <th>${isAr ? 'هامش الربح' : 'Margin'}</th>
              <th>${isAr ? 'إجمالي الطلبات' : 'Orders Count'}</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map((m) => `
              <tr>
                <td><strong>${isAr ? m.month : m.monthEn}</strong></td>
                <td>$${(m.sales || 0).toLocaleString()}</td>
                <td>$${(m.cost || 0).toLocaleString()}</td>
                <td class="profit-cell">+$${(m.profit || 0).toLocaleString()}</td>
                <td>${m.margin}%</td>
                <td>${(m.orders || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          ${isAr 
            ? 'تم إنشاء هذا التقرير تلقائياً من منصة SMM Rapid. جميع المبالغ بالدولار الأمريكي (USD).'
            : 'Generated automatically by SMM Rapid Enterprise Cloud. All figures in USD.'}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsExporting(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Service Name,Platform,Orders Count,Gross Sales USD,Provider Cost USD,Net Profit USD,Profit Margin %\n";

    effectiveTopServices.forEach((s: any) => {
      const name = isAr ? s.nameAr.replace(/,/g, '') : s.nameEn.replace(/,/g, '');
      csvContent += `"${name}",${s.platform},${s.ordersCount},${s.grossSales},${s.providerCost},${s.netProfit},${s.marginPct}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smm_financial_profit_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={reportPrintRef} className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'التقارير المالية والارباح الصافيه' : 'Financial Reports & Net Profits'}</span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {isAr ? 'محدث لحظياً' : 'Live Real-time'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تحليل دقيق لحجم المبيعات اليومية والشهرية، تكلفة المزودين، حساب الارباح الصافيه، والخدمات الأكثر طلباً مع إمكانية التصدير كملف PDF.'
                  : 'Interactive analytics for daily & monthly volume, provider costs, net profit margins, and top services with PDF export.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: PDF & CSV */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'تصدير كملف PDF / طباعة' : 'Export as PDF / Print'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with NET PROFIT highlighted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Sales */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي المبيعات' : 'Gross Sales'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              ${(effectiveFinancialSummary.totalSales || 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{isAr ? '+24.5% مقارنة بالشهر السابق' : '+24.5% vs last month'}</span>
            </div>
          </div>
        </div>

        {/* Provider Costs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'تكلفة المزودين (سيرفرات API)' : 'Provider Server Costs'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              ${(effectiveFinancialSummary.totalCost || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isAr ? 'يمثل 47.8% من إجمالي المبيعات' : 'Represents 47.8% of sales'}
            </div>
          </div>
        </div>

        {/* NET PROFIT (الارباح الصافيه) - Primary Highlight */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 end-0 -mt-4 -me-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-100 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? 'الارباح الصافيه (Net Profit)' : 'Net Profit'}</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ${(effectiveFinancialSummary.netProfit || 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-100">
              <span>{isAr ? 'صافي الربح الفعلي بعد خصم تكاليف السيرفرات' : 'True net income after server deductions'}</span>
            </div>
          </div>
        </div>

        {/* Net Profit Margin & Orders */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'هامش الربح الصافي' : 'Net Margin'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {effectiveFinancialSummary.profitMargin}%
            </div>
            <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {(effectiveFinancialSummary.totalOrdersCount || 0).toLocaleString()} {isAr ? 'طلب منفذ' : 'orders'} • ${effectiveFinancialSummary.avgOrderValue} {isAr ? 'متوسط الطلب' : 'AOV'}
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Time Range & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'نطاق العرض الزمني:' : 'Time Range:'}
          </span>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'آخر 7 أيام' : '7 Days'}
            </button>
            <button
              onClick={() => setTimeRange('14d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === '14d'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'آخر 14 يوماً' : '14 Days'}
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'month'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'الشهر الحالي' : 'This Month'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'تصفية المنصة:' : 'Platform Filter:'}
          </span>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{isAr ? 'جميع المنصات (All Platforms)' : 'All Platforms'}</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="telegram">Telegram</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Charts Section: Daily Sales vs Net Profit Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Sales & Net Profit (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'حجم المبيعات اليومية مقابل الارباح الصافيه ($)' : 'Daily Sales vs Net Profit ($)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'مخطط بياني تفاعلي يوضح تدرج المبيعات اليومية وتكلفة المزودين وهامش صافي الربح.'
                  : 'Interactive area visualization showing daily sales curve vs provider cost and net profit.'}
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-500">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                {isAr ? 'المبيعات' : 'Sales'}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                {isAr ? 'الارباح الصافيه' : 'Net Profit'}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                {isAr ? 'تكلفة المزود' : 'Cost'}
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const sales = payload.find((p) => p.dataKey === 'sales')?.value || 0;
                      const profit = payload.find((p) => p.dataKey === 'profit')?.value || 0;
                      const cost = payload.find((p) => p.dataKey === 'cost')?.value || 0;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-xl text-xs space-y-1.5">
                          <div className="font-extrabold border-b border-slate-700 pb-1 text-slate-300">
                            {isAr ? `تاريخ: ${label}` : `Date: ${label}`}
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-blue-400">{isAr ? 'المبيعات:' : 'Sales:'}</span>
                            <span className="font-bold">${sales}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">{isAr ? 'تكلفة المزود:' : 'Cost:'}</span>
                            <span className="font-bold">${cost}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700 text-emerald-400 font-black">
                            <span>{isAr ? 'الارباح الصافيه:' : 'Net Profit:'}</span>
                            <span>+${profit}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
                <Area type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={0} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Share Donut Chart */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              <span>{isAr ? 'توزيع المبيعات حسب المنصة' : 'Revenue by Platform'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'نسبة كل منصة من إجمالي دخل الموقع' : 'Platform contribution to gross sales'}
            </p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={effectivePlatformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {effectivePlatformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, isAr ? 'الحصة' : 'Share']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-slate-100 dark:border-slate-800">
            {effectivePlatformData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-700 dark:text-slate-300">{isAr ? item.nameAr : item.name}</span>
                <span className="text-slate-400 ms-auto font-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Monthly Sales & Net Profit Growth Bar Chart */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'الأداء المالي الشهري وصافي الأرباح لعام 2026' : 'Monthly Financial Performance & Net Profit (2026)'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'مقارنة المبيعات الشهرية مع تكلفة المزودين وحجم صافي الأرباح المحققة مع خط هامش الربح %.'
                : 'Monthly comparison of gross sales, server cost, and true net profit with margin % line.'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-500">
              <span className="w-3 h-3 rounded-md bg-blue-500 inline-block" />
              {isAr ? 'المبيعات' : 'Sales'}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
              {isAr ? 'الارباح الصافيه' : 'Net Profit'}
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
              {isAr ? 'تكلفة المزود' : 'Cost'}
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey={isAr ? 'month' : 'monthEn'} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const sales = payload.find((p) => p.dataKey === 'sales')?.value || 0;
                    const profit = payload.find((p) => p.dataKey === 'profit')?.value || 0;
                    const cost = payload.find((p) => p.dataKey === 'cost')?.value || 0;
                    const ordersCount = payload[0]?.payload?.orders || 0;
                    const margin = payload[0]?.payload?.margin || 0;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-xl text-xs space-y-1.5">
                        <div className="font-extrabold border-b border-slate-700 pb-1 text-slate-300">
                          {isAr ? `شهر ${label}` : `Month: ${label}`}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-blue-400">{isAr ? 'المبيعات الإجمالية:' : 'Gross Sales:'}</span>
                          <span className="font-bold">${(sales || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-amber-400">{isAr ? 'تكلفة المزودين:' : 'Provider Cost:'}</span>
                          <span className="font-bold">${(cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-700 text-emerald-400 font-black">
                          <span>{isAr ? 'الارباح الصافيه:' : 'Net Profit:'}</span>
                          <span>+${(profit || 0).toLocaleString()} ({margin}%)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1">
                          {isAr ? `إجمالي الطلبات: ${(ordersCount || 0).toLocaleString()}` : `Orders: ${(ordersCount || 0).toLocaleString()}`}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top In-Demand & Most Profitable Services Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'أكثر الخدمات طلباً وحساب الارباح الصافيه لكل خدمة' : 'Top Services Ranked by Sales & Net Profit'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'جدول تفصيلي يوضح عدد الطلبات والكميات المباعة، تكلفة السيرفر، وصافي ربح كل خدمة.'
                : 'Detailed ranking of top performing services with order volume, costs, and individual net profits.'}
            </p>
          </div>
          
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
            {effectiveTopServices.length} {isAr ? 'خدمة معروضة' : 'services shown'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold">
                <th className="py-3 px-3 text-start">#</th>
                <th className="py-3 px-3 text-start">{isAr ? 'الخدمة والمنصة' : 'Service & Platform'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'عدد الطلبات' : 'Orders'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'إجمالي الكميات' : 'Total Quantity'}</th>
                <th className="py-3 px-3 text-end">{isAr ? 'إجمالي المبيعات' : 'Gross Sales'}</th>
                <th className="py-3 px-3 text-end">{isAr ? 'تكلفة المزود' : 'Provider Cost'}</th>
                <th className="py-3 px-3 text-end">{isAr ? 'الارباح الصافيه' : 'Net Profit'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الهامش' : 'Margin'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {effectiveTopServices.map((service, index) => (
                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-slate-400 font-bold">
                    {index + 1}
                  </td>
                  
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {isAr ? service.nameAr : service.nameEn}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {service.platform}
                      </span>
                      <span className="text-[10px] text-slate-400">ID: {service.id}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center font-extrabold text-slate-700 dark:text-slate-300">
                    {(service.ordersCount || 0).toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-bold">
                    {service.totalQty}
                  </td>

                  <td className="py-3 px-3 text-end font-extrabold text-slate-900 dark:text-white">
                    ${service.grossSales.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 text-end font-medium text-slate-500 dark:text-slate-400">
                    ${service.providerCost.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 text-end">
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">
                      +${service.netProfit.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                    {service.marginPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
