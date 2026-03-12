import * as common from 'oci-common';
import * as secrets from 'oci-secrets';

export async function loadOciSecrets(): Promise<void> {
  // If USE_OCI_VAULT is not explicitly enabled, skip loading from OCI Vault
  if (process.env.USE_OCI_VAULT !== 'true') {
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
    console.log('🔄  Loading secrets from OCI Vault...');
    let provider: common.AuthenticationDetailsProvider;
    try {
      // First attempt: local config file (~/.oci/config)
      provider = new common.ConfigFileAuthenticationDetailsProvider();
    } catch (e) {
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

    const response = await client.getSecretBundle({
      secretId: secretOcid,
    });

    const bundleContent = response.secretBundle.secretBundleContent as any;

    if (bundleContent && bundleContent.contentType === 'BASE64') {
      const base64Str = bundleContent.content;
      const decodedStr = Buffer.from(base64Str, 'base64').toString('utf-8');

      let parsedSecrets: Record<string, string>;
      try {
        parsedSecrets = JSON.parse(decodedStr);
      } catch (err) {
        console.error('❌  Failed to parse OCI Secret content as JSON.');
        throw err;
      }

      // Inject the parsed secrets into process.env
      for (const [key, value] of Object.entries(parsedSecrets)) {
        // We only overwrite if not already defined locally, or we deliberately overwrite it.
        // Usually, the Vault should be the source of truth if USE_OCI_VAULT is true.
        process.env[key] = value;
      }

      console.log('✅  Successfully loaded and mapped secrets from OCI Vault.');
    } else {
      console.warn(
        '⚠️  OCI Secret content type is not BASE64. Cannot parse the secret.',
      );
    }
  } catch (error) {
    console.error('❌  Error fetching secrets from OCI Vault:', error);
    // Depending on requirements, we could throw here to crash the app if secrets are mandatory.
    // For now, we throw, to avoid starting with invalid configurations.
    throw error;
  }
}
