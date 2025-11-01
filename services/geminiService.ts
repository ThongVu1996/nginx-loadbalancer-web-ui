
import { GoogleGenAI } from "@google/genai";
import { Upstream, VIP } from '../types';

const generateNginxConfig = async (upstreams: Upstream[], vips: VIP[]): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
Act as a senior DevOps expert specializing in Nginx. Based on the following JSON data, generate a complete and secure Nginx configuration file content.

The configuration should be well-commented, follow modern security best practices, and be ready for a production environment.

**JSON Data:**
${JSON.stringify({ upstreams, vips }, null, 2)}

**Instructions & Best Practices to Apply:**
1.  **Upstreams:** For each item in the "upstreams" array, create a corresponding \`upstream\` block.
    - Use the specified load balancing \`method\`.
    - If \`healthCheck\` is true, add the \`health_check;_directive inside the upstream block. Add a comment noting that this requires the 'ngx_http_upstream_health_check_module'.
2.  **VIPs (Server Blocks):** For each item in the "vips" array, create a \`server\` block.
    - Set the \`listen\` port and \`server_name\`.
    - The \`location / \` block must include a \`proxy_pass\` directive pointing to the http:// protocol and the corresponding upstream name.
    - Include standard proxy headers like \`proxy_set_header Host $host;\`, \`proxy_set_header X-Real-IP $remote_addr;\`, \`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\`, and \`proxy_set_header X-Forwarded-Proto $scheme;\`.
3.  **SSL/TLS:** If a VIP has \`ssl\` set to true and the port is 443:
    - Configure the server to listen on port 443 with the \`ssl\` and \`http2\` directives.
    - Add directives for \`ssl_certificate\` and \`ssl_certificate_key\`. The paths should be conventional, like \`/etc/nginx/ssl/your_server_name.crt\` and \`/etc/nginx/ssl/your_server_name.key\`.
    - Implement modern SSL security practices:
        - Set \`ssl_protocols\` to TLSv1.2 and TLSv1.3.
        - Set \`ssl_ciphers\` to a strong, modern cipher suite.
        - Enable \`ssl_prefer_server_ciphers\`.
    - Add a separate server block for port 80 that permanently redirects all traffic to the HTTPS version (e.g., \`return 301 https://$host$request_uri;\`).
4.  **General:**
    - The final output should be ONLY the raw Nginx configuration file content, without any surrounding text, explanations, or markdown code fences.
    - Add a comment at the top of the file indicating it was auto-generated.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating Nginx config:", error);
    return "Error: Could not generate configuration. Please check the console for details.";
  }
};

export { generateNginxConfig };
