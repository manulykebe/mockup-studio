class ZontalClient {
    constructor(host, clientId, clientSecret) {
        this.host = host;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiryTime = null;
    }

    async getValidToken() {
        const currentTime = Date.now();
        if (this.accessToken && this.tokenExpiryTime && (currentTime < this.tokenExpiryTime - 10000)) {
            return this.accessToken;
        }
        await this.refreshAccessToken();
        return this.accessToken;
    }

    async refreshAccessToken() {
        const url = `https://${this.host}/auth/realms/zontal-space/protocol/openid-connect/token`;
        const bodyParams = new URLSearchParams();
        bodyParams.append('grant_type', 'client_credentials');
        bodyParams.append('client_id', this.clientId);
        bodyParams.append('client_secret', this.clientSecret);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams
        });
        if (!response.ok) throw new Error(`Auth failed with status: ${response.status}`);
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiryTime = Date.now() + (data.expires_in * 1000);
    }

    async authenticatedFetch(endpoint, options = {}) {
        const token = await this.getValidToken();

        // Use caller method if provided else default to POST
        options.method = options.method || 'POST';

        // Ensure headers object exists (don't overwrite user headers)
        options.headers = { ...(options.headers || {}) };

        // If body is present and is a plain object, stringify it (skip FormData)
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            try {
                options.body = JSON.stringify(options.body);
                // Only set JSON Content-Type if not set by caller
                if (!options.headers['Content-Type'] && !options.headers['content-type']) {
                    options.headers['Content-Type'] = 'application/json';
                }
            } catch (e) {
                console.warn('Failed to stringify body:', e);
            }
        }

        // Inject auth header (preserve any existing Authorization if present)
        options.headers['Authorization'] = options.headers['Authorization'] || `Bearer ${token}`;

        // Log what we're about to send for debugging
        const targetUrl = `https://${this.host}${endpoint}`;
        console.log('[authenticatedFetch] URL:', targetUrl);
        console.log('[authenticatedFetch] Method:', options.method);
        console.log('[authenticatedFetch] Headers:', options.headers);

        if (options.body instanceof FormData) {
            // Can't easily log FormData contents reliably, but show that it exists
            console.log('[authenticatedFetch] Body: FormData (not logged)');
        } else if (typeof options.body === 'string') {
            console.log('[authenticatedFetch] Body type: string, length:', options.body.length);
            // Optionally log the body itself for debugging (be careful with secrets)
            console.log('[authenticatedFetch] Body preview:', options.body.slice(0, 1000));
        } else if (options.body == null) {
            console.log('[authenticatedFetch] Body: null/undefined (no request body)');
        } else {
            console.log('[authenticatedFetch] Body type:', typeof options.body);
        }

        try {
            const response = await fetch(targetUrl, options);

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                // Try to parse JSON error then fallback to raw text
                let richMessage = `HTTP ${response.status}`;
                try {
                    const json = JSON.parse(text);
                    richMessage = json.message || json.title || JSON.stringify(json);
                } catch (e) {
                    if (text) richMessage = text;
                }
                throw new Error(richMessage);
            }

            const contentType = response.headers.get('content-type') || '';
            return contentType.includes('application/json') ? await response.json() : await response.text();
        } catch (err) {
            console.error(`Authenticated fetch failed for ${endpoint}:`, err);
            throw err;
        }
    }
}
const client = new ZontalClient('zontaldev.jnj.com/', 'revvity-signals-api', '3waw70uCqYaXtQlfpVL6Q9kv8B8BDJDk')



const payload = {
    "size": 25,
    "query": "",
    "filter": [
        {
            "propertyName": "instrumentId",
            "value": [
                "MALC74967"
            ],
            "filterType": "terms",
            "operator": null
        },
        {
            "propertyName": "informationPackageProfile",
            "value": [
                "Mastersizer_2000_VNF"
            ],
            "filterType": "terms",
            "operator": null
        }
    ],
    "sortField": [
        "createdOn"
    ],
    "sortOrder": [
        "desc"
    ]
};

client.authenticatedFetch('/api/search/informationPackages/', { body: payload })
    .then(res => console.log('result', res))
    .catch(err => console.error('fetch error', err));
