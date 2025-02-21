

import Replicate from "replicate";
import Constants from 'expo-constants';

// Validate that all dummy parts exist
if ( !Constants.expoConfig?.extra?.REPLICATE_API_TOKEN_1 || !Constants.expoConfig?.extra?.REPLICATE_API_TOKEN_2 ) {
    throw new Error("Replicate AI credentials not found in expo config");
}

// Extract dummy parts and salt from Expo config
const extra = Constants.expoConfig.extra;

const replicateApiKeyParts = [
    extra.REPLICATE_API_TOKEN_1,
    extra.REPLICATE_API_TOKEN_2,
];

const reconstructKey = (parts: string[]) => {
    console.log(parts);
    return parts.join("");
};

const replicateApiKey = reconstructKey(replicateApiKeyParts);





const replicateClient = new Replicate({auth: replicateApiKey});

export const replicate = replicateClient;

