const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const basePath =
  configuredBasePath && configuredBasePath !== '/'
    ? configuredBasePath.startsWith('/')
      ? configuredBasePath.replace(/\/$/, '')
      : `/${configuredBasePath.replace(/\/$/, '')}`
    : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
