import 'dotenv/config';

interface Config {
    port: number;
    r2: {
        accountId: string;
        accessKeyId: string;
        secretAccessKey: string;
        bucketName: string;
        endpoint: string;
    };
}

function validateEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const config: Config = {
    port: parseInt(process.env.PORT || '5001', 10),
    r2: {
        accountId: validateEnvVar('R2_ACCOUNT_ID'),
        accessKeyId: validateEnvVar('R2_ACCESS_KEY_ID'),
        secretAccessKey: validateEnvVar('R2_SECRET_ACCESS_KEY'),
        bucketName: validateEnvVar('R2_BUCKET_NAME'),
        get endpoint() {
            return `https://${this.accountId}.r2.cloudflarestorage.com`;
        }
    }
};

export default config;
