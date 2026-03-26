import * as common from 'oci-common';
import * as secrets from 'oci-secrets';

export async function loadOciSecrets(): Promise<void> {
  const isOciUsed = process.env.USE_OCI_VAULT === 'true';

  if (!isOciUsed) {
    console.log('ℹ️  OCI Vault is disabled (USE_OCI_VAULT != true).');
    return;
  }

  const secretOcid = process.env.OCI_SECRET_OCID;
  if (!secretOcid) {
    console.warn(
      '⚠️  USE_OCI_VAULT is true, but OCI_SECRET_OCID is missing. Skipping OCI Vault loading.',
    );
    return;
  }

  try {
    console.log('🔄  Connecting to OCI Vault to fetch secrets...');
    let provider: common.AuthenticationDetailsProvider;
    try {
      // First attempt: local config file (~/.oci/config)
      provider = new common.ConfigFileAuthenticationDetailsProvider();
    } catch {
      // Fallback: use Instance Principals if running in OCI
      console.log(
        'ℹ️  No local OCI config found. Falling back to Instance Principals...',
      );
      provider =
        await new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
    }

    const client = new secrets.SecretsClient({
      authenticationDetailsProvider: provider,
    });

    console.log(`🔄  Fetching secret bundle from OCID: ${secretOcid}...`);
    const response = await client.getSecretBundle({
      secretId: secretOcid,
    });

    const bundleContent = response.secretBundle
      .secretBundleContent as unknown as {
      contentType?: string;
      content?: string;
    };

    if (!bundleContent || !bundleContent.content) {
      console.error('❌  OCI Secret bundle is empty or invalid.');
      return;
    }

    const contentType = bundleContent.contentType || 'BASE64';
    console.log(`🔄  Processing secret bundle. Content Type: ${contentType}`);

    let decodedStr: string;
    if (contentType === 'BASE64') {
      decodedStr = Buffer.from(bundleContent.content, 'base64').toString('utf-8');
    } else if (contentType === 'PLAIN') {
      decodedStr = bundleContent.content;
    } else {
      console.warn(`⚠️  Unsupported OCI Secret content type: ${contentType}. Trying to treat as RAW.`);
      decodedStr = bundleContent.content;
    }

    // Trim content to avoid parsing errors
    decodedStr = decodedStr.trim();

    let parsedSecrets: Record<string, string>;
    try {
      parsedSecrets = JSON.parse(decodedStr) as Record<string, string>;
    } catch (err) {
      console.error('❌  Failed to parse OCI Secret content as JSON. Content preview (first 50 chars):', decodedStr.substring(0, 50));
      throw err;
    }

    // Inject the parsed secrets into process.env
    const keysLoaded: string[] = [];
    for (const [key, value] of Object.entries(parsedSecrets)) {
      process.env[key] = String(value);
      keysLoaded.push(key);
    }

    console.log(`✅  Successfully loaded ${keysLoaded.length} secrets from OCI Vault.`);
    console.log(`Keys: [${keysLoaded.join(', ')}]`);
  } catch (error) {
    console.error('❌  Error fetching secrets from OCI Vault:', error);
    // Crash the app if vault loading fails but is explicitly ENABLED
    throw error;
  }
}
