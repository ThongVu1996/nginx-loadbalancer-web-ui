
export interface Server {
  id: string;
  address: string;
  port: number;
}

export interface Upstream {
  id: string;
  name: string;
  servers: Server[];
  method: 'round_robin' | 'least_conn' | 'ip_hash';
  healthCheck: boolean;
}

export interface VIP {
  id: string;
  listenPort: number;
  serverName: string;
  upstreamName: string;
  ssl: boolean;
  sslCert?: string;
  sslKey?: string;
}
