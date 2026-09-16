import { useState } from 'react';
import { Copy, Code, Globe, Key, Zap, List, Plus, BarChart3, Wallet, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, LanguageSwitcher, ThemeToggle } from '../lib/i18n';
import SEO, { SITE } from '../components/SEO';
import { notify } from '../lib/notify';

export default function ApiDocsPage() {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const ar = dir === 'rtl';
  const [copied, setCopied] = useState(false);

  const baseUrl = `${window.location.origin}/api/v2`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    notify.success(t('api.copyCode'));
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = [
    {
      key: 'services',
      icon: List,
      title: t('api.docServices'),
      desc: t('api.docServicesDesc'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      params: [{ name: 'key', type: 'string', required: true, desc: t('api.docKeyDesc') }],
      response: `{
  "service": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Instagram Followers - 1000",
  "rate": "2.50",
  "min": 100,
  "max": 100000,
  "category": "Instagram"
}`,
      responseDesc: 'Array of service objects',
    },
    {
      key: 'add',
      icon: Plus,
      title: t('api.docAdd'),
      desc: t('api.docAddDesc'),
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      params: [
        { name: 'key', type: 'string', required: true, desc: t('api.docKeyDesc') },
        { name: 'service', type: 'string', required: true, desc: 'Service ID (UUID)' },
        { name: 'link', type: 'string', required: true, desc: 'Target URL or username' },
        { name: 'quantity', type: 'integer', required: true, desc: 'Number of units to order' },
      ],
      response: `{
  "order": 12345
}`,
      responseDesc: 'Returns the numeric order ID',
    },
    {
      key: 'status',
      icon: Search,
      title: t('api.docStatus'),
      desc: t('api.docStatusDesc'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      params: [
        { name: 'key', type: 'string', required: true, desc: t('api.docKeyDesc') },
        { name: 'order', type: 'string', required: true, desc: 'Order ID' },
      ],
      response: `{
  "order": "12345",
  "status": "Completed",
  "charge": "2.5000",
  "start_count": 0,
  "remains": 0,
  "currency": "USD"
}`,
      responseDesc: 'Single order status object',
    },
    {
      key: 'balance',
      icon: Wallet,
      title: t('api.docBalance'),
      desc: t('api.docBalanceDesc'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      params: [{ name: 'key', type: 'string', required: true, desc: t('api.docKeyDesc') }],
      response: `{
  "balance": "100.0000",
  "currency": "USD"
}`,
      responseDesc: 'Balance and currency',
    },
  ];

  const curlExample = (action: string) => {
    if (action === 'services') return `curl -X GET "${baseUrl}?key=YOUR_API_KEY&action=services"`;
    if (action === 'add') return `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_API_KEY",
    "action": "add",
    "service": "550e8400-e29b-41d4-a716-446655440000",
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'`;
    if (action === 'status') return `curl -X GET "${baseUrl}?key=YOUR_API_KEY&action=status&order=12345"`;
    if (action === 'balance') return `curl -X GET "${baseUrl}?key=YOUR_API_KEY&action=balance"`;
    return '';
  };

  const phpExample = (action: string) => {
    if (action === 'services') return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${baseUrl}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'key' => 'YOUR_API_KEY',
    'action' => 'services'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$result = curl_exec($ch);
curl_close($ch);
echo $result;`;
    if (action === 'add') return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${baseUrl}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'key' => 'YOUR_API_KEY',
    'action' => 'add',
    'service' => '550e8400-e29b-41d4-a716-446655440000',
    'link' => 'https://instagram.com/username',
    'quantity' => 1000
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$result = curl_exec($ch);
curl_close($ch);
echo $result;`;
    if (action === 'status') return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${baseUrl}?key=YOUR_API_KEY&action=status&order=12345");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);
echo $result;`;
    if (action === 'balance') return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${baseUrl}?key=YOUR_API_KEY&action=balance");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);
echo $result;`;
    return '';
  };

  const pythonExample = (action: string) => {
    if (action === 'services') return `import requests

url = "${baseUrl}"
params = {
    'key': 'YOUR_API_KEY',
    'action': 'services'
}

response = requests.get(url, params=params)
print(response.json())`;
    if (action === 'add') return `import requests

url = "${baseUrl}"
data = {
    'key': 'YOUR_API_KEY',
    'action': 'add',
    'service': '550e8400-e29b-41d4-a716-446655440000',
    'link': 'https://instagram.com/username',
    'quantity': 1000
}

response = requests.post(url, json=data)
print(response.json())`;
    if (action === 'status') return `import requests

url = "${baseUrl}"
params = {
    'key': 'YOUR_API_KEY',
    'action': 'status',
    'order': '12345'
}

response = requests.get(url, params=params)
print(response.json())`;
    if (action === 'balance') return `import requests

url = "${baseUrl}"
params = {
    'key': 'YOUR_API_KEY',
    'action': 'balance'
}

response = requests.get(url, params=params)
print(response.json())`;
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200">
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-[1100px] flex h-[72px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="brand-mark">R</span>
            <span className="text-xl font-black tracking-tight">Rapid<span className="text-violet-600 dark:text-violet-400">SMM</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400">Home</Link>
              <Link to="/services" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400">Services</Link>
            </nav>
            <LanguageSwitcher className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 text-xs font-bold mb-6">
            <Globe className="w-4 h-4" />
            {t('api.docSubtitle')}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900 dark:text-gray-100">
            {t('api.docTitle')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            {t('api.docIntro')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{t('api.docKey')}</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('api.docKeyDesc')}</p>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 font-mono text-sm text-gray-800 dark:text-gray-300 break-all">
            {baseUrl}?key=YOUR_API_KEY&action=services
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('api.docActions')}</h2>
          {actions.map((action) => (
            <div key={action.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className={`flex items-center gap-4 p-6 ${action.bgColor} border-b border-gray-200 dark:border-slate-700`}>
                <div className={`p-3 rounded-xl ${action.bgColor}`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{action.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.desc}</p>
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-3">{t('api.paramDesc')}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="pb-3 text-gray-700 dark:text-gray-300 font-semibold">{t('api.paramKey')}</th>
                        <th className="pb-3 text-gray-700 dark:text-gray-300 font-semibold">{t('api.paramType')}</th>
                        <th className="pb-3 text-gray-700 dark:text-gray-300 font-semibold">{t('api.paramRequired')}</th>
                        <th className="pb-3 text-gray-700 dark:text-gray-300 font-semibold">{t('api.paramDesc')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {action.params.map((param) => (
                        <tr key={param.name} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-3 font-mono text-sm text-violet-600 dark:text-violet-400">{param.name}</td>
                          <td className="py-3 text-gray-600 dark:text-gray-400">{param.type}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${param.required ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
                              {param.required ? t('api.paramRequired') : t('api.paramOptional')}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600 dark:text-gray-400">{param.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-3">{t('api.response')}</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto mb-2">
                    {action.response}
                  </pre>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{action.responseDesc}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-2">Code Examples</h4>
                  {['curl', 'php', 'python'].map((lang) => {
                    const iconMap: Record<string, any> = { curl: Zap, php: Code, python: Code };
                    const Icon = iconMap[lang] || Code;
                    const labelMap: Record<string, string> = { curl: 'cURL', php: 'PHP', python: 'Python' };
                    const exampleMap = { curl: curlExample, php: phpExample, python: pythonExample };
                    return (
                      <div key={lang} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{labelMap[lang]}</span>
                          </div>
                          <button
                            onClick={() => copyCode(exampleMap[lang as keyof typeof exampleMap](action.key))}
                            className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            {copied ? '✓' : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <pre className="text-xs text-gray-800 dark:text-gray-300 overflow-x-auto">
                          {exampleMap[lang as keyof typeof exampleMap](action.key)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-200 dark:border-violet-700 p-6 text-center">
          <h3 className="font-bold text-lg text-violet-900 dark:text-violet-300 mb-2">{t('api.docKey')}</h3>
          <p className="text-sm text-violet-800 dark:text-violet-400 mb-4">
            {t('api.docKeyDesc')}
          </p>
          <button
            onClick={() => navigate('/dashboard/api')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            {t('api.viewClientApi')}
          </button>
        </div>
      </main>
    </div>
  );
}
