
import React, { useState, useCallback } from 'react';
import { Upstream, VIP, Server } from './types';
import { generateNginxConfig } from './services/geminiService';
import { PlusIcon, TrashIcon, ServerIcon, GlobeAltIcon, CodeBracketIcon, SparklesIcon, ChevronDownIcon } from './components/Icons';

// Helper to generate unique IDs
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Header: React.FC = () => (
  <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 shadow-lg sticky top-0 z-10">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CodeBracketIcon className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white tracking-wider">Nginx Config AI Assistant</h1>
      </div>
       <div className="flex items-center gap-2 text-sm text-cyan-400 font-semibold">
        <SparklesIcon className="w-5 h-5" />
        <span>Powered by Gemini</span>
      </div>
    </div>
  </header>
);

interface UpstreamFormProps {
  onAddUpstream: (upstream: Upstream) => void;
}

const UpstreamForm: React.FC<UpstreamFormProps> = ({ onAddUpstream }) => {
  const [name, setName] = useState('');
  const [servers, setServers] = useState<Server[]>([{ id: generateId(), address: '', port: 80 }]);
  const [method, setMethod] = useState<'round_robin' | 'least_conn' | 'ip_hash'>('round_robin');
  const [healthCheck, setHealthCheck] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddServer = () => {
    setServers([...servers, { id: generateId(), address: '', port: 80 }]);
  };

  const handleServerChange = (id: string, field: 'address' | 'port', value: string) => {
    setServers(servers.map(s => s.id === id ? { ...s, [field]: field === 'port' ? parseInt(value, 10) : value } : s));
  };

  const handleRemoveServer = (id: string) => {
    setServers(servers.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || servers.some(s => !s.address.trim())) return;
    onAddUpstream({ id: generateId(), name, servers, method, healthCheck });
    setName('');
    setServers([{ id: generateId(), address: '', port: 80 }]);
    setMethod('round_robin');
    setHealthCheck(false);
    setIsOpen(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md mb-6">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-white">
        <span>Add New Upstream</span>
        <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="up_name" className="block text-sm font-medium text-gray-300 mb-1">Upstream Name</label>
              <input type="text" id="up_name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., backend_servers" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required />
            </div>
            <div>
              <label htmlFor="up_method" className="block text-sm font-medium text-gray-300 mb-1">Load Balancing Method</label>
              <select id="up_method" value={method} onChange={e => setMethod(e.target.value as any)} className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500">
                <option value="round_robin">Round Robin</option>
                <option value="least_conn">Least Connections</option>
                <option value="ip_hash">IP Hash</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-300 mb-2">Backend Servers</h4>
            {servers.map((server, index) => (
              <div key={server.id} className="flex items-center gap-2 mb-2">
                <input type="text" value={server.address} onChange={e => handleServerChange(server.id, 'address', e.target.value)} placeholder="IP Address or Hostname" className="flex-grow bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required />
                <input type="number" value={server.port} onChange={e => handleServerChange(server.id, 'port', e.target.value)} placeholder="Port" className="w-24 bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required />
                <button type="button" onClick={() => handleRemoveServer(server.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={handleAddServer} className="mt-2 flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
              <PlusIcon className="w-4 h-4" /> Add Server
            </button>
          </div>
          
          <div className="flex items-center mb-4">
            <input type="checkbox" id="up_health_check" checked={healthCheck} onChange={e => setHealthCheck(e.target.checked)} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
            <label htmlFor="up_health_check" className="ml-2 block text-sm text-gray-300">Enable Active Health Check</label>
          </div>

          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md">Add Upstream</button>
        </form>
      )}
    </div>
  );
};

interface VIPFormProps {
  upstreams: Upstream[];
  onAddVIP: (vip: VIP) => void;
}

const VIPForm: React.FC<VIPFormProps> = ({ upstreams, onAddVIP }) => {
  const [listenPort, setListenPort] = useState(80);
  const [serverName, setServerName] = useState('');
  const [upstreamName, setUpstreamName] = useState('');
  const [ssl, setSsl] = useState(false);
  const [sslCert, setSslCert] = useState('');
  const [sslKey, setSslKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !upstreamName) return;
    onAddVIP({ id: generateId(), listenPort, serverName, upstreamName, ssl, sslCert, sslKey });
    setListenPort(80);
    setServerName('');
    setUpstreamName('');
    setSsl(false);
    setSslCert('');
    setSslKey('');
    setIsOpen(false);
  };
  
  const handleSslToggle = (checked: boolean) => {
      setSsl(checked);
      if (checked) {
          setListenPort(443);
      } else {
          setListenPort(80);
      }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-white">
        <span>Add New VIP (Server Block)</span>
        <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="vip_server_name" className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
              <input type="text" id="vip_server_name" value={serverName} onChange={e => setServerName(e.target.value)} placeholder="e.g., app.example.com" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required />
            </div>
            <div>
              <label htmlFor="vip_port" className="block text-sm font-medium text-gray-300 mb-1">Listen Port</label>
              <input type="number" id="vip_port" value={listenPort} onChange={e => setListenPort(parseInt(e.target.value))} className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required />
            </div>
            <div>
              <label htmlFor="vip_upstream" className="block text-sm font-medium text-gray-300 mb-1">Target Upstream</label>
              <select id="vip_upstream" value={upstreamName} onChange={e => setUpstreamName(e.target.value)} className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500" required>
                <option value="" disabled>Select an upstream</option>
                {upstreams.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-center mb-4">
            <input type="checkbox" id="vip_ssl" checked={ssl} onChange={e => handleSslToggle(e.target.checked)} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
            <label htmlFor="vip_ssl" className="ml-2 block text-sm text-gray-300">Enable SSL/TLS (Port 443)</label>
          </div>
          
          {ssl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="vip_cert" className="block text-sm font-medium text-gray-300 mb-1">SSL Certificate (.crt)</label>
                <textarea id="vip_cert" value={sslCert} onChange={e => setSslCert(e.target.value)} rows={4} placeholder="Paste your certificate content here" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 font-mono text-xs"></textarea>
              </div>
              <div>
                <label htmlFor="vip_key" className="block text-sm font-medium text-gray-300 mb-1">SSL Private Key (.key)</label>
                <textarea id="vip_key" value={sslKey} onChange={e => setSslKey(e.target.value)} rows={4} placeholder="Paste your private key content here" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 font-mono text-xs"></textarea>
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md">Add VIP</button>
        </form>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [vips, setVips] = useState<VIP[]>([]);
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addUpstream = (upstream: Upstream) => setUpstreams([...upstreams, upstream]);
  const removeUpstream = (id: string) => setUpstreams(upstreams.filter(u => u.id !== id));

  const addVIP = (vip: VIP) => setVips([...vips, vip]);
  const removeVIP = (id:string) => setVips(vips.filter(v => v.id !== id));

  const handleGenerateConfig = useCallback(async () => {
    if (upstreams.length === 0 || vips.length === 0) {
      alert("Please define at least one upstream and one VIP before generating the configuration.");
      return;
    }
    setIsLoading(true);
    setGeneratedConfig('');
    try {
      const config = await generateNginxConfig(upstreams, vips);
      setGeneratedConfig(config);
    } catch (error) {
      setGeneratedConfig("An error occurred while generating the configuration.");
    } finally {
      setIsLoading(false);
    }
  }, [upstreams, vips]);

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedConfig).then(() => {
          alert('Configuration copied to clipboard!');
      }, (err) => {
          alert('Failed to copy configuration.');
          console.error('Clipboard copy failed: ', err);
      });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center gap-2"><ServerIcon /> Upstreams Configuration</h2>
            <UpstreamForm onAddUpstream={addUpstream} />
            <div className="space-y-4">
              {upstreams.map(up => (
                <div key={up.id} className="bg-gray-800 p-4 rounded-lg shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">{up.name}</h3>
                      <p className="text-sm text-gray-400 capitalize">Method: {up.method.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-400">Health Check: {up.healthCheck ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <button onClick={() => removeUpstream(up.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full transition-colors">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 border-t border-gray-700 pt-3">
                    <h4 className="font-semibold text-gray-300 text-sm">Servers:</h4>
                    <ul className="list-disc list-inside mt-2 text-gray-400 text-sm">
                      {up.servers.map(s => <li key={s.id}>{s.address}:{s.port}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            
            <h2 className="text-2xl font-bold mb-4 mt-8 text-cyan-400 flex items-center gap-2"><GlobeAltIcon /> VIPs Configuration</h2>
            <VIPForm upstreams={upstreams} onAddVIP={addVIP} />
            <div className="space-y-4">
              {vips.map(vip => (
                <div key={vip.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">{vip.serverName}</h3>
                      <p className="text-sm text-gray-400">Listen Port: {vip.listenPort}</p>
                      <p className="text-sm text-gray-400">Upstream: {vip.upstreamName}</p>
                      <p className={`text-sm font-semibold ${vip.ssl ? 'text-green-400' : 'text-yellow-400'}`}>SSL/TLS: {vip.ssl ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <button onClick={() => removeVIP(vip.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full transition-colors">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="sticky top-24 self-start">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center gap-2"><SparklesIcon /> Generated Configuration</h2>
            <div className="bg-gray-800 rounded-lg shadow-md p-4">
              <button onClick={handleGenerateConfig} disabled={isLoading} className="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-md transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    Generate with AI
                  </>
                )}
              </button>
              <div className="mt-4 relative">
                <pre className="bg-black text-sm text-white p-4 rounded-md overflow-x-auto h-96 max-h-[60vh] font-mono whitespace-pre-wrap break-words">
                  <code>
                    {generatedConfig || "// Your generated Nginx config will appear here..."}
                  </code>
                </pre>
                {generatedConfig && (
                   <button onClick={copyToClipboard} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-1 px-2 rounded-md transition-colors">
                     Copy
                   </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

