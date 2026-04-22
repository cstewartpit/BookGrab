export const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const getOptionalEnvVariable = (key: string): string | undefined => {
  return process.env[key];
};

export const getServerEnvVariables = () => {
  return {
    MAM_TOKEN: getOptionalEnvVariable("MAM_TOKEN"), // Bootstrap fallback; primary store is the server-side session file.
    TRANSMISSION_URL: getEnvVariable("TRANSMISSION_URL"),
    AUDIOBOOK_DESTINATION_PATH: getEnvVariable("AUDIOBOOK_DESTINATION_PATH"),
    EBOOK_DESTINATION_PATH: getEnvVariable("EBOOK_DESTINATION_PATH"),
    DATA_DIR: getOptionalEnvVariable("DATA_DIR"),
    CALIBRE_WEB_URL: getOptionalEnvVariable("CALIBRE_WEB_URL"),
    CALIBRE_WEB_AUTH_EMAIL: getOptionalEnvVariable("CALIBRE_WEB_AUTH_EMAIL"),
    AUDIOBOOKSHELF_URL: getOptionalEnvVariable("AUDIOBOOKSHELF_URL"),
    AUDIOBOOKSHELF_TOKEN: getOptionalEnvVariable("AUDIOBOOKSHELF_TOKEN"),
  };
};
