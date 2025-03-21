import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import { dirname, resolve } from 'node:path'
import { type AliasOptions, type UserConfig, type UserConfigFnObject, defineConfig, mergeConfig } from 'vite'
import tanStackRouterViteCfg from './tsr.config.json' with { type: 'json' }

const root = dirname(__filename)

const alias = {
  '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
  '#monaco/bootstrap': resolve('src/monaco/bootstrap.ts'),
  '#monaco/config': resolve('src/monaco/config.ts'),
  '@likec4/diagram': resolve('../../packages/diagram/src'),
  '@likec4/log': resolve('../../packages/log/src/browser.ts'),
} satisfies AliasOptions

const baseConfig: UserConfigFnObject = () => {
  return {
    root,
    resolve: {
      conditions: ['sources'],
      alias,
    },
    build: {
      cssCodeSplit: false,
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        '@likec4/icons/all',
      ],
      esbuildOptions: {
        plugins: [
          importMetaUrlPlugin as any,
        ],
      },
    },
    plugins: [],
  }
}

export default defineConfig((env) => {
  switch (true) {
    case env.mode === 'development':
      return mergeConfig(baseConfig(env), {
        plugins: [
          vanillaExtractPlugin({}),
          TanStackRouterVite(tanStackRouterViteCfg),
          react({}),
        ],
      })
    // Pre-build for production
    // Workaround for incompatibility between vanilla-extract and monaco-editor
    case env.command === 'build' && env.mode === 'pre':
      return mergeConfig<UserConfig, UserConfig>(baseConfig(env), {
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        mode: 'production',
        logLevel: 'warn',
        build: {
          cssCodeSplit: false,
          cssMinify: false,
          minify: false,
          target: 'esnext',
          outDir: resolve('prebuild'),
          emptyOutDir: true,
          commonjsOptions: {
            transformMixedEsModules: true,
            esmExternals: true,
          },
          rollupOptions: {
            output: {
              hoistTransitiveImports: false,
              preserveModules: true,
              preserveModulesRoot: resolve('src'),
              entryFileNames: '[name].mjs',
            },
            treeshake: {
              preset: 'recommended',
            },
            makeAbsoluteExternalsRelative: 'ifRelativeSource',
            external: [
              'react',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-dom',
              'react-dom/client',
              '@typefox/monaco-editor-react',
              'monaco-editor',
              'monaco-editor-wrapper',
              'monaco-languageclient',
              'framer-motion',
              'esm-env',
              'tslib',
              '#monaco/bootstrap',
              '#monaco/config',
              /@likec4\/(core|icons|log|layouts|language-server).*/,
              /d3-/,
              /hpcc-js/,
              /node_modules.*vscode/,
              /node_modules.*monaco/,
            ],
          },
          lib: {
            entry: {
              main: 'src/main.tsx',
            },
            formats: ['es'],
          },
        },
        plugins: [
          vanillaExtractPlugin({
            identifiers: 'short',
          }),
          react({
            // jsxRuntime: 'classic'
          }),
        ],
      })
    case env.command === 'build':
      return mergeConfig<UserConfig, UserConfig>(baseConfig(env), {
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        mode: 'production',
        resolve: {
          conditions: ['browser', 'production'],
          alias: {
            '/src/style.css': resolve('prebuild/style.css'),
            '/src/main': resolve('prebuild/main.mjs'),
          },
        },
        build: {
          copyPublicDir: true,
          modulePreload: false,
          rollupOptions: {
            treeshake: {
              preset: 'recommended',
            },
            output: {
              compact: true,
              manualChunks: (id) => {
                if (id.includes('hpcc-js')) {
                  return 'graphviz'
                }
                if (
                  id.includes('node_modules') && (
                    id.includes('/vscode/')
                    || id.includes('/vscode-')
                    || id.includes('/monaco')
                  )
                ) {
                  return 'monaco'
                }
              },
            },
          },
        },
        plugins: [
          react({
            // jsxRuntime: 'classic'
          }),
        ],
      })
    default:
      throw new Error(`Unsupported mode: ${env.mode}`)
  }
})
