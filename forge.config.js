const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './build/icon/icon', // Your app icon (without extension, Electron will choose the right format)
    executableName: 'cloudflare-stream-manager',
    appBundleId: 'com.cloudflare.stream-manager',
    appCategoryType: 'public.app-category.video',
    protocols: [{
      name: 'Cloudflare Stream Manager',
      schemes: ['cloudflare-stream']
    }],
    // Windows specific configuration
    win32metadata: {
      CompanyName: 'Fais.tech',
      FileDescription: 'Cloudflare Stream Manager',
      OriginalFilename: 'cloudflare-stream-manager.exe',
      ProductName: 'Cloudflare Stream Manager',
      InternalName: 'cloudflare-stream-manager'
    },
    // Include your built React app
    ignore: [
      /node_modules/,
      /\.git/,
      /dist-app/,
      /out/,
      /\.vscode/,
      /\.bolt/,
      /src/,
      /electron\/.*\.ts$/,
      /vite\.config\.ts/,
      /tsconfig.*\.json/,
      /postcss\.config\.js/,
      /tailwind\.config\.js/,
      /eslint\.config\.js/
    ]
  },
  rebuildConfig: {},
  makers: [
    // Windows Squirrel Installer (x64)
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: (arch) => ({
        name: 'cloudflare-stream-manager',
        authors: 'Fais.tech',
        description: 'Desktop companion for Cloudflare Stream',
        exe: 'cloudflare-stream-manager.exe',
        iconUrl: 'https://github.com/qya/cloudflare-stream-manager/raw/main/build/icon/icon.ico',
        setupIcon: './build/icon/icon.ico',
        loadingGif: './build/icon/icon.ico',
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
        outputDirectory: `out/make/squirrel.windows/${arch}`,
        setupExe: `cloudflare-stream-manager-${arch}-setup.exe`,
        setupMsi: `cloudflare-stream-manager-${arch}-setup.msi`
      }),
    },
    // Windows MSI Installer (x64)
    {
      name: '@electron-forge/maker-wix',
      platforms: ['win32'],
      config: (arch) => ({
        name: 'Cloudflare Stream Manager',
        description: 'Desktop companion for managing Cloudflare Stream video content',
        manufacturer: 'Fais.tech',
        version: '0.1.5',
        arch: arch,
        programFilesFolderName: 'Cloudflare Stream Manager',
        outputDirectory: `out/make/wix/${arch}`,
        ui: {
          chooseDirectory: true
        }
      })
    },
    // Windows Portable ZIP (both architectures)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: (arch) => ({
        name: `cloudflare-stream-manager-win32-${arch}-portable`
      })
    },
    // macOS
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // Linux DEB
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'Fais.tech',
          homepage: 'https://github.com/qya/cloudflare-stream-manager',
          description: 'Desktop companion for managing Cloudflare Stream video content',
          productDescription: 'A beautiful desktop application for managing your Cloudflare Stream videos with ease.',
          section: 'video',
          priority: 'optional',
          categories: ['AudioVideo', 'Video']
        }
      },
    },
    // Linux RPM
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          license: 'MIT',
          homepage: 'https://github.com/qya/cloudflare-stream-manager',
          description: 'Desktop companion for managing Cloudflare Stream video content'
        }
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // Hook to build React app before packaging
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      console.log('Building React app for packaging...');
      const { execSync } = require('child_process');
      execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
    }
  }
};
