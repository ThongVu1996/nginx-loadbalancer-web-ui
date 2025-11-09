
import React, { useState, useCallback } from 'react';
import { Upstream, VIP, Server } from './types';
import { generateNginxConfig } from './services/nginxConfigService';
import { PlusIcon, TrashIcon, ServerIcon, GlobeAltIcon, CodeBracketIcon, SparklesIcon, ChevronDownIcon, Cog8ToothIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon } from './components/Icons';
import { Modal } from './components/Modal';
import { GuidesTab } from './components/GuidesTab';

// Helper to generate unique IDs
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock API function to simulate applying config on a server
const applyNginxConfig = async (config: string): Promise<{ success: boolean; message: string }> => {
  console.log("Applying Nginx config:", config.substring(0, 200) + '...');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000)); 

  // Simulate a random success/failure
  if (Math.random() > 0.2) { // 80% success rate
    return { success: true, message: "Configuration applied and Nginx reloaded successfully!" };
  } else {
    return { success: false, message: "Failed to apply configuration. Nginx reported an error." };
  }
};

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600/95' : 'bg-red-600/95';
  const Icon = type === 'success' ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-24 right-5 z-[100] animate-fade-in-down">
      <div className={`${bgColor} text-white font-bold rounded-lg shadow-2xl flex items-center p-4 backdrop-blur-sm`}>
        <Icon className="w-6 h-6 mr-3 flex-shrink-0" />
        <p className="flex-grow">{message}</p>
        <button onClick={onClose} className="ml-4 -mr-2 p-1 rounded-full hover:bg-white/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};


const Header: React.FC = () => (
  <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 shadow-lg sticky top-0 z-10">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CodeBracketIcon className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white tracking-wider">Nginx Config Assistant</h1>
      </div>
      <div className="text-sm text-gray-400">
        Powered By <a href="https://tonytechlab.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">TonyTechLab 2025 - 2nd Release</a>
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
    setServers(servers.map(s => s.id === id ? { ...s, [field]: field === 'port' ? parseInt(value, 10) || 0 : value } : s));
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
            {servers.map((server) => (
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
                <label htmlFor="vip_cert_path" className="block text-sm font-medium text-gray-300 mb-1">SSL Certificate Path (.crt)</label>
                <input type="text" id="vip_cert_path" value={sslCert} onChange={e => setSslCert(e.target.value)} placeholder="/etc/nginx/ssl/app.example.com.crt" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm" />
              </div>
              <div>
                 <label htmlFor="vip_key_path" className="block text-sm font-medium text-gray-300 mb-1">SSL Private Key Path (.key)</label>
                <input type="text" id="vip_key_path" value={sslKey} onChange={e => setSslKey(e.target.value)} placeholder="/etc/nginx/ssl/app.example.com.key" className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm" />
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'guides'>('setup');
  const [isApplying, setIsApplying] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const addUpstream = (upstream: Upstream) => setUpstreams([...upstreams, upstream]);
  const removeUpstream = (id: string) => setUpstreams(upstreams.filter(u => u.id !== id));

  const addVIP = (vip: VIP) => setVips([...vips, vip]);
  const removeVIP = (id:string) => setVips(vips.filter(v => v.id !== id));

  const handleGenerateAndShowConfig = useCallback(() => {
    if (upstreams.length === 0 || vips.length === 0) {
      alert("Please define at least one upstream and one VIP before generating the configuration.");
      return;
    }
    const config = generateNginxConfig(upstreams, vips);
    setConfigContent(config);
    setIsModalOpen(true);
  }, [upstreams, vips]);

  const handleApplyConfig = async () => {
    setIsApplying(true);
    setNotification(null);
    try {
      const result = await applyNginxConfig(configContent);
      setNotification({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setTimeout(() => {
            setIsModalOpen(false);
        }, 1000); // Close modal shortly after success
      }
    } catch (error) {
      console.error("Apply config error:", error);
      setNotification({ type: 'error', message: 'An unexpected error occurred while communicating with the server.' });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8 border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('setup')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'setup'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <Cog8ToothIcon className="w-5 h-5" />
              Setup
            </button>
            <button
              onClick={() => setActiveTab('guides')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'guides'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <BookOpenIcon className="w-5 h-5" />
              Guides
            </button>
          </nav>
        </div>

        {activeTab === 'setup' && (
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
                        <p className="text-sm text-gray-400 capitalize">Method: {up.method.replace(/_/g, ' ')}</p>
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
              <h2 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center gap-2"><CodeBracketIcon /> Generate Configuration</h2>
              <div className="bg-gray-800 rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-400 mb-4">Once you have defined your upstreams and VIPs, generate the complete configuration file for review.</p>
                <button onClick={handleGenerateAndShowConfig} className="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-md transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <SparklesIcon className="w-6 h-6" />
                    Generate & Review Config
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guides' && (
          <GuidesTab />
        )}

      </main>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generated Nginx Configuration">
        <>
          <pre className="bg-black text-sm text-white p-4 rounded-md overflow-x-auto h-96 max-h-[60vh] font-mono whitespace-pre-wrap break-words">
            <code>
              {configContent}
            </code>
          </pre>
          <footer className="mt-6 flex justify-end gap-4">
            <button onClick={() => setIsModalOpen(false)} disabled={isApplying} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Close
            </button>
            <button onClick={handleApplyConfig} disabled={isApplying} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center w-40 disabled:opacity-50 disabled:cursor-not-allowed">
                {isApplying ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-2">Applying...</span>
                    </>
                ) : (
                    'Approve & Apply'
                )}
            </button>
          </footer>
        </>
      </Modal>
    </div>
  );
};

export default App;
